import { describe, expect, it, vi } from 'vitest'
import type { PreStepDecision } from '@deepseek-ai/dsh-agent'
import type { UserMessage } from '@deepseek-ai/dsh-session'
import { DEFAULT_SETTINGS, type LimitTimeoutSettings } from '../src/shared.ts'
import {
  createSuppressReminderListener,
  isRepeatReminder,
  REPEAT_REMINDER_SOURCE_KIND,
} from '../src/suppress.ts'

/** 构造只带 source 的消息替身. */
function message(source: UserMessage['source']): UserMessage {
  return { source } as unknown as UserMessage
}

const reminder = message({ kind: REPEAT_REMINDER_SOURCE_KIND } as unknown as UserMessage['source'])
const otherPlugin = message({ kind: 'some-other-plugin' } as unknown as UserMessage['source'])
const userMessage = message({ kind: 'user' })

const payload = { agent: { id: 'session-1' }, messages: [reminder, userMessage] } as unknown as never

/** 用指定配置构造监听器. */
function listenerWith(overrides: Partial<LimitTimeoutSettings>) {
  const log = vi.fn()
  const listener = createSuppressReminderListener({
    settings: () => ({ ...DEFAULT_SETTINGS, ...overrides }),
    log,
  })
  return { listener, log }
}

const enter = (messages: UserMessage[]): PreStepDecision => ({ kind: 'enter', messages })

describe('isRepeatReminder', () => {
  it('只匹配重复调用提醒', () => {
    expect(isRepeatReminder(reminder)).toBe(true)
    expect(isRepeatReminder(otherPlugin)).toBe(false)
    expect(isRepeatReminder(userMessage)).toBe(false)
  })
})

describe('createSuppressReminderListener', () => {
  it('开关打开时删掉提醒消息并记录条数', async () => {
    const { listener, log } = listenerWith({ suppressRepeatToolReminders: true })
    const decision = await listener(payload, () => Promise.resolve(enter([reminder, userMessage])))
    expect(decision.kind).toBe('enter')
    if (decision.kind !== 'enter') throw new Error('expected enter')
    expect(decision.messages).toEqual([userMessage])
    expect(log).toHaveBeenCalledTimes(1)
  })

  it('开关关闭时原样透传', async () => {
    const { listener, log } = listenerWith({ suppressRepeatToolReminders: false })
    const decision = await listener(payload, () => Promise.resolve(enter([reminder, userMessage])))
    if (decision.kind !== 'enter') throw new Error('expected enter')
    expect(decision.messages).toEqual([reminder, userMessage])
    expect(log).not.toHaveBeenCalled()
  })

  it('下游拒绝时保持拒绝', async () => {
    const { listener } = listenerWith({ suppressRepeatToolReminders: true })
    const decision = await listener(payload, () => Promise.resolve({ kind: 'reject' }))
    expect(decision).toEqual({ kind: 'reject' })
  })

  it('没有提醒消息时不改动决定对象', async () => {
    const { listener, log } = listenerWith({ suppressRepeatToolReminders: true })
    const original = enter([userMessage, otherPlugin])
    const decision = await listener(payload, () => Promise.resolve(original))
    expect(decision).toBe(original)
    expect(log).not.toHaveBeenCalled()
  })
})
