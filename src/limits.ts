/**
 * 等待上限的纯逻辑: 从工具参数里取出等待请求, 判定是否超限, 以及生成模型可见
 * 的说明文本. 这里不依赖 cordis, 便于单测.
 * @module dsh-limit-timeout/limits
 */

import type { LimitTimeoutSettings } from './shared.ts'

/**
 * 模型可控的等待参数名: 单次调用里声明"我愿意等多久"的字段. `timeoutMs` 属于
 * bash / pwsh 类工具, `timeout_ms` 属于 job_output 类工具.
 */
export const WAIT_ARG_FIELDS = ['timeoutMs', 'timeout_ms'] as const

/** 声明后台执行的参数: 置为 true 后调用方不再等待, 超时参数随之失效. */
const BACKGROUND_ARG = 'run_in_background'

/** 后台执行是"不等待"的替代方案的工具集合. */
const BACKGROUND_CAPABLE_TOOLS = new Set(['bash', 'pwsh'])

/** job_output 的等待开关参数名. */
const JOB_WAIT_ARG = 'wait'

/** 从工具参数里取出的一次等待请求. */
export interface WaitRequest {
  /** 命中的参数字段名. */
  field: string
  /** 模型请求的等待毫秒数. */
  value: number
}

/** 把未知参数值收窄为普通对象. */
function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

/**
 * 读取一次调用里的等待请求.
 * @param args - 工具调用的解析后参数.
 * @returns 命中的等待字段与值, 没有则 undefined.
 */
export function readWaitRequest(args: unknown): WaitRequest | undefined {
  const record = asRecord(args)
  if (record === undefined) return undefined
  for (const field of WAIT_ARG_FIELDS) {
    const value = record[field]
    if (typeof value === 'number' && Number.isFinite(value)) return { field, value }
  }
  return undefined
}

/** 判定一次调用是否占用调用方等待: 后台执行不占用. */
export function occupiesCaller(toolName: string, args: unknown): boolean {
  const record = asRecord(args)
  if (record === undefined) return true
  if (!BACKGROUND_CAPABLE_TOOLS.has(toolName)) return true
  return record[BACKGROUND_ARG] !== true
}

/** 拦截判定的输入. */
export interface WaitGuardInput {
  /** 工具名. */
  toolName: string
  /** 工具调用的解析后参数. */
  args: unknown
  /** 本会话当前生效的等待上限 (全局默认或已批准的提升值, 已与硬天花板取小). */
  limitMs: number
  /** 硬天花板, 用于说明可申请的最大值. */
  hardLimitMs: number
  /** 部署是否允许会话内申请提升. */
  allowEscalation: boolean
  /** 是否要求 job_output 的 wait 显式给出 timeout_ms. */
  requireExplicitJobWaitMs: boolean
}

/** 拦截判定结果. */
export type WaitGuardDecision =
  | { kind: 'allow' }
  | { kind: 'deny', reason: string }

/** 允许调用的单例判定. */
const ALLOW: WaitGuardDecision = { kind: 'allow' }

/** 把毫秒数写成便于阅读的形态. */
export function formatDuration(ms: number): string {
  if (ms % 60_000 === 0) return `${String(ms / 60_000)} min`
  if (ms % 1_000 === 0) return `${String(ms / 1_000)} s`
  return `${String(ms)} ms`
}

/** 生成超限拒绝理由 (模型可见, 用英文与工具描述保持一致). */
function denyReason(input: WaitGuardInput, request: WaitRequest): string {
  const alternatives: string[] = []
  if (BACKGROUND_CAPABLE_TOOLS.has(input.toolName)) {
    alternatives.push('run the command with `run_in_background: true` and collect it with `job_output`')
  }
  alternatives.push(`retry with \`${request.field}\` at or below ${String(input.limitMs)} ms`)
  if (input.allowEscalation) {
    alternatives.push(
      'call `request_wait_extension` to ask the user to raise this session\'s wait limit'
      + ` (hard ceiling ${String(input.hardLimitMs)} ms)`,
    )
  }
  return `\`${request.field}\` ${String(request.value)} ms exceeds this session's wait limit of `
    + `${String(input.limitMs)} ms (${formatDuration(input.limitMs)}). `
    + `Either ${alternatives.join(', or ')}.`
}

/** 生成隐式等待被拒绝的理由. */
function implicitWaitReason(input: WaitGuardInput): string {
  return '`job_output` with `wait: true` must declare an explicit `timeout_ms` in this deployment: '
    + `the deployment caps every wait through that field (session limit ${String(input.limitMs)} ms). `
    + 'Read the job without waiting, or pass `wait: true` together with `timeout_ms` at or below the limit.'
}

/**
 * 判定一次工具调用是否超出等待上限.
 * @param input - 工具名, 参数与当前生效的上限.
 * @returns 允许或带理由的拒绝.
 */
export function evaluateWaitGuard(input: WaitGuardInput): WaitGuardDecision {
  const record = asRecord(input.args)
  if (record === undefined) return ALLOW

  const request = readWaitRequest(record)
  if (request === undefined) {
    if (input.toolName === 'job_output' && record[JOB_WAIT_ARG] === true && input.requireExplicitJobWaitMs) {
      return { kind: 'deny', reason: implicitWaitReason(input) }
    }
    return ALLOW
  }
  if (!occupiesCaller(input.toolName, record)) return ALLOW
  if (request.value <= input.limitMs) return ALLOW
  return { kind: 'deny', reason: denyReason(input, request) }
}

/** 生成给模型看的当前等待预算说明文本. */
export function describeWaitBudget(input: {
  settings: LimitTimeoutSettings
  /** 本会话当前生效上限 (已与硬天花板取小). */
  sessionLimitMs: number
  /** 本会话是否已经被用户批准提升过. */
  raised: boolean
}): string {
  const { settings, sessionLimitMs, raised } = input
  const parts = [
    `Wait budget: a single tool call in this session may wait at most ${String(sessionLimitMs)} ms`
    + ` (${formatDuration(sessionLimitMs)}) through \`timeoutMs\` (bash, pwsh) or \`timeout_ms\` (job_output).`,
  ]
  if (raised) {
    parts.push(`The user raised this session's limit from the default ${String(settings.defaultLimitMs)} ms to ${String(sessionLimitMs)} ms.`)
  }
  parts.push(
    'A larger value is rejected before the call runs.',
    'Work that outlives the limit belongs in the background: start it with `run_in_background: true` and collect it with `job_output`.',
  )
  if (settings.allowEscalation) {
    parts.push(
      'When a longer wait is genuinely required, call `request_wait_extension` to ask the user for a larger session limit'
      + ` (hard ceiling ${String(settings.hardLimitMs)} ms).`,
    )
  } else {
    parts.push('This deployment does not allow raising the limit inside a session.')
  }
  return parts.join(' ')
}
