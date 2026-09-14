/**
 * 数字字段的本地草稿状态: 输入过程中不回写 Host (否则光标会被打到末尾), 失焦时
 * 校验并提交一次; 非法输入回退到持久值并保留错误提示.
 * @module dsh-limit-timeout/client/number-field
 */

import { useEffect, useRef, useState } from 'react'
import { parseLimitInput } from './format.ts'

/** 一个数字字段的编辑状态. */
export interface NumberFieldState {
  /** 输入框当前显示的文本. */
  draft: string
  /** 最近一次校验失败的提示; 合法时为 undefined. */
  error: string | undefined
  /** 输入事件. */
  onInput: (next: string) => void
  /** 聚焦事件. */
  onFocus: () => void
  /** 失焦事件: 提交或回退. */
  onBlur: () => void
}

/**
 * 维护一个数字字段的草稿状态.
 * @param options.persisted - Host 侧当前值.
 * @param options.min - 允许的最小值.
 * @param options.max - 允许的最大值 (硬天花板等跨字段约束).
 * @param options.onCommit - 提交回调, 只在草稿合法且与持久值不同时调用.
 * @returns 字段状态与事件处理.
 */
export function useNumberField(options: {
  persisted: number
  min: number
  max: number
  onCommit: (value: number) => void
}): NumberFieldState {
  const { persisted, min, max, onCommit } = options
  const [draft, setDraft] = useState(() => String(persisted))
  const [error, setError] = useState<string | undefined>(undefined)
  const focused = useRef(false)
  const commit = useRef(onCommit)
  commit.current = onCommit

  // Host 写入是异步的, 聚焦期间不要用回写值覆盖用户正在输入的内容.
  useEffect(() => {
    if (!focused.current) {
      setDraft(String(persisted))
      setError(undefined)
    }
  }, [persisted])

  return {
    draft,
    error,
    onInput: (next: string) => {
      setDraft(next)
      const parsed = parseLimitInput(next, min, max)
      setError(parsed.ok ? undefined : parsed.error)
    },
    onFocus: () => {
      focused.current = true
    },
    onBlur: () => {
      focused.current = false
      const parsed = parseLimitInput(draft, min, max)
      if (!parsed.ok) {
        setError(parsed.error)
        setDraft(String(persisted))
        return
      }
      setError(undefined)
      setDraft(String(parsed.value))
      if (parsed.value !== persisted) commit.current(parsed.value)
    },
  }
}
