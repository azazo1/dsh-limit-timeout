/**
 * Host 侧插件配置 schema. 0.1.7 的 settings 页面直接投影当前插件 Config,
 * 运行时通过 volatile 引用读取实时值.
 * @module dsh-limit-timeout/settings
 */

import type { Volatile } from '@deepseek-ai/cordis'
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
  SUPPRESS_REPEAT_REMINDER_FIELD,
  type LimitTimeoutSettings,
} from './shared.ts'

/** Loader 投影到 settings 页面的实时配置引用. */
export interface LimitTimeoutConfig {
  defaultLimitMs: Volatile<number>
  hardLimitMs: Volatile<number>
  allowEscalation: Volatile<boolean>
  requireExplicitJobWaitMs: Volatile<boolean>
  suppressRepeatToolReminders: Volatile<boolean>
}

/** 插件配置 schema. */
export const Config = z.object({
  [DEFAULT_LIMIT_FIELD]: z.number().step(1).min(MIN_LIMIT_MS).max(MAX_LIMIT_MS).default(DEFAULT_LIMIT_MS).volatile(),
  [HARD_LIMIT_FIELD]: z.number().step(1).min(MIN_LIMIT_MS).max(MAX_LIMIT_MS).default(DEFAULT_HARD_LIMIT_MS).volatile(),
  [ALLOW_ESCALATION_FIELD]: z.boolean().default(true).volatile(),
  [REQUIRE_EXPLICIT_JOB_WAIT_FIELD]: z.boolean().default(false).volatile(),
  [SUPPRESS_REPEAT_REMINDER_FIELD]: z.boolean().default(false).volatile(),
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
