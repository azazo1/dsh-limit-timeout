/** `dsh-limit-timeout` 插件页配置卡片的文案. */
import type { SettingsFormLabels } from '@deepseek-ai/dsh-client-ui-primitives'

/** 本插件字典的命名空间, 与包名一致. */
export const NS = 'dsh-limit-timeout'

/** 本插件用到的文案键. */
export type LimitTimeoutKey =
  | 'description'
  | 'defaultLimit' | 'defaultLimitHint'
  | 'hardLimit' | 'hardLimitHint'
  | 'allowEscalation' | 'allowEscalationHint'
  | 'requireExplicitJobWait' | 'requireExplicitJobWaitHint'
  | 'suppressRepeatReminder' | 'suppressRepeatReminderHint'
  | 'overridden' | 'reset' | 'invalidNumber'
  | 'readOnly' | 'unavailable' | 'save' | 'saving' | 'saveFailed'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** 本插件配置卡片的文案. */
    'dsh-limit-timeout': LimitTimeoutKey
  }
}

/** English copy. */
export const en: Record<LimitTimeoutKey, string> = {
  description: 'Cap how long one tool call may wait, and how far the model may raise it per session.',
  defaultLimit: 'Default wait limit (ms)',
  defaultLimitHint: 'How long one tool call may wait unless the session raises it.',
  hardLimit: 'Hard ceiling (ms)',
  hardLimitHint: 'The ceiling no session raise may exceed; it must not be below the default limit.',
  allowEscalation: 'Allow per-session raises',
  allowEscalationHint: 'Let the model ask you to raise the limit for the current session.',
  requireExplicitJobWait: 'Require an explicit job wait',
  requireExplicitJobWaitHint: 'Every job_output wait must name its timeout_ms instead of taking the default.',
  suppressRepeatReminder: 'Suppress repeat-call reminders',
  suppressRepeatReminderHint: 'Stop injecting the reminder that a tool call was repeated.',
  overridden: 'Overridden',
  reset: 'Reset to default',
  invalidNumber: 'Enter a whole number of milliseconds, or leave blank to use the default.',
  readOnly: 'This deployment stores settings read-only.',
  unavailable: 'This plugin is not loaded, so it cannot be configured right now.',
  save: 'Save',
  saving: 'Saving...',
  saveFailed: 'The deployment did not accept these values; they were left for you to correct.',
}

/** Simplified Chinese copy. */
export const zh: Record<LimitTimeoutKey, string> = {
  description: '限制单次工具调用能让调用方等待多久, 以及模型在会话里最多能提升到多少.',
  defaultLimit: '默认等待上限 (毫秒)',
  defaultLimitHint: '没有会话提升时, 单次工具调用最多等待多久.',
  hardLimit: '硬天花板 (毫秒)',
  hardLimitHint: '任何会话提升都不得超过它; 不能低于默认等待上限.',
  allowEscalation: '允许会话内提升',
  allowEscalationHint: '允许模型向你申请为当前会话提高上限.',
  requireExplicitJobWait: '必须显式给出等待时长',
  requireExplicitJobWaitHint: 'job_output 的每次等待都必须写明 timeout_ms, 不能取默认值.',
  suppressRepeatReminder: '屏蔽重复调用提醒',
  suppressRepeatReminderHint: '不再注入 "同一工具调用被重复" 的提醒.',
  overridden: '已覆盖',
  reset: '恢复默认',
  invalidNumber: '请填整数毫秒数; 留空表示使用默认值.',
  readOnly: '本部署的设置为只读.',
  unavailable: '该插件当前未加载, 暂时无法配置.',
  save: '保存',
  saving: '保存中...',
  saveFailed: '本部署没有接受这些值, 已保留供你修改.',
}

/**
 * 表单框架要的文案, 从本插件字典取.
 * @param t - 本插件字典的读取函数.
 * @returns 共享设置表单渲染的标签.
 */
export function formLabels(t: (key: LimitTimeoutKey) => string): SettingsFormLabels {
  return {
    unavailable: t('unavailable'),
    readOnly: t('readOnly'),
    saveFailed: t('saveFailed'),
    save: t('save'),
    saving: t('saving'),
  }
}
