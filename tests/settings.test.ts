import { describe, expect, it } from 'vitest'
import {
  DEFAULT_HARD_LIMIT_MS,
  DEFAULT_LIMIT_MS,
  decodeLimitTimeoutSettings,
} from '../src/shared.ts'
import { validateLimitTimeoutSettings } from '../src/settings.ts'

describe('decodeLimitTimeoutSettings', () => {
  it('读取合法字段', () => {
    expect(decodeLimitTimeoutSettings({
      defaultLimitMs: 30_000,
      hardLimitMs: 90_000,
      allowEscalation: false,
      requireExplicitJobWaitMs: true,
      suppressRepeatToolReminders: true,
    })).toEqual({
      defaultLimitMs: 30_000,
      hardLimitMs: 90_000,
      allowEscalation: false,
      requireExplicitJobWaitMs: true,
      suppressRepeatToolReminders: true,
    })
  })

  it('缺失或非法字段回退默认值', () => {
    expect(decodeLimitTimeoutSettings({})).toEqual({
      defaultLimitMs: DEFAULT_LIMIT_MS,
      hardLimitMs: DEFAULT_HARD_LIMIT_MS,
      allowEscalation: true,
      requireExplicitJobWaitMs: false,
      suppressRepeatToolReminders: false,
    })
    expect(decodeLimitTimeoutSettings({ defaultLimitMs: 10, allowEscalation: 'yes' })).toEqual({
      defaultLimitMs: DEFAULT_LIMIT_MS,
      hardLimitMs: DEFAULT_HARD_LIMIT_MS,
      allowEscalation: true,
      requireExplicitJobWaitMs: false,
      suppressRepeatToolReminders: false,
    })
    expect(decodeLimitTimeoutSettings(null)).toBeUndefined()
  })
})

describe('validateLimitTimeoutSettings', () => {
  it('默认上限高于硬天花板时报错', () => {
    expect(() => {
      validateLimitTimeoutSettings({
        defaultLimitMs: 200_000,
        hardLimitMs: 100_000,
        allowEscalation: true,
        requireExplicitJobWaitMs: false,
        suppressRepeatToolReminders: false,
      })
    }).toThrow(/hardLimitMs/)
  })

  it('相等或更低时通过', () => {
    expect(() => {
      validateLimitTimeoutSettings({
        defaultLimitMs: 100_000,
        hardLimitMs: 100_000,
        allowEscalation: true,
        requireExplicitJobWaitMs: false,
        suppressRepeatToolReminders: false,
      })
    }).not.toThrow()
  })
})
