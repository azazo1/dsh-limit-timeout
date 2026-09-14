/**
 * Client 侧的时长解析与格式化: 与 Host 使用同一套取值域常量.
 * @module dsh-limit-timeout/client/format
 */

/** 支持的单位后缀及其毫秒数, 省略单位时按毫秒处理. */
const UNIT_MS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
}

/** 毫秒数的可读形态. */
export function formatMsHint(ms: number): string {
  if (ms % 3_600_000 === 0) return `${String(ms / 3_600_000)} 小时`
  if (ms % 60_000 === 0) return `${String(ms / 60_000)} 分钟`
  if (ms % 1_000 === 0) return `${String(ms / 1_000)} 秒`
  return `${String(ms)} 毫秒`
}

/** 时长输入的解析结果. */
export type ParsedLimit =
  | { ok: true, value: number }
  | { ok: false, error: string }

/**
 * 解析用户输入的时长: 支持纯毫秒数, 也支持 `500ms`, `90s`, `2m`, `1h` 这类带
 * 单位的写法 (单位不区分大小写, 允许小数, 结果四舍五入到整数毫秒).
 * @param text - 输入框文本.
 * @param min - 允许的最小值 (毫秒).
 * @param max - 允许的最大值 (毫秒).
 * @returns 解析结果.
 */
export function parseLimitInput(text: string, min: number, max: number): ParsedLimit {
  const trimmed = text.trim().toLowerCase()
  if (trimmed.length === 0) return { ok: false, error: '请输入时长, 例如 120000 或 2m' }
  const match = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h)?$/.exec(trimmed)
  if (match === null) return { ok: false, error: '格式为数字加可选单位: ms, s, m, h' }
  const amount = Number(match[1])
  const unit = match[2] ?? 'ms'
  const value = Math.round(amount * (UNIT_MS[unit] ?? 1))
  if (!Number.isFinite(value) || value <= 0) return { ok: false, error: '时长必须大于 0' }
  if (value < min) return { ok: false, error: `不能小于 ${String(min)} 毫秒` }
  if (value > max) return { ok: false, error: `不能大于 ${String(max)} 毫秒` }
  return { ok: true, value }
}
