import { describe, expect, it } from 'vitest'
import { formatMsHint } from '../src/client/format.ts'

describe('formatMsHint', () => {
  it('按小时, 分钟, 秒与毫秒分级', () => {
    expect(formatMsHint(3_600_000)).toBe('1 小时')
    expect(formatMsHint(120_000)).toBe('2 分钟')
    expect(formatMsHint(90_000)).toBe('90 秒')
    expect(formatMsHint(1_500)).toBe('1500 毫秒')
  })
})
