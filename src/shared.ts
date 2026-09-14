/**
 * Host 与 Client 共享的标识, 字段名, 默认值与解码逻辑. 两侧都从这里导入,
 * 避免各自复制字符串常量.
 * @module dsh-limit-timeout/shared
 */

/** 插件标识: settings namespace, patch row id 与 client 注册 id 三者一致. */
export const PLUGIN_ID = 'dsh-limit-timeout'

/** 全局默认允许等待上限 (毫秒) 的字段名. */
export const DEFAULT_LIMIT_FIELD = 'defaultLimitMs'

/** 硬天花板 (毫秒) 的字段名: 会话提升也不可超越. */
export const HARD_LIMIT_FIELD = 'hardLimitMs'

/** 是否允许模型在会话中申请提升的字段名. */
export const ALLOW_ESCALATION_FIELD = 'allowEscalation'

/** job_output 的 wait 是否必须显式给出 timeout_ms 的字段名. */
export const REQUIRE_EXPLICIT_JOB_WAIT_FIELD = 'requireExplicitJobWaitMs'

/** 是否屏蔽重复工具调用提醒注入的字段名. */
export const SUPPRESS_REPEAT_REMINDER_FIELD = 'suppressRepeatToolReminders'

/** 上限字段允许的最小值 (1 秒): 再小会让工具调用失去意义. */
export const MIN_LIMIT_MS = 1_000

/** 上限字段允许的最大值 (24 小时): 防止误填造成实质上的无限等待. */
export const MAX_LIMIT_MS = 86_400_000

/** 全局默认等待上限: 2 分钟. */
export const DEFAULT_LIMIT_MS = 120_000

/** 硬天花板默认值: 30 分钟. */
export const DEFAULT_HARD_LIMIT_MS = 1_800_000

/** settings namespace 的字段集合. */
export interface LimitTimeoutSettings {
  /** 全局默认允许等待上限 (毫秒). */
  defaultLimitMs: number
  /** 硬天花板 (毫秒): 模型申请提升也不可超越. */
  hardLimitMs: number
  /** 是否允许模型通过 request_wait_extension 申请会话级提升. */
  allowEscalation: boolean
  /** 为 true 时 job_output 的 wait 必须显式给出 timeout_ms, 否则拒绝. */
  requireExplicitJobWaitMs: boolean
  /** 为 true 时从模型请求中移除 repeat-tool-reminder 注入的重复调用提醒. */
  suppressRepeatToolReminders: boolean
}

/** 未注册 settings namespace 或用户未保存过时的生效值. */
export const DEFAULT_SETTINGS: LimitTimeoutSettings = {
  defaultLimitMs: DEFAULT_LIMIT_MS,
  hardLimitMs: DEFAULT_HARD_LIMIT_MS,
  allowEscalation: true,
  requireExplicitJobWaitMs: false,
  suppressRepeatToolReminders: false,
}

/** 上限字段的合法取值域 (schemastery schema 与解码共用). */
export function isValidLimit(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
    && value >= MIN_LIMIT_MS && value <= MAX_LIMIT_MS
}

/**
 * 把 Client 从 Host 拿到的未知 section 结构解码为类型化配置. 缺字段或非法
 * 字段回退默认值, 整体不是对象时返回 undefined.
 * @param section - Host settings 返回的未知结构.
 * @returns 解码后的配置, 或 undefined.
 */
export function decodeLimitTimeoutSettings(section: unknown): LimitTimeoutSettings | undefined {
  if (typeof section !== 'object' || section === null) return undefined
  const record = section as Record<string, unknown>
  const defaultLimitMs = record[DEFAULT_LIMIT_FIELD]
  const hardLimitMs = record[HARD_LIMIT_FIELD]
  const allowEscalation = record[ALLOW_ESCALATION_FIELD]
  const requireExplicitJobWaitMs = record[REQUIRE_EXPLICIT_JOB_WAIT_FIELD]
  const suppressRepeatToolReminders = record[SUPPRESS_REPEAT_REMINDER_FIELD]
  return {
    defaultLimitMs: isValidLimit(defaultLimitMs) ? defaultLimitMs : DEFAULT_LIMIT_MS,
    hardLimitMs: isValidLimit(hardLimitMs) ? hardLimitMs : DEFAULT_HARD_LIMIT_MS,
    allowEscalation: typeof allowEscalation === 'boolean' ? allowEscalation : true,
    requireExplicitJobWaitMs: typeof requireExplicitJobWaitMs === 'boolean'
      ? requireExplicitJobWaitMs
      : false,
    suppressRepeatToolReminders: typeof suppressRepeatToolReminders === 'boolean'
      ? suppressRepeatToolReminders
      : false,
  }
}
