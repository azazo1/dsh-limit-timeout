/**
 * General 设置里的一行: 全局默认允许等待上限. 与独立设置页一样采用草稿模式:
 * 编辑不立刻写回, 有改动时才出现保存与放弃按钮.
 * @module dsh-limit-timeout/client/general-row
 */

import type { ConfigForm as SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'
import { DEFAULT_LIMIT_FIELD, type LimitTimeoutSettings } from '../shared.ts'
import { DurationInput } from './duration-input.tsx'
import { formatMsHint } from './format.ts'
import { useSettingsDraft } from './settings-draft.ts'
import {
  ACTIONS_CLASS,
  BTN_CLASS,
  BTN_PRIMARY_CLASS,
  DESC_CLASS,
  ROW_CLASS,
  ROW_COPY_CLASS,
  STATUS_CLASS,
  TITLE_CLASS,
} from './styles.ts'

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
  const handle = useSettingsDraft(scope)
  const persisted = handle.settings.defaultLimitMs
  const dirty = handle.dirty

  return (
    <div className={ROW_CLASS}>
      <div className={ROW_COPY_CLASS}>
        <div className={TITLE_CLASS}>等待上限</div>
        <div className={DESC_CLASS}>
          单次工具调用最多可等待多久, 支持 120000, 90s, 2m, 1h 等写法, 省略单位按毫秒. 当前为{' '}
          {formatMsHint(persisted)}, 覆盖 bash 的 timeoutMs 与 job_output 的 timeout_ms; 超出上限的调用会被
          拒绝, 模型可改用后台执行或向你申请提升.
        </div>
        {handle.status.kind === 'error' ? <div className={DESC_CLASS}>{handle.status.message}</div> : null}
      </div>
      <DurationInput
        value={handle.draft.durations[DEFAULT_LIMIT_FIELD]}
        error={handle.durationError(DEFAULT_LIMIT_FIELD)}
        ariaLabel="单次工具调用等待上限 (毫秒)"
        onInput={(next) => { handle.setDuration(DEFAULT_LIMIT_FIELD, next) }}
      />
      {dirty ? (
        <div className={ACTIONS_CLASS}>
          <button
            type="button"
            className={`${BTN_CLASS} ${BTN_PRIMARY_CLASS}`}
            disabled={handle.status.kind === 'saving'}
            onClick={handle.save}
          >
            {handle.status.kind === 'saving' ? '保存中...' : '保存'}
          </button>
          <button type="button" className={BTN_CLASS} onClick={handle.discard}>
            放弃更改
          </button>
        </div>
      ) : (
        <div className={STATUS_CLASS}>
          {handle.status.kind === 'saved' ? '已保存, 立即生效' : '未修改'}
        </div>
      )}
    </div>
  )
}
