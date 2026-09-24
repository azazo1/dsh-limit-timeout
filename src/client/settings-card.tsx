/**
 * 插件页里 dsh-limit-timeout 卡片的配置页.
 *
 * 页面只在 Host 真的组合了本条目的期间注册 (configForms.whileServed).
 */
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import { SettingsForm, SettingsValueField } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import {
  ALLOW_ESCALATION_FIELD,
  DEFAULT_HARD_LIMIT_MS,
  DEFAULT_LIMIT_FIELD,
  DEFAULT_LIMIT_MS,
  HARD_LIMIT_FIELD,
  REQUIRE_EXPLICIT_JOB_WAIT_FIELD,
  SUPPRESS_REPEAT_REMINDER_FIELD,
} from '../shared.ts'
import { SwitchField } from './fields.tsx'
import { formatMsHint } from './format.ts'
import { formLabels } from './locales.ts'
import type { LimitTimeoutCardFace } from './settings-form.ts'

/** 组件拿到的 props. */
export type LimitTimeoutSettingsCardProps =
  PropsRuntime<'plugins.bundle.config'>
  & PropsLocale<'dsh-limit-timeout'>
  & InjectFace<LimitTimeoutCardFace>

/**
 * 草稿文本对应的毫秒数, 空或非法时退回给定的默认值.
 * @param text - 字段草稿文本.
 * @param fallback - 回退用的毫秒数.
 * @returns 用于说明文字的毫秒数.
 */
function draftMs(text: string, fallback: number): number {
  const trimmed = text.trim()
  if (trimmed === '') return fallback
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : fallback
}

/**
 * 渲染卡片的一行简介或配置表单, 由插件页的 view 决定.
 * @param props - 页面要的视图, 字典, 表单快照与动作.
 * @returns 简介文本或配置表单.
 */
export function LimitTimeoutSettingsCard(props: LimitTimeoutSettingsCardProps) {
  const { t } = props
  const state = props.useLimitTimeoutCard(snapshot => snapshot)
  if (props.view === 'summary') return t('description')
  const disabled = !state.writable

  const switchField = (
    id: string,
    label: string,
    hint: string,
    fieldName: string,
    fieldState: { text: string, overridden: boolean },
  ) => (
    <SwitchField
      id={id}
      label={label}
      hint={hint}
      checked={fieldState.text === 'true'}
      overridden={fieldState.overridden}
      overriddenLabel={t('overridden')}
      resetLabel={t('reset')}
      disabled={disabled}
      onToggle={(next) => { props.edit(fieldName, next ? 'true' : 'false') }}
      onReset={() => { props.resetField(fieldName) }}
    />
  )

  return (
    <SettingsForm labels={formLabels(t)} state={state} onSave={props.save} onDiscard={props.discard}>
      <SettingsValueField
        id="plugin-config-limit-timeout-default"
        label={t('defaultLimit')}
        hint={t('defaultLimitHint') + ' (' + formatMsHint(draftMs(state.defaultLimitMs.text, DEFAULT_LIMIT_MS)) + ')'}
        overriddenLabel={t('overridden')}
        resetLabel={t('reset')}
        invalidLabel={t('invalidNumber')}
        numeric
        disabled={disabled}
        {...state.defaultLimitMs}
        onEdit={(text) => { props.edit(DEFAULT_LIMIT_FIELD, text) }}
        onReset={() => { props.resetField(DEFAULT_LIMIT_FIELD) }}
      />
      <SettingsValueField
        id="plugin-config-limit-timeout-hard"
        label={t('hardLimit')}
        hint={t('hardLimitHint') + ' (' + formatMsHint(draftMs(state.hardLimitMs.text, DEFAULT_HARD_LIMIT_MS)) + ')'}
        overriddenLabel={t('overridden')}
        resetLabel={t('reset')}
        invalidLabel={t('invalidNumber')}
        numeric
        disabled={disabled}
        {...state.hardLimitMs}
        onEdit={(text) => { props.edit(HARD_LIMIT_FIELD, text) }}
        onReset={() => { props.resetField(HARD_LIMIT_FIELD) }}
      />
      {switchField(
        'plugin-config-limit-timeout-escalation',
        t('allowEscalation'),
        t('allowEscalationHint'),
        ALLOW_ESCALATION_FIELD,
        state.allowEscalation,
      )}
      {switchField(
        'plugin-config-limit-timeout-explicit-wait',
        t('requireExplicitJobWait'),
        t('requireExplicitJobWaitHint'),
        REQUIRE_EXPLICIT_JOB_WAIT_FIELD,
        state.requireExplicitJobWait,
      )}
      {switchField(
        'plugin-config-limit-timeout-repeat',
        t('suppressRepeatReminder'),
        t('suppressRepeatReminderHint'),
        SUPPRESS_REPEAT_REMINDER_FIELD,
        state.suppressRepeatReminder,
      )}
    </SettingsForm>
  )
}
