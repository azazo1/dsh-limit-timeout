import { describe, expect, it } from 'vitest'
import { ALLOW_ESCALATION_FIELD, DEFAULT_SETTINGS, SUPPRESS_REPEAT_REMINDER_FIELD } from '../src/shared.ts'
import { buildSavePlan, draftFrom, sameDraft } from '../src/client/settings-draft.ts'

describe('draftFrom', () => {
  it('把毫秒数还原成合适的单位写法', () => {
    const draft = draftFrom({ ...DEFAULT_SETTINGS, defaultLimitMs: 120_000, hardLimitMs: 1_800_000 })
    expect(draft.durations.defaultLimitMs).toBe('2m')
    expect(draft.durations.hardLimitMs).toBe('30m')
  })

  it('非整秒与整秒分别用 ms 与 s', () => {
    const draft = draftFrom({ ...DEFAULT_SETTINGS, defaultLimitMs: 1_500, hardLimitMs: 90_000 })
    expect(draft.durations.defaultLimitMs).toBe('1500ms')
    expect(draft.durations.hardLimitMs).toBe('90s')
  })

  it('开关沿用 Host 值', () => {
    const draft = draftFrom({ ...DEFAULT_SETTINGS, allowEscalation: false, suppressRepeatToolReminders: true })
    expect(draft.flags[ALLOW_ESCALATION_FIELD]).toBe(false)
    expect(draft.flags[SUPPRESS_REPEAT_REMINDER_FIELD]).toBe(true)
  })
})

describe('sameDraft', () => {
  it('忽略来源只比较内容', () => {
    const a = draftFrom(DEFAULT_SETTINGS)
    expect(sameDraft(a, draftFrom(DEFAULT_SETTINGS))).toBe(true)
    expect(sameDraft(a, { ...a, durations: { ...a.durations, defaultLimitMs: '3m' } })).toBe(false)
  })
})

describe('buildSavePlan', () => {
  it('没有改动时不产生任何操作', () => {
    const settings = { ...DEFAULT_SETTINGS }
    const plan = buildSavePlan(draftFrom(settings), settings)
    expect(plan.ok).toBe(true)
    if (!plan.ok) throw new Error('expected ok')
    expect(plan.ops).toEqual([])
  })

  it('只写入真正变化的字段并规范化显示', () => {
    const settings = { ...DEFAULT_SETTINGS }
    const draft = draftFrom(settings)
    draft.durations.defaultLimitMs = '90000'
    draft.flags[ALLOW_ESCALATION_FIELD] = false
    const plan = buildSavePlan(draft, settings)
    expect(plan.ok).toBe(true)
    if (!plan.ok) throw new Error('expected ok')
    expect(plan.ops).toEqual([
      { op: 'set', path: ['defaultLimitMs'], value: 90_000 },
      { op: 'set', path: ['allowEscalation'], value: false },
    ])
    expect(plan.normalized.durations.defaultLimitMs).toBe('90s')
  })

  it('带单位输入解析成毫秒', () => {
    const settings = { ...DEFAULT_SETTINGS }
    const draft = draftFrom(settings)
    draft.durations.defaultLimitMs = '1.5m'
    const plan = buildSavePlan(draft, settings)
    if (!plan.ok) throw new Error('expected ok')
    expect(plan.ops).toEqual([{ op: 'set', path: ['defaultLimitMs'], value: 90_000 }])
  })

  it('默认上限高于硬天花板时拒绝保存', () => {
    const settings = { ...DEFAULT_SETTINGS }
    const draft = draftFrom(settings)
    draft.durations.defaultLimitMs = '10m'
    draft.durations.hardLimitMs = '5m'
    const plan = buildSavePlan(draft, settings)
    expect(plan.ok).toBe(false)
    if (plan.ok) throw new Error('expected failure')
    expect(plan.error).toContain('全局默认等待上限')
  })

  it('硬天花板非法时拒绝保存', () => {
    const settings = { ...DEFAULT_SETTINGS }
    const draft = draftFrom(settings)
    draft.durations.hardLimitMs = '5x'
    const plan = buildSavePlan(draft, settings)
    expect(plan.ok).toBe(false)
    if (plan.ok) throw new Error('expected failure')
    expect(plan.error).toContain('硬天花板')
  })
})
