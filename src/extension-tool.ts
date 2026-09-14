/**
 * `request_wait_extension` 工具: 模型在会话中向用户申请把等待上限抬高. 申请走
 * 原生审批通道 (approval service), 批准后只在本进程内对该会话生效.
 * @module dsh-limit-timeout/extension-tool
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool, type ToolDefinition, type ToolRunContext } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-user-approval'
import { formatDuration } from './limits.ts'
import type { SessionWaitLimits } from './session-limits.ts'
import type { LimitTimeoutSettings } from './shared.ts'

/** 工具名 (与 dsh-plugin.naming.json 的 tools 声明一致). */
export const REQUEST_WAIT_EXTENSION_TOOL = 'request_wait_extension'

/** 工具依赖. */
export interface ExtensionToolDeps {
  /** 读取当前生效配置. */
  settings: () => LimitTimeoutSettings
  /** 会话级提升记录. */
  sessionLimits: SessionWaitLimits
  /** 审计日志. */
  log: (message: string) => void
}

/** 工具参数. */
interface RequestWaitExtensionArgs {
  durationMs: number
  reason: string
}

/** 一次申请的结果, 作为工具的成功返回值. */
export interface RequestWaitExtensionValue {
  /** 结果分类: granted 或 already-within-limit. */
  status: string
  /** 结果生效后本会话的等待上限. */
  sessionLimitMs: number
  /** 模型可见文本. */
  text: string
}

/**
 * 校验参数并执行一次申请.
 * @param ctx - Host 插件上下文 (读取 approval 服务).
 * @param deps - 工具依赖.
 * @param args - 已通过参数 schema 校验的参数.
 * @param exec - 本次工具调用上下文.
 * @returns 申请结果.
 * @throws {Error} 参数非法, 超过硬天花板, 部署禁止申请, 无审批通道, 或被用户拒绝.
 */
async function requestExtension(
  ctx: Context,
  deps: ExtensionToolDeps,
  args: RequestWaitExtensionArgs,
  exec: ToolRunContext,
): Promise<RequestWaitExtensionValue> {
  const settings = deps.settings()
  const durationMs = args.durationMs
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error(`invalid durationMs: expected a positive number of milliseconds, got ${JSON.stringify(durationMs)}`)
  }
  const reason = args.reason.trim()
  if (reason.length === 0) {
    throw new Error('invalid reason: expected a non-empty sentence for the user')
  }
  const agent = exec.agent
  if (agent === undefined) {
    throw new Error('request_wait_extension needs an agent session to route the request to the user')
  }
  const session = agent.session
  const currentLimitMs = deps.sessionLimits.limitOf(session, settings.defaultLimitMs, settings.hardLimitMs)

  if (!settings.allowEscalation) {
    throw new Error(
      `raising the wait limit inside a session is disabled by this deployment (limit stays ${String(currentLimitMs)} ms)`,
    )
  }
  if (durationMs > settings.hardLimitMs) {
    throw new Error(
      `requested ${String(durationMs)} ms exceeds the deployment hard ceiling of ${String(settings.hardLimitMs)} ms `
      + `(${formatDuration(settings.hardLimitMs)}); request at most that value`,
    )
  }
  if (durationMs <= currentLimitMs) {
    return {
      status: 'already-within-limit',
      sessionLimitMs: currentLimitMs,
      text: `No approval needed: this session's wait limit is already ${String(currentLimitMs)} ms `
        + `(${formatDuration(currentLimitMs)}). Pass \`timeoutMs\` or \`timeout_ms\` at or below it.`,
    }
  }

  const approval = ctx.get('approval')
  if (approval === undefined) {
    throw new Error('no approval channel is available, so the wait limit cannot be raised')
  }
  deps.log(`asking the user to raise the wait limit of session ${session.id} to ${String(durationMs)} ms`)
  const outcome = await approval.request({
    agent,
    toolName: REQUEST_WAIT_EXTENSION_TOOL,
    callId: exec.callId,
    reason: `Raise this session's tool-call wait limit to ${String(durationMs)} ms `
      + `(${formatDuration(durationMs)}): ${reason}`,
    signal: exec.signal,
  })

  switch (outcome) {
    case 'allowed-once': {
      deps.sessionLimits.grant(session, durationMs, reason)
      deps.log(`wait limit of session ${session.id} raised to ${String(durationMs)} ms`)
      return {
        status: 'granted',
        sessionLimitMs: durationMs,
        text: `The user approved: this session's wait limit is now ${String(durationMs)} ms `
          + `(${formatDuration(durationMs)}) and applies to later calls until the process restarts. `
          + 'Retry the call whose wait was rejected, with `timeoutMs` / `timeout_ms` at or below the new limit.',
      }
    }
    case 'rejected':
      throw new Error(`the user rejected raising this session's wait limit to ${String(durationMs)} ms`)
    case 'cancelled':
      throw new Error('the wait-limit request was cancelled before the user answered')
    case 'unavailable':
      throw new Error('the wait-limit request could not be delivered: no approval answerer is available')
    default:
      throw new Error(`unexpected approval outcome: ${String(outcome)}`)
  }
}

/**
 * 创建申请工具定义.
 * @param ctx - Host 插件上下文.
 * @param deps - 工具依赖.
 * @returns 可注册到 `ctx.tools` 的工具定义.
 */
export function createRequestWaitExtensionTool(
  ctx: Context,
  deps: ExtensionToolDeps,
): ToolDefinition {
  return defineTool({
    name: REQUEST_WAIT_EXTENSION_TOOL,
    description: 'Ask the user to raise this session\'s tool-call wait limit (`timeoutMs` for bash/pwsh, '
      + '`timeout_ms` for job_output). Use it after a call was rejected for exceeding the limit and the wait '
      + 'is genuinely needed: the user decides, and an approval covers the rest of this session. '
      + 'Returns the limit now in effect.',
    parameters: {
      durationMs: {
        type: 'number',
        required: true,
        description: 'Requested wait limit for this session in milliseconds. Must exceed the current limit and '
          + 'stay at or below the deployment hard ceiling stated in the runtime context.',
      },
      reason: {
        type: 'string',
        required: true,
        description: 'One sentence shown to the user explaining why the longer wait is needed, for example which '
          + 'command or job must finish.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          status: { type: 'string', required: true },
          sessionLimitMs: { type: 'number', required: true },
          text: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: value.text }],
    },
    async execute(args: RequestWaitExtensionArgs, exec: ToolRunContext): Promise<RequestWaitExtensionValue> {
      return await requestExtension(ctx, deps, args, exec)
    },
  })
}
