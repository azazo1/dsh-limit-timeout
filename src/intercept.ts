/**
 * `tools/pre-execute` 拦截: 在调用真正执行前检查它声明的等待时间是否超过本
 * 会话上限. 参数不可改写 (工具参数在进入策略管线前已经记录并呈现), 所以超限
 * 只能拒绝, 并在理由里给出替代做法.
 * @module dsh-limit-timeout/intercept
 */

import type { PreToolDecision, ToolExecution } from '@deepseek-ai/dsh-tools'
import { evaluateWaitGuard } from './limits.ts'
import type { SessionWaitLimits } from './session-limits.ts'
import type { LimitTimeoutSettings } from './shared.ts'

/** 拦截器依赖: 生效配置, 会话提升记录与审计日志. */
export interface WaitGuardDeps {
  /** 读取当前生效配置. */
  settings: () => LimitTimeoutSettings
  /** 会话级提升记录. */
  sessionLimits: SessionWaitLimits
  /** 审计日志: 记录每一次因超限被拒绝的调用. */
  log: (message: string) => void
}

/** 取调用所属的会话对象, 用作提升记录的键. */
function sessionOf(exec: ToolExecution): object | undefined {
  return exec.agent?.session
}

/**
 * 判定一次调用是否放行.
 * @param exec - 进入策略管线的调用.
 * @param deps - 拦截器依赖.
 * @returns 允许或带理由的拒绝.
 */
export function decideWaitGuard(exec: ToolExecution, deps: WaitGuardDeps): PreToolDecision {
  const settings = deps.settings()
  const session = sessionOf(exec)
  const limitMs = deps.sessionLimits.limitOf(session, settings.defaultLimitMs, settings.hardLimitMs)
  const decision = evaluateWaitGuard({
    toolName: exec.name,
    args: exec.arguments,
    limitMs,
    hardLimitMs: settings.hardLimitMs,
    allowEscalation: settings.allowEscalation,
    requireExplicitJobWaitMs: settings.requireExplicitJobWaitMs,
  })
  if (decision.kind === 'deny') {
    const raised = deps.sessionLimits.grantOf(session) !== undefined
    deps.log(
      `denied ${exec.name} (call ${exec.callId}): ${decision.reason} `
      + `[limit=${String(limitMs)}ms, raised=${String(raised)}]`,
    )
  }
  return decision
}

/**
 * 创建 `tools/pre-execute` 监听器. 放行时继续 `next()`, 让下游策略 (权限,
 * 沙箱) 仍有机会拒绝; 超限时短路并直接拒绝.
 * @param deps - 拦截器依赖.
 * @returns waterfall 监听器.
 */
export function createWaitGuardListener(
  deps: WaitGuardDeps,
): (exec: ToolExecution, next: () => Promise<PreToolDecision>) => Promise<PreToolDecision> {
  return async (exec, next) => {
    const decision = decideWaitGuard(exec, deps)
    if (decision.kind === 'deny') return decision
    return next()
  }
}
