import { describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import type { PreToolDecision, ToolDefinition, ToolExecution } from '@deepseek-ai/dsh-tools'
import { apply, name } from '../src/index.ts'
import { REQUEST_WAIT_EXTENSION_TOOL } from '../src/extension-tool.ts'
import { DEFAULT_SETTINGS, type LimitTimeoutSettings } from '../src/shared.ts'

type Ref<T> = { get(): T }

function config(overrides: Partial<LimitTimeoutSettings> = {}) {
  const value = { ...DEFAULT_SETTINGS, ...overrides }
  const ref = <T>(current: T): Ref<T> => ({ get: () => current })
  return {
    defaultLimitMs: ref(value.defaultLimitMs),
    hardLimitMs: ref(value.hardLimitMs),
    allowEscalation: ref(value.allowEscalation),
    requireExplicitJobWaitMs: ref(value.requireExplicitJobWaitMs),
    suppressRepeatToolReminders: ref(value.suppressRepeatToolReminders),
  }
}

/** pre-execute 监听器形状. */
type PreExecuteListener = (
  exec: ToolExecution,
  next: () => Promise<PreToolDecision>,
) => Promise<PreToolDecision>

/** 最小 Host 上下文替身: 只提供插件真正使用到的服务面. */
interface StubContext {
  ctx: Context
  tools: ToolDefinition[]
  listeners: Record<string, ((...args: never[]) => unknown)[]>
}

/**
 * 构造只带 tools 服务的上下文: settings 与 systemPrompt 缺失, 插件应回退默认值
 * 并照常注册工具与监听器.
 * @returns 替身上下文与收集到的注册项.
 */
function stubContext(): StubContext {
  const tools: ToolDefinition[] = []
  const listeners: StubContext['listeners'] = {}
  const ctx = {
    logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
    // 只在依赖齐全时回调: 这里没有 settings / systemPrompt, 模拟未组合.
    inject: (deps: string[], callback: (scope: unknown) => void) => {
      if (deps.every(dep => dep === 'never')) callback(ctx)
    },
    tools: { register: (tool: ToolDefinition) => { tools.push(tool) } },
    on: (event: string, handler: (...args: never[]) => unknown) => {
      const bucket = listeners[event] ?? []
      bucket.push(handler)
      listeners[event] = bucket
    },
    effect: (fn: () => (() => void) | void) => fn(),
  } as unknown as Context
  return { ctx, tools, listeners }
}

/** 构造一次 bash 调用. */
function bashExecution(timeoutMs: number): ToolExecution {
  return {
    callId: 'call-1',
    name: 'bash',
    arguments: { command: 'sleep 600', description: '长等待', timeoutMs },
    signal: new AbortController().signal,
  } as unknown as ToolExecution
}

describe('apply', () => {
  it('导出插件名并注册申请工具与两个策略监听器', () => {
    const stub = stubContext()
    apply(stub.ctx, config())
    expect(name).toBe('dsh-limit-timeout')
    expect(stub.tools.map(tool => tool.name)).toContain(REQUEST_WAIT_EXTENSION_TOOL)
    expect(stub.listeners['tools/pre-execute']).toHaveLength(1)
    expect(stub.listeners['agent/pre-step']).toHaveLength(1)
  })

  it('未覆盖配置时使用默认上限拦截超限调用', async () => {
    const stub = stubContext()
    apply(stub.ctx, config())
    const listener = stub.listeners['tools/pre-execute'][0] as unknown as PreExecuteListener

    const denied = await listener(bashExecution(600_000), () => Promise.resolve({ kind: 'allow' }))
    expect(denied.kind).toBe('deny')
    if (denied.kind !== 'deny') throw new Error('expected deny')
    expect(denied.reason).toContain('120000 ms')
    expect(denied.reason).toContain('request_wait_extension')

    const allowed = await listener(bashExecution(30_000), () => Promise.resolve({ kind: 'allow' }))
    expect(allowed.kind).toBe('allow')
  })
})
