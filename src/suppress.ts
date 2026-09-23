/**
 * 屏蔽重复工具调用提醒的注入.
 *
 * `@deepseek-ai/dsh-repeat-tool-reminder` 在 `tools/post-execute` 里把提醒挂成
 * additionalContexts, 这些消息随后由 agent loop 在 `agent/pre-step` 交给监听器.
 * 本模块在那一环把它们滤掉: 会话日志里仍有记录, 只是不再进入模型请求. 该行为由
 * 设置项控制, 默认关闭.
 * @module dsh-limit-timeout/suppress
 */

import type { Agent, PreStepDecision } from '@deepseek-ai/dsh-agent'
import type { UserMessage } from '@deepseek-ai/dsh-session'
import type { LimitTimeoutSettings } from './shared.ts'

/** 重复调用提醒注入消息使用的事件 source kind. */
export const REPEAT_REMINDER_SOURCE_KIND = 'repeat-tool-reminder'

/**
 * 判断一条消息是否来自重复调用提醒.
 * @param message - pre-step 拿到的消息.
 * @returns 是提醒消息时为 true.
 */
export function isRepeatReminder(message: UserMessage): boolean {
  return String(message.source.kind) === REPEAT_REMINDER_SOURCE_KIND
}

/** 监听器依赖. */
export interface SuppressDeps {
  /** 读取当前生效配置. */
  settings: () => LimitTimeoutSettings
  /** 诊断日志: 过滤发生时记录条数. */
  log: (message: string) => void
}

/** pre-step 的 payload (只声明本模块用到的字段). */
export interface PreStepPayload {
  /** 本次 step 所属的 agent. */
  agent: Agent
  /** 本批次交给模型的消息. */
  messages: UserMessage[]
}

/**
 * 创建 `agent/pre-step` 监听器: 始终先委托下游, 只在开关打开时删掉提醒消息.
 * @param deps - 监听器依赖.
 * @returns waterfall 监听器.
 */
export function createSuppressReminderListener(
  deps: SuppressDeps,
): (payload: PreStepPayload, next: () => Promise<PreStepDecision>) => Promise<PreStepDecision> {
  return async (payload, next) => {
    const decision = await next()
    if (decision.kind === 'reject') return decision
    if (!deps.settings().suppressRepeatToolReminders) return decision
    const kept = decision.messages.filter(message => !isRepeatReminder(message))
    if (kept.length === decision.messages.length) return decision
    deps.log(
      `suppressed ${String(decision.messages.length - kept.length)} repeat-tool reminder message(s) `
      + `for agent ${payload.agent.id}`,
    )
    return { ...decision, messages: kept }
  }
}
