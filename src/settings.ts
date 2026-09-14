/**
 * Host 侧 settings namespace 定义. 设置页保存的值经此 schema 校验与持久化,
 * 插件运行时通过注册返回的 scope 读取并监听变化.
 * @module dsh-limit-timeout/settings
 */

import z from '@deepseek-ai/schemastery'
import {
  ALLOW_ESCALATION_FIELD,
  DEFAULT_HARD_LIMIT_MS,
  DEFAULT_LIMIT_FIELD,
  DEFAULT_LIMIT_MS,
  HARD_LIMIT_FIELD,
  MAX_LIMIT_MS,
  MIN_LIMIT_MS,
  REQUIRE_EXPLICIT_JOB_WAIT_FIELD,
  type LimitTimeoutSettings,
} from './shared.ts'

/** settings namespace 的字段 schema. */
export const LimitTimeoutSettingsSchema: z<LimitTimeoutSettings> = z.object({
  [DEFAULT_LIMIT_FIELD]: z.number().step(1).min(MIN_LIMIT_MS).max(MAX_LIMIT_MS).default(DEFAULT_LIMIT_MS),
  [HARD_LIMIT_FIELD]: z.number().step(1).min(MIN_LIMIT_MS).max(MAX_LIMIT_MS).default(DEFAULT_HARD_LIMIT_MS),
  [ALLOW_ESCALATION_FIELD]: z.boolean().default(true),
  [REQUIRE_EXPLICIT_JOB_WAIT_FIELD]: z.boolean().default(false),
})

/**
 * schema 无法表达的跨字段约束: 默认上限不能高于硬天花板, 否则默认值会被天花板
 * 立刻压回去, 设置页与运行时行为将互相矛盾.
 * @param value - schema 校验通过的完整配置.
 * @throws {Error} 当默认上限高于硬天花板.
 */
export function validateLimitTimeoutSettings(value: LimitTimeoutSettings): void {
  if (value.defaultLimitMs > value.hardLimitMs) {
    throw new Error(
      `defaultLimitMs (${String(value.defaultLimitMs)} ms) must not exceed hardLimitMs `
      + `(${String(value.hardLimitMs)} ms): the hard ceiling caps every wait, including the default.`,
    )
  }
}
