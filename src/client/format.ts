/**
 * Client 侧的时长格式化: 把毫秒数说成人话, 用在字段说明里.
 * @module dsh-limit-timeout/client/format
 */

/** 毫秒数的中文可读形态, 用在说明文字里. */
export function formatMsHint(ms: number): string {
  if (ms % 3_600_000 === 0) return `${String(ms / 3_600_000)} 小时`
  if (ms % 60_000 === 0) return `${String(ms / 60_000)} 分钟`
  if (ms % 1_000 === 0) return `${String(ms / 1_000)} 秒`
  return `${String(ms)} 毫秒`
}
