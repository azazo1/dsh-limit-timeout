/**
 * 配置卡片字段行的样式.
 *
 * 官方 SettingsForm 只覆盖文本与数字字段, 开关字段由本插件的 SwitchField 自绘,
 * 尺寸与间距对齐官方 fields.module.css, 颜色只用 --dsw-alias-* 语义 token.
 * @module dsh-limit-timeout/client/styles
 */

/** 样式标签标记. */
const STYLE_ID = 'dsh-limit-timeout-client'

const css = `
.dsh-lt-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 0;
}
.dsh-lt-field + .dsh-lt-field {
  border-top: 0.5px solid var(--dsw-alias-border-l2);
}
.dsh-lt-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dsh-lt-label {
  flex: 1;
  min-width: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
}
.dsh-lt-badges {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.dsh-lt-reset {
  padding: 0;
  border: none;
  background: none;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12px;
  line-height: 1.5;
  cursor: pointer;
}
.dsh-lt-reset:hover:not(:disabled) {
  color: var(--dsw-alias-label-primary);
}
.dsh-lt-reset:disabled {
  cursor: default;
}
.dsh-lt-hint {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 1.5;
}
`

/** 注入卡片字段样式一次; 重复调用为空操作. */
export function installStyles(): void {
  if (typeof document === 'undefined') return
  if (document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`) !== null) return
  const style = document.createElement('style')
  style.dataset.pluginCss = STYLE_ID
  style.textContent = css
  document.head.appendChild(style)
}
