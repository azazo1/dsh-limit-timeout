/**
 * General 设置里的一行: 全局默认允许等待上限. 该值是所有等待参数 (bash 的
 * `timeoutMs`, job_output 的 `timeout_ms`) 的默认上限, 模型可在会话中向用户
 * 申请临时抬高.
 * @module dsh-limit-timeout/client/general-row
 */

import { useSyncExternalStore } from 'react'
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'
import {
  DEFAULT_HARD_LIMIT_MS,
  DEFAULT_LIMIT_FIELD,
  DEFAULT_LIMIT_MS,
  MIN_LIMIT_MS,
  type LimitTimeoutSettings,
} from '../shared.ts'
import { formatMsHint } from './format.ts'
import { useNumberField } from './number-field.ts'
import { DESC_CLASS, INPUT_CLASS, ROW_CLASS, ROW_COPY_CLASS, TITLE_CLASS } from './styles.ts'

/** 组件收到的 props: 已绑定的 settings scope. */
export interface GeneralLimitRowProps {
  scope: SettingsScope<LimitTimeoutSettings>
}

/**
 * 渲染全局默认等待上限的一行输入.
 * @param props - 已绑定的 scope.
 * @returns 设置行节点.
 */
export function GeneralLimitRow({ scope }: GeneralLimitRowProps): React.ReactNode {
  const settings = useSyncExternalStore(
    (onChange) => scope.subscribe(onChange),
    () => scope.getSnapshot().value,
  )
  const persisted = settings?.defaultLimitMs ?? DEFAULT_LIMIT_MS
  const hardLimitMs = settings?.hardLimitMs ?? DEFAULT_HARD_LIMIT_MS
  const field = useNumberField({
    persisted,
    min: MIN_LIMIT_MS,
    max: hardLimitMs,
    onCommit: (value) => { void scope.set(DEFAULT_LIMIT_FIELD, value) },
  })

  return (
    <div className={ROW_CLASS}>
      <div className={ROW_COPY_CLASS}>
        <div className={TITLE_CLASS}>等待上限</div>
        <div className={DESC_CLASS}>
          单次工具调用最多可等待多久, 支持 120000, 90s, 2m, 1h 等写法, 省略单位按毫秒. 当前为{' '}
          {formatMsHint(persisted)}, 覆盖 bash 的 timeoutMs 与 job_output 的 timeout_ms; 超出上限的调用会被
          拒绝, 模型可改用后台执行或向你申请提升.
        </div>
        {field.error === undefined ? null : <div className={DESC_CLASS}>{field.error}</div>}
      </div>
      <input
        className={INPUT_CLASS}
        type="text"
        inputMode="numeric"
        value={field.draft}
        aria-label="单次工具调用等待上限 (毫秒)"
        onFocus={field.onFocus}
        onChange={(event) => { field.onInput(event.currentTarget.value) }}
        onBlur={field.onBlur}
      />
    </div>
  )
}
