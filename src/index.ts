/**
 * dsh-limit-timeout Host 半区.
 *
 * 限制一次工具调用可以让调用方等待多久: 全局默认上限来自设置界面, 模型可以
 * 通过 `request_wait_extension` 在会话中向用户申请提升 (仅本进程内生效). 超限
 * 的调用在 `tools/pre-execute` 被拒绝, 理由里给出替代做法.
 * @module dsh-limit-timeout
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type {} from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-user-approval'
import { createRequestWaitExtensionTool } from './extension-tool.ts'
import { createWaitGuardListener } from './intercept.ts'
import { describeWaitBudget } from './limits.ts'
import { SessionWaitLimits } from './session-limits.ts'
import { LimitTimeoutSettingsSchema, validateLimitTimeoutSettings } from './settings.ts'
import { DEFAULT_SETTINGS, PLUGIN_ID, type LimitTimeoutSettings } from './shared.ts'

export const name = PLUGIN_ID

export const inject = ['tools']

/**
 * 等待预算说明在系统提示里的位置: 紧跟 approval 策略 (115) 之后, 早于子代理
 * 委派说明 (120). 该位置由 harness 集中分配, 这里取相邻的空档.
 */
const WAIT_BUDGET_CONTEXT_ORDER = 117

/**
 * 装载设置绑定, 拦截器, 申请工具与提示说明.
 * @param ctx - Host 插件上下文.
 */
export function apply(ctx: Context): void {
  const sessionLimits = new SessionWaitLimits()
  // 未挂载 settings 服务时用默认值工作, 插件不会因为缺少设置provider而消失.
  let settings: LimitTimeoutSettings = { ...DEFAULT_SETTINGS }

  ctx.inject(['settings'], (settingsCtx) => {
    const owner = settingsCtx.settings.register(PLUGIN_ID, LimitTimeoutSettingsSchema, {
      validate: validateLimitTimeoutSettings,
    })
    const sync = (): void => { settings = owner.get() }
    sync()
    owner.watch(sync)
    ctx.logger.info(
      '%s: settings bound (defaultLimitMs=%d ms, hardLimitMs=%d ms, allowEscalation=%s, requireExplicitJobWaitMs=%s)',
      PLUGIN_ID,
      settings.defaultLimitMs,
      settings.hardLimitMs,
      String(settings.allowEscalation),
      String(settings.requireExplicitJobWaitMs),
    )
  })

  ctx.inject(['systemPrompt'], (promptCtx) => {
    promptCtx.systemPrompt.context({
      name: 'limit-timeout:budget',
      order: WAIT_BUDGET_CONTEXT_ORDER,
      text: (context) => {
        // AssembleContext 的公开声明尚未包含 agent, 运行时与官方 policy 插件
        // 一致地携带当前会话; 没有会话时 (裸 assemble) 不声明任何事实.
        const session = (context as { agent?: Agent }).agent?.session
        const raised = sessionLimits.grantOf(session) !== undefined
        const sessionLimitMs = sessionLimits.limitOf(session, settings.defaultLimitMs, settings.hardLimitMs)
        return describeWaitBudget({ settings, sessionLimitMs, raised })
      },
    })
  })

  const log = (message: string): void => { ctx.logger.info('%s: %s', PLUGIN_ID, message) }

  ctx.tools.register(createRequestWaitExtensionTool(ctx, {
    settings: () => settings,
    sessionLimits,
    log,
  }))

  ctx.on('tools/pre-execute', createWaitGuardListener({
    settings: () => settings,
    sessionLimits,
    log,
  }))

  ctx.logger.info('%s: host loaded', PLUGIN_ID)
}
