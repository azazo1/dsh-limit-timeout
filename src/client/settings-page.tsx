/**
 * 独立设置页: 等待上限的全部字段. 数字字段失焦时提交, 开关即时提交, 两者都经
 * settings scope 写回 Host 并实时生效.
 * @module dsh-limit-timeout/client/settings-page
 */

import { useSyncExternalStore, useState } from 'react'
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'
import {
  ALLOW_ESCALATION_FIELD,
  DEFAULT_HARD_LIMIT_MS,
  DEFAULT_LIMIT_FIELD,
  DEFAULT_LIMIT_MS,
  HARD_LIMIT_FIELD,
  MAX_LIMIT_MS,
  MIN_LIMIT_MS,
  REQUIRE_EXPLICIT_JOB_WAIT_FIELD,
  type LimitTimeoutSettings,
} from '../shared.ts'
import { formatMsHint } from './format.ts'
import { useNumberField } from './number-field.ts'
import {
  CARD_CLASS,
  DESC_CLASS,
  ERROR_CLASS,
  FIELD_CLASS,
  HINT_CLASS,
  INPUT_CLASS,
  ROW_COPY_CLASS,
  SECTION_CLASS,
  SECTION_TITLE_CLASS,
  STATUS_CLASS,
  TITLE_CLASS,
  TOGGLE_CLASS,
} from './styles.ts'

/** 组件收到的 props: settings shell 的 close 回调与已绑定的 scope. */
export interface LimitTimeoutSectionProps {
  close?: () => void
  scope: SettingsScope<LimitTimeoutSettings>
}

/** 一次写入的状态文案. */
type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error', message: string }

/** 把写入结果转成状态文案的公共入口. */
function writeSetting(
  scope: SettingsScope<LimitTimeoutSettings>,
  setSave: (state: SaveState) => void,
  field: string,
  value: unknown,
): void {
  setSave({ kind: 'saving' })
  void Promise.resolve(scope.set(field, value))
    .then(() => { setSave({ kind: 'saved' }) })
    .catch((error: unknown) => {
      setSave({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
    })
}

/**
 * 渲染等待上限配置页.
 * @param props - 已绑定的 scope.
 * @returns 配置页节点.
 */
export function LimitTimeoutSection({ scope }: LimitTimeoutSectionProps): React.ReactNode {
  const settings = useSyncExternalStore(
    (onChange) => scope.subscribe(onChange),
    () => scope.getSnapshot().value,
  )
  const [save, setSave] = useState<SaveState>({ kind: 'idle' })

  const defaultLimitMs = settings?.defaultLimitMs ?? DEFAULT_LIMIT_MS
  const hardLimitMs = settings?.hardLimitMs ?? DEFAULT_HARD_LIMIT_MS
  const allowEscalation = settings?.allowEscalation ?? true
  const requireExplicitJobWaitMs = settings?.requireExplicitJobWaitMs ?? false

  const defaultField = useNumberField({
    persisted: defaultLimitMs,
    min: MIN_LIMIT_MS,
    max: hardLimitMs,
    onCommit: (value) => { writeSetting(scope, setSave, DEFAULT_LIMIT_FIELD, value) },
  })
  const hardField = useNumberField({
    persisted: hardLimitMs,
    min: MIN_LIMIT_MS,
    max: MAX_LIMIT_MS,
    onCommit: (value) => {
      // 硬天花板不可以低于当前的默认上限, 否则 Host 的跨字段校验会拒绝写入.
      if (value < defaultLimitMs) {
        setSave({
          kind: 'error',
          message: `硬天花板不能低于默认等待上限 (${String(defaultLimitMs)} 毫秒)`,
        })
        return
      }
      writeSetting(scope, setSave, HARD_LIMIT_FIELD, value)
    },
  })

  return (
    <section className={SECTION_CLASS}>
      <h2 className={SECTION_TITLE_CLASS}>等待上限</h2>
      <p className={DESC_CLASS}>
        限制 agent 在单次工具调用里可以让调用方等待多久. bash 的 timeoutMs 与 job_output 的 timeout_ms
        都受这里约束, 超出上限的调用在真正执行前被拒绝, 理由会提示模型改用后台执行或向你申请提升.
      </p>
      <div className={CARD_CLASS}>
        <div className={FIELD_CLASS}>
          <div className={ROW_COPY_CLASS}>
            <div className={TITLE_CLASS}>全局默认等待上限</div>
            <div className={DESC_CLASS}>
              支持 120000, 90s, 2m, 1h 等写法, 省略单位按毫秒. 默认 {formatMsHint(DEFAULT_LIMIT_MS)},
              与 General 设置里的那一行是同一个值.
            </div>
            {defaultField.error === undefined ? null : <div className={ERROR_CLASS}>{defaultField.error}</div>}
          </div>
          <input
            className={INPUT_CLASS}
            type="text"
            inputMode="numeric"
            value={defaultField.draft}
            aria-label="全局默认等待上限 (毫秒)"
            onFocus={defaultField.onFocus}
            onChange={(event) => { defaultField.onInput(event.currentTarget.value) }}
            onBlur={defaultField.onBlur}
          />
        </div>
        <div className={FIELD_CLASS}>
          <div className={ROW_COPY_CLASS}>
            <div className={TITLE_CLASS}>硬天花板</div>
            <div className={DESC_CLASS}>
              支持 120000, 90s, 2m, 1h 等写法, 省略单位按毫秒. 默认 {formatMsHint(DEFAULT_HARD_LIMIT_MS)}.
              即使你批准了模型的提升申请, 实际等待也不会超过这个值; 调低它会立刻收回已批准的提升.
            </div>
            {hardField.error === undefined ? null : <div className={ERROR_CLASS}>{hardField.error}</div>}
          </div>
          <input
            className={INPUT_CLASS}
            type="text"
            inputMode="numeric"
            value={hardField.draft}
            aria-label="硬天花板 (毫秒)"
            onFocus={hardField.onFocus}
            onChange={(event) => { hardField.onInput(event.currentTarget.value) }}
            onBlur={hardField.onBlur}
          />
        </div>
        <div className={FIELD_CLASS}>
          <div className={ROW_COPY_CLASS}>
            <div className={TITLE_CLASS}>允许模型申请提升</div>
            <div className={DESC_CLASS}>
              开启后模型可以调用 request_wait_extension 说明理由, 由你决定是否把本会话的上限抬高;
              批准只在本次进程运行期间有效.
            </div>
          </div>
          <label className={TOGGLE_CLASS}>
            <input
              type="checkbox"
              checked={allowEscalation}
              onChange={(event) => {
                writeSetting(scope, setSave, ALLOW_ESCALATION_FIELD, event.currentTarget.checked)
              }}
            />
            允许
          </label>
        </div>
        <div className={FIELD_CLASS}>
          <div className={ROW_COPY_CLASS}>
            <div className={TITLE_CLASS}>要求显式声明等待时长</div>
            <div className={DESC_CLASS}>
              开启后 job_output 的 wait 必须同时给出 timeout_ms, 否则调用被拒绝; 关闭时这类隐式等待
              由 job_output 自身的部署配置约束.
            </div>
          </div>
          <label className={TOGGLE_CLASS}>
            <input
              type="checkbox"
              checked={requireExplicitJobWaitMs}
              onChange={(event) => {
                writeSetting(scope, setSave, REQUIRE_EXPLICIT_JOB_WAIT_FIELD, event.currentTarget.checked)
              }}
            />
            要求
          </label>
        </div>
      </div>
      <ul className={HINT_CLASS}>
        <li>被拒绝的调用会收到明确的错误信息, 模型据此降低等待时间, 改用后台执行或者提出申请.</li>
        <li>提升按会话记录: 新会话与进程重启后回到这里的全局默认值.</li>
        <li>等待参数名同时匹配 timeoutMs 与 timeout_ms, 因此 bash, pwsh 与 job_output 都被覆盖.</li>
      </ul>
      {save.kind === 'saving' ? <div className={STATUS_CLASS}>保存中...</div> : null}
      {save.kind === 'saved' ? <div className={STATUS_CLASS}>已保存, 立即生效</div> : null}
      {save.kind === 'error' ? <div className={ERROR_CLASS}>保存失败: {save.message}</div> : null}
    </section>
  )
}
