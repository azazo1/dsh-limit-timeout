import { describe, expect, it } from 'vitest'
import { SessionWaitLimits } from '../src/session-limits.ts'

describe('SessionWaitLimits', () => {
  it('未提升时使用全局默认值', () => {
    const limits = new SessionWaitLimits()
    const session = {}
    expect(limits.grantOf(session)).toBeUndefined()
    expect(limits.limitOf(session, 120_000, 1_800_000)).toBe(120_000)
    expect(limits.limitOf(undefined, 120_000, 1_800_000)).toBe(120_000)
  })

  it('提升覆盖默认值并被硬天花板压住', () => {
    const limits = new SessionWaitLimits()
    const session = {}
    limits.grant(session, 600_000, '等待构建')
    expect(limits.limitOf(session, 120_000, 1_800_000)).toBe(600_000)
    expect(limits.limitOf(session, 120_000, 300_000)).toBe(300_000)
    expect(limits.grantOf(session)?.reason).toBe('等待构建')
  })

  it('提升按会话隔离', () => {
    const limits = new SessionWaitLimits()
    const first = {}
    const second = {}
    limits.grant(first, 600_000, 'a')
    expect(limits.limitOf(first, 120_000, 1_800_000)).toBe(600_000)
    expect(limits.limitOf(second, 120_000, 1_800_000)).toBe(120_000)
  })

  it('撤销后回到默认值', () => {
    const limits = new SessionWaitLimits()
    const session = {}
    limits.grant(session, 600_000, 'a')
    expect(limits.revoke(session)).toBe(true)
    expect(limits.revoke(session)).toBe(false)
    expect(limits.limitOf(session, 120_000, 1_800_000)).toBe(120_000)
  })
})
