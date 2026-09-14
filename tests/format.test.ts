import { describe, expect, it } from 'vitest'
import { formatMsHint, parseLimitInput } from '../src/client/format.ts'

const MIN = 1_000
const MAX = 86_400_000

describe('parseLimitInput', () => {
  it('纯数字按毫秒', () => {
    expect(parseLimitInput('120000', MIN, MAX)).toEqual({ ok: true, value: 120_000 })
  })

  it('支持 ms, s, m, h 单位', () => {
    expect(parseLimitInput('1500ms', MIN, MAX)).toEqual({ ok: true, value: 1_500 })
    expect(parseLimitInput('90s', MIN, MAX)).toEqual({ ok: true, value: 90_000 })
    expect(parseLimitInput('2m', MIN, MAX)).toEqual({ ok: true, value: 120_000 })
    expect(parseLimitInput('1h', MIN, MAX)).toEqual({ ok: true, value: 3_600_000 })
  })

  it('容忍空格与大小写, 允许小数', () => {
    expect(parseLimitInput(' 1.5s ', MIN, MAX)).toEqual({ ok: true, value: 1_500 })
    expect(parseLimitInput('2M', MIN, MAX)).toEqual({ ok: true, value: 120_000 })
    expect(parseLimitInput('0.5h', MIN, MAX)).toEqual({ ok: true, value: 1_800_000 })
  })

  it('拒绝非法输入与越界值', () => {
    expect(parseLimitInput('', MIN, MAX).ok).toBe(false)
    expect(parseLimitInput('abc', MIN, MAX).ok).toBe(false)
    expect(parseLimitInput('2d', MIN, MAX).ok).toBe(false)
    expect(parseLimitInput('100', MIN, MAX).ok).toBe(false)
    expect(parseLimitInput('500ms', MIN, MAX).ok).toBe(false)
    expect(parseLimitInput('0s', MIN, MAX).ok).toBe(false)
    expect(parseLimitInput('100h', MIN, MAX).ok).toBe(false)
  })
})

describe('formatMsHint', () => {
  it('按小时, 分钟, 秒与毫秒分级', () => {
    expect(formatMsHint(3_600_000)).toBe('1 小时')
    expect(formatMsHint(120_000)).toBe('2 分钟')
    expect(formatMsHint(90_000)).toBe('90 秒')
    expect(formatMsHint(1_500)).toBe('1500 毫秒')
  })
})
