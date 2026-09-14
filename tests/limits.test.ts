import { describe, expect, it } from 'vitest'
import { describeWaitBudget, evaluateWaitGuard, formatDuration, readWaitRequest } from '../src/limits.ts'

const base = {
  limitMs: 120_000,
  hardLimitMs: 1_800_000,
  allowEscalation: true,
  requireExplicitJobWaitMs: false,
}

describe('readWaitRequest', () => {
  it('识别 timeoutMs 与 timeout_ms', () => {
    expect(readWaitRequest({ timeoutMs: 5_000 })).toEqual({ field: 'timeoutMs', value: 5_000 })
    expect(readWaitRequest({ timeout_ms: 1_000 })).toEqual({ field: 'timeout_ms', value: 1_000 })
  })

  it('忽略非数字与非有限值', () => {
    expect(readWaitRequest({ timeoutMs: '5000' })).toBeUndefined()
    expect(readWaitRequest({ timeoutMs: Number.POSITIVE_INFINITY })).toBeUndefined()
    expect(readWaitRequest(undefined)).toBeUndefined()
    expect(readWaitRequest([1, 2])).toBeUndefined()
  })
})

describe('evaluateWaitGuard', () => {
  it('上限内的等待放行', () => {
    expect(evaluateWaitGuard({ ...base, toolName: 'bash', args: { timeoutMs: 120_000 } })).toEqual({ kind: 'allow' })
  })

  it('超限的 bash 调用被拒绝并给出两条替代做法', () => {
    const decision = evaluateWaitGuard({ ...base, toolName: 'bash', args: { timeoutMs: 600_000 } })
    expect(decision.kind).toBe('deny')
    if (decision.kind !== 'deny') throw new Error('expected deny')
    expect(decision.reason).toContain('600000 ms exceeds')
    expect(decision.reason).toContain('run_in_background')
    expect(decision.reason).toContain('request_wait_extension')
  })

  it('后台执行的 bash 调用不检查超时参数', () => {
    expect(evaluateWaitGuard({
      ...base,
      toolName: 'bash',
      args: { timeoutMs: 600_000, run_in_background: true },
    })).toEqual({ kind: 'allow' })
  })

  it('超限的 job_output 等待被拒绝', () => {
    const decision = evaluateWaitGuard({
      ...base,
      toolName: 'job_output',
      args: { wait: true, timeout_ms: 300_000 },
    })
    expect(decision.kind).toBe('deny')
    if (decision.kind !== 'deny') throw new Error('expected deny')
    expect(decision.reason).toContain('`timeout_ms` 300000 ms')
  })

  it('禁止申请时不提示申请工具', () => {
    const decision = evaluateWaitGuard({
      ...base,
      allowEscalation: false,
      toolName: 'bash',
      args: { timeoutMs: 600_000 },
    })
    expect(decision.kind).toBe('deny')
    if (decision.kind !== 'deny') throw new Error('expected deny')
    expect(decision.reason).not.toContain('request_wait_extension')
  })

  it('其他工具的 timeoutMs 同样受限', () => {
    const decision = evaluateWaitGuard({ ...base, toolName: 'pwsh', args: { timeoutMs: 121_000 } })
    expect(decision.kind).toBe('deny')
  })

  it('开启严格模式后隐式 job 等待被拒绝', () => {
    const decision = evaluateWaitGuard({
      ...base,
      requireExplicitJobWaitMs: true,
      toolName: 'job_output',
      args: { wait: true },
    })
    expect(decision.kind).toBe('deny')
    if (decision.kind !== 'deny') throw new Error('expected deny')
    expect(decision.reason).toContain('explicit `timeout_ms`')
  })

  it('默认不干预隐式 job 等待', () => {
    expect(evaluateWaitGuard({
      ...base,
      toolName: 'job_output',
      args: { wait: true },
    })).toEqual({ kind: 'allow' })
  })

  it('没有等待参数时放行', () => {
    expect(evaluateWaitGuard({ ...base, toolName: 'read', args: { path: '/tmp/a' } })).toEqual({ kind: 'allow' })
    expect(evaluateWaitGuard({ ...base, toolName: 'bash', args: 'not-an-object' })).toEqual({ kind: 'allow' })
  })
})

describe('formatDuration', () => {
  it('按分钟, 秒与毫秒分级', () => {
    expect(formatDuration(120_000)).toBe('2 min')
    expect(formatDuration(1_500)).toBe('1500 ms')
    expect(formatDuration(30_000)).toBe('30 s')
  })
})

describe('describeWaitBudget', () => {
  it('包含当前上限, 硬天花板与申请方式', () => {
    const text = describeWaitBudget({
      settings: { defaultLimitMs: 120_000, hardLimitMs: 900_000, allowEscalation: true, requireExplicitJobWaitMs: false },
      sessionLimitMs: 120_000,
      raised: false,
    })
    expect(text).toContain('120000 ms')
    expect(text).toContain('900000 ms')
    expect(text).toContain('request_wait_extension')
  })

  it('提升后说明提升来源, 并在禁止申请时去掉申请提示', () => {
    const raised = describeWaitBudget({
      settings: { defaultLimitMs: 120_000, hardLimitMs: 900_000, allowEscalation: true, requireExplicitJobWaitMs: false },
      sessionLimitMs: 600_000,
      raised: true,
    })
    expect(raised).toContain('raised this session\'s limit')

    const disabled = describeWaitBudget({
      settings: { defaultLimitMs: 120_000, hardLimitMs: 900_000, allowEscalation: false, requireExplicitJobWaitMs: false },
      sessionLimitMs: 120_000,
      raised: false,
    })
    expect(disabled).not.toContain('request_wait_extension')
    expect(disabled).toContain('does not allow raising')
  })
})
