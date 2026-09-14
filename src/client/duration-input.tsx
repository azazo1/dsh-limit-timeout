/**
 * 时长输入框: 受控文本输入, 值由上层草稿提供, 错误提示就地展示.
 * @module dsh-limit-timeout/client/duration-input
 */

import { ERROR_CLASS, INPUT_CLASS, INPUT_COL_CLASS } from './styles.ts'

/** 组件 props. */
export interface DurationInputProps {
  /** 当前草稿文本. */
  value: string
  /** 校验错误, 没有则不显示. */
  error: string | undefined
  /** 无障碍标签. */
  ariaLabel: string
  /** 输入回调. */
  onInput: (next: string) => void
}

/**
 * 渲染一个时长输入框.
 * @param props - 值与回调.
 * @returns 输入框节点.
 */
export function DurationInput({ value, error, ariaLabel, onInput }: DurationInputProps): React.ReactNode {
  return (
    <div className={INPUT_COL_CLASS}>
      <input
        className={INPUT_CLASS}
        type="text"
        value={value}
        aria-label={ariaLabel}
        onChange={(event) => { onInput(event.currentTarget.value) }}
      />
      {error === undefined ? null : <div className={ERROR_CLASS}>{error}</div>}
    </div>
  )
}
