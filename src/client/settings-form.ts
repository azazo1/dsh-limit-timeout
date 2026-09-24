/**
 * dsh-limit-timeout 配置卡片的暂存表单.
 *
 * 表单是 profile 条目 volatile Config 的投影: 草稿只留在卡片页, 保存才写回 profile 的 patch 层.
 */
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import {
  SettingsFormModel, settingsNumberField,
  type SettingsFieldSpec, type SettingsFieldState, type SettingsFormActions,
  type SettingsFormScope, type SettingsFormShell,
} from '@deepseek-ai/dsh-client-ui-primitives'
import {
  ALLOW_ESCALATION_FIELD,
  DEFAULT_LIMIT_FIELD,
  HARD_LIMIT_FIELD,
  REQUIRE_EXPLICIT_JOB_WAIT_FIELD,
  SUPPRESS_REPEAT_REMINDER_FIELD,
  type LimitTimeoutSettings,
} from '../shared.ts'

/**
 * 布尔字段的草稿编码: 官方模型只解析文本字段, 布尔值以 `true` / `false` 暂存.
 * @param field - 字段名.
 * @returns 该字段的转换描述.
 */
function settingsBooleanField(field: string): SettingsFieldSpec {
  return {
    field,
    format: value => typeof value === 'boolean' ? String(value) : '',
    parse: text => text === 'true'
      ? { kind: 'set', value: true }
      : text === 'false'
        ? { kind: 'set', value: false }
        : undefined,
  }
}

/** 卡片读到的状态. */
export interface LimitTimeoutCardState extends SettingsFormShell {
  /** 默认等待上限字段. */
  defaultLimitMs: SettingsFieldState
  /** 硬天花板字段. */
  hardLimitMs: SettingsFieldState
  /** 是否允许会话内提升. */
  allowEscalation: SettingsFieldState
  /** 是否要求显式等待时长. */
  requireExplicitJobWait: SettingsFieldState
  /** 是否屏蔽重复调用提醒. */
  suppressRepeatReminder: SettingsFieldState
}

/** 卡片注册时注入给组件的面. */
export interface LimitTimeoutCardFace extends SettingsFormActions {
  hooks: {
    /** 组件通过它读快照 (useLimitTimeoutCard). */
    limitTimeoutCard: SnapshotStore<LimitTimeoutCardState>
  }
}

/** 把本插件条目的配置表单桥接成配置卡片的暂存表单. */
export class LimitTimeoutSettingsForm {
  private readonly form: SettingsFormModel<LimitTimeoutSettings>
  private readonly store: SnapshotStore<LimitTimeoutCardState>

  /**
   * @param scope - 本插件 profile 条目的共享配置表单 (ctx.configForms.get).
   */
  constructor(scope: SettingsFormScope<LimitTimeoutSettings>) {
    this.form = new SettingsFormModel(scope, [
      settingsNumberField(DEFAULT_LIMIT_FIELD),
      settingsNumberField(HARD_LIMIT_FIELD),
      settingsBooleanField(ALLOW_ESCALATION_FIELD),
      settingsBooleanField(REQUIRE_EXPLICIT_JOB_WAIT_FIELD),
      settingsBooleanField(SUPPRESS_REPEAT_REMINDER_FIELD),
    ])
    this.store = this.form.bind(() => ({
      ...this.form.shell(),
      defaultLimitMs: this.form.field(DEFAULT_LIMIT_FIELD),
      hardLimitMs: this.form.field(HARD_LIMIT_FIELD),
      allowEscalation: this.form.field(ALLOW_ESCALATION_FIELD),
      requireExplicitJobWait: this.form.field(REQUIRE_EXPLICIT_JOB_WAIT_FIELD),
      suppressRepeatReminder: this.form.field(SUPPRESS_REPEAT_REMINDER_FIELD),
    }))
  }

  /**
   * 构造 slot 注册要注入的面.
   * @returns 快照 hook 与表单动作.
   */
  inject(): LimitTimeoutCardFace {
    return { hooks: { limitTimeoutCard: this.store }, ...this.form.actions() }
  }

  /** 释放对配置表单的订阅. */
  dispose(): void {
    this.form.dispose()
  }
}
