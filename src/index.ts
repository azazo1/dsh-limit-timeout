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
import { Config as LimitTimeoutConfig, type LimitTimeoutConfig as LimitTimeoutConfigType, validateLimitTimeoutSettings } from './settings.ts'
import { PLUGIN_ID, type LimitTimeoutSettings } from './shared.ts'

export { Config } from './settings.ts'
import { createSuppressReminderListener } from './suppress.ts'

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
export function apply(ctx: Context, config: LimitTimeoutConfigType): void {
  const sessionLimits = new SessionWaitLimits()
  const readSettings = (): LimitTimeoutSettings => ({
    defaultLimitMs: config.defaultLimitMs.get(),
    hardLimitMs: config.hardLimitMs.get(),
    allowEscalation: config.allowEscalation.get(),
    requireExplicitJobWaitMs: config.requireExplicitJobWaitMs.get(),
    suppressRepeatToolReminders: config.suppressRepeatToolReminders.get(),
  })
  validateLimitTimeoutSettings(readSettings())
  const initial = readSettings()
  ctx.logger.info(
    '%s: settings bound (defaultLimitMs=%d ms, hardLimitMs=%d ms, allowEscalation=%s, requireExplicitJobWaitMs=%s)',
    PLUGIN_ID,
    initial.defaultLimitMs,
    initial.hardLimitMs,
    String(initial.allowEscalation),
    String(initial.requireExplicitJobWaitMs),
  )

  ctx.inject(['systemPrompt'], (promptCtx) => {
    promptCtx.systemPrompt.context({
      name: 'limit-timeout:budget',
      order: WAIT_BUDGET_CONTEXT_ORDER,
      text: (context) => {
        // AssembleContext 的公开声明尚未包含 agent, 运行时与官方 policy 插件
        // 一致地携带当前会话; 没有会话时 (裸 assemble) 不声明任何事实.
        const session = (context as { agent?: Agent }).agent?.session
        const current = readSettings()
        const raised = sessionLimits.grantOf(session) !== undefined
        const sessionLimitMs = sessionLimits.limitOf(session, current.defaultLimitMs, current.hardLimitMs)
        return describeWaitBudget({ settings: current, sessionLimitMs, raised })
      },
    })
  })

  const log = (message: string): void => { ctx.logger.info('%s: %s', PLUGIN_ID, message) }

  ctx.tools.register(createRequestWaitExtensionTool(ctx, {
    settings: readSettings,
    sessionLimits,
    log,
  }))

  ctx.on('tools/pre-execute', createWaitGuardListener({
    settings: readSettings,
    sessionLimits,
    log,
  }))

  // 重复工具调用提醒由别的插件在 post-execute 附加, 这里在进入模型请求前按
  // 设置过滤掉, 只影响模型看到的内容, 不改写会话日志.
  ctx.on('agent/pre-step', createSuppressReminderListener({
    settings: readSettings,
    log: message => { ctx.logger.debug('%s: %s', PLUGIN_ID, message) },
  }))

  ctx.logger.info('%s: host loaded', PLUGIN_ID)
}
