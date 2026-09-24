/**
 * 配置卡片里的开关字段行: 官方 SettingsForm 内的一行 (标签, 覆盖标记, 重置, 官方 Switch, 说明).
 *
 * 官方字段控件只覆盖文本与数字, 布尔字段由这里用官方 Switch 拼出,
 * 排版沿用官方 fields.module.css 的尺寸与间距.
 */
import { Switch, Tag } from '@deepseek-ai/dsh-client-ui-primitives'

/** 开关字段行的 props. */
export interface SwitchFieldProps {
  /** 标签与控件的关联 id. */
  id: string
  /** 已本地化的字段标签. */
  label: string
  /** 字段说明. */
  hint: string
  /** 当前草稿值. */
  checked: boolean
  /** 保存后该字段是否留下 user 层条目. */
  overridden: boolean
  /** 覆盖标记的文案. */
  overriddenLabel: string
  /** 重置控件的文案. */
  resetLabel: string
  /** 只读或保存中时锁定控件. */
  disabled: boolean
  /** 切换开关. */
  onToggle: (next: boolean) => void
  /** 暂存清空该字段, 保存后回落到组合层. */
  onReset: () => void
}

/**
 * 渲染一行开关字段.
 * @param props - 字段文案, 当前值与动作.
 * @returns 该字段行.
 */
export function SwitchField(props: SwitchFieldProps) {
  return (
    <div className="dsh-lt-field">
      <div className="dsh-lt-head">
        <span className="dsh-lt-label" id={`${props.id}-label`}>{props.label}</span>
        {props.overridden
          ? (
            <span className="dsh-lt-badges">
              <Tag tone="neutral">{props.overriddenLabel}</Tag>
              <button
                type="button"
                className="dsh-lt-reset"
                disabled={props.disabled}
                onClick={props.onReset}
              >
                {props.resetLabel}
              </button>
            </span>
          )
          : null}
        <Switch
          checked={props.checked}
          label={props.label}
          disabled={props.disabled}
          onChange={props.onToggle}
        />
      </div>
      <p className="dsh-lt-hint">{props.hint}</p>
    </div>
  )
}
