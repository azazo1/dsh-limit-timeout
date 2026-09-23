/**
 * 独立设置页: 等待上限的全部字段. 编辑只改本地草稿, 底部保存按钮一次性原子写回
 * Host, 放弃更改按钮还原成 Host 当前值; 保存与放弃之后数字字段都还原成合适的
 * 单位写法.
 * @module dsh-limit-timeout/client/settings-page
 */

import type { ConfigForm as SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'
import {
  ALLOW_ESCALATION_FIELD,
  DEFAULT_HARD_LIMIT_MS,
  DEFAULT_LIMIT_FIELD,
  DEFAULT_LIMIT_MS,
  HARD_LIMIT_FIELD,
  REQUIRE_EXPLICIT_JOB_WAIT_FIELD,
  SUPPRESS_REPEAT_REMINDER_FIELD,
  type LimitTimeoutSettings,
} from '../shared.ts'
import { DurationInput } from './duration-input.tsx'
import { formatMsHint } from './format.ts'
import { useSettingsDraft } from './settings-draft.ts'
import {
  ACTIONS_CLASS,
  BTN_CLASS,
  BTN_PRIMARY_CLASS,
  CARD_CLASS,
  DESC_CLASS,
  ERROR_CLASS,
  FIELD_CLASS,
  HINT_CLASS,
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

/**
 * 渲染等待上限配置页.
 * @param props - 已绑定的 scope.
 * @returns 配置页节点.
 */
export function LimitTimeoutSection({ scope }: LimitTimeoutSectionProps): React.ReactNode {
  const handle = useSettingsDraft(scope)
  const { draft, status, dirty } = handle

  return (
    <section className={SECTION_CLASS}>
      <h2 className={SECTION_TITLE_CLASS}>等待上限</h2>
      <p className={DESC_CLASS}>
        限制 agent 在单次工具调用里可以让调用方等待多久. bash 的 timeoutMs 与 job_output 的 timeout_ms
        都受这里约束, 超出上限的调用在真正执行前被拒绝, 理由会提示模型改用后台执行或向你申请提升.
        改动只在点击保存后生效.
      </p>
      <div className={CARD_CLASS}>
        <div className={FIELD_CLASS}>
          <div className={ROW_COPY_CLASS}>
            <div className={TITLE_CLASS}>全局默认等待上限</div>
            <div className={DESC_CLASS}>
              支持 120000, 90s, 2m, 1h 等写法, 省略单位按毫秒. 默认 {formatMsHint(DEFAULT_LIMIT_MS)},
              与 General 设置里的那一行是同一个值.
            </div>
          </div>
          <DurationInput
            value={draft.durations[DEFAULT_LIMIT_FIELD]}
            error={handle.durationError(DEFAULT_LIMIT_FIELD)}
            ariaLabel="全局默认等待上限"
            onInput={(next) => { handle.setDuration(DEFAULT_LIMIT_FIELD, next) }}
          />
        </div>
        <div className={FIELD_CLASS}>
          <div className={ROW_COPY_CLASS}>
            <div className={TITLE_CLASS}>硬天花板</div>
            <div className={DESC_CLASS}>
              支持 120000, 90s, 2m, 1h 等写法, 省略单位按毫秒. 默认 {formatMsHint(DEFAULT_HARD_LIMIT_MS)}.
              即使你批准了模型的提升申请, 实际等待也不会超过这个值; 调低它会立刻收回已批准的提升.
            </div>
          </div>
          <DurationInput
            value={draft.durations[HARD_LIMIT_FIELD]}
            error={handle.durationError(HARD_LIMIT_FIELD)}
            ariaLabel="硬天花板"
            onInput={(next) => { handle.setDuration(HARD_LIMIT_FIELD, next) }}
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
              checked={draft.flags[ALLOW_ESCALATION_FIELD]}
              onChange={(event) => { handle.setFlag(ALLOW_ESCALATION_FIELD, event.currentTarget.checked) }}
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
              checked={draft.flags[REQUIRE_EXPLICIT_JOB_WAIT_FIELD]}
              onChange={(event) => {
                handle.setFlag(REQUIRE_EXPLICIT_JOB_WAIT_FIELD, event.currentTarget.checked)
              }}
            />
            要求
          </label>
        </div>
        <div className={FIELD_CLASS}>
          <div className={ROW_COPY_CLASS}>
            <div className={TITLE_CLASS}>屏蔽重复调用提醒</div>
            <div className={DESC_CLASS}>
              开启后 repeat-tool-reminder 注入的重复工具调用提醒不再进入模型请求; 会话日志仍保留这些记录,
              只是模型看不到.
            </div>
          </div>
          <label className={TOGGLE_CLASS}>
            <input
              type="checkbox"
              checked={draft.flags[SUPPRESS_REPEAT_REMINDER_FIELD]}
              onChange={(event) => {
                handle.setFlag(SUPPRESS_REPEAT_REMINDER_FIELD, event.currentTarget.checked)
              }}
            />
            屏蔽
          </label>
        </div>
      </div>
      <div className={ACTIONS_CLASS}>
        <button
          type="button"
          className={`${BTN_CLASS} ${BTN_PRIMARY_CLASS}`}
          disabled={!dirty || status.kind === 'saving'}
          onClick={handle.save}
        >
          {status.kind === 'saving' ? '保存中...' : '保存'}
        </button>
        <button
          type="button"
          className={BTN_CLASS}
          disabled={!dirty || status.kind === 'saving'}
          onClick={handle.discard}
        >
          放弃更改
        </button>
        <span className={STATUS_CLASS}>
          {status.kind === 'saved' && !dirty ? '已保存, 立即生效' : ''}
          {dirty ? '有未保存的更改' : ''}
        </span>
      </div>
      {status.kind === 'error' ? <div className={ERROR_CLASS}>保存失败: {status.message}</div> : null}
      <ul className={HINT_CLASS}>
        <li>被拒绝的调用会收到明确的错误信息, 模型据此降低等待时间, 改用后台执行或者提出申请.</li>
        <li>提升按会话记录: 新会话与进程重启后回到这里的全局默认值.</li>
        <li>等待参数名同时匹配 timeoutMs 与 timeout_ms, 因此 bash, pwsh 与 job_output 都被覆盖.</li>
        <li>屏蔽重复调用提醒只改变模型看到的内容, 不影响会话日志与历史回放.</li>
      </ul>
    </section>
  )
}
