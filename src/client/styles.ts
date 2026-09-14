/**
 * 设置界面样式: 与 DSH Settings 现有视觉一致的主题 token, 用 data-plugin-css
 * 标记注入一次.
 * @module dsh-limit-timeout/client/styles
 */

/** 样式标签标记. */
const STYLE_ID = 'dsh-limit-timeout-client'

/** 通用设置行的类名. */
export const ROW_CLASS = 'dsh-lt-row'
/** 通用设置行的文案容器类名. */
export const ROW_COPY_CLASS = 'dsh-lt-row-copy'
/** 字段标题类名. */
export const TITLE_CLASS = 'dsh-lt-title'
/** 字段描述类名. */
export const DESC_CLASS = 'dsh-lt-desc'
/** 数字输入框类名. */
export const INPUT_CLASS = 'dsh-lt-input'
/** 输入框与其错误提示的容器类名. */
export const INPUT_COL_CLASS = 'dsh-lt-input-col'
/** 保存与放弃按钮所在行类名. */
export const ACTIONS_CLASS = 'dsh-lt-actions'
/** 次要按钮类名. */
export const BTN_CLASS = 'dsh-lt-btn'
/** 主要按钮类名. */
export const BTN_PRIMARY_CLASS = 'dsh-lt-btn-primary'
/** 独立设置页容器类名. */
export const SECTION_CLASS = 'dsh-lt-section'
/** 独立设置页标题类名. */
export const SECTION_TITLE_CLASS = 'dsh-lt-section-title'
/** 卡片类名. */
export const CARD_CLASS = 'dsh-lt-card'
/** 卡片内字段行类名. */
export const FIELD_CLASS = 'dsh-lt-field'
/** 开关行类名. */
export const TOGGLE_CLASS = 'dsh-lt-toggle'
/** 状态文本类名. */
export const STATUS_CLASS = 'dsh-lt-status'
/** 错误文本类名. */
export const ERROR_CLASS = 'dsh-lt-error'
/** 说明列表类名. */
export const HINT_CLASS = 'dsh-lt-hint'

const CSS_TEXT = `
.${ROW_CLASS} { display: flex; align-items: center; gap: 8px; padding: 16px 0; border-bottom: 1px solid var(--dsw-alias-border-l2); }
.${ROW_COPY_CLASS} { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
.${TITLE_CLASS} { font-size: 13px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.${DESC_CLASS} { font-size: 12px; line-height: 1.6; color: var(--dsw-alias-label-tertiary); }
.${INPUT_CLASS} { width: 132px; height: 36px; box-sizing: border-box; padding: 0 12px; border-radius: 18px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-module-platform); color: var(--dsw-alias-label-primary); font-size: 13px; text-align: right; }
.${INPUT_CLASS}:hover { border-color: var(--dsw-alias-label-tertiary); }
.${INPUT_CLASS}:focus { outline: none; border-color: var(--dsw-alias-brand-primary); }
.${INPUT_COL_CLASS} { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.${ACTIONS_CLASS} { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 4px 0 0; }
.${BTN_CLASS} { height: 30px; padding: 0 14px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-module-platform); color: var(--dsw-alias-label-primary); font-size: 13px; cursor: pointer; }
.${BTN_CLASS}:hover:not(:disabled) { border-color: var(--dsw-alias-brand-primary); }
.${BTN_CLASS}:disabled { opacity: 0.45; cursor: default; }
.${BTN_PRIMARY_CLASS} { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); }
.${SECTION_CLASS} { max-width: 760px; display: flex; flex-direction: column; gap: 12px; }
.${SECTION_TITLE_CLASS} { margin: 0; font-size: 18px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.${CARD_CLASS} { display: flex; flex-direction: column; background: var(--dsw-alias-bg-layer-3); border: 1px solid var(--dsw-alias-border-l2); border-radius: 12px; padding: 0 12px; }
.${FIELD_CLASS} { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-top: 1px solid var(--dsw-alias-border-l2); }
.${FIELD_CLASS}:first-child { border-top: none; }
.${TOGGLE_CLASS} { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--dsw-alias-label-primary); cursor: pointer; }
.${TOGGLE_CLASS} input { width: 15px; height: 15px; margin: 0; accent-color: var(--dsw-alias-brand-primary); cursor: pointer; }
.${STATUS_CLASS} { font-size: 12px; color: var(--dsw-alias-label-tertiary); }
.${ERROR_CLASS} { font-size: 12px; color: var(--dsw-alias-brand-primary); }
.${HINT_CLASS} { margin: 0; padding: 0 0 0 16px; font-size: 12px; line-height: 1.7; color: var(--dsw-alias-label-tertiary); }
.${HINT_CLASS} code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: var(--dsw-alias-label-primary); }
@media (max-width: 560px) {
  .${ROW_CLASS} { flex-direction: column; align-items: stretch; }
  .${INPUT_CLASS} { width: 100%; }
}
`

/** 注入页面样式 (重复调用只插入一次). */
export function installStyles(): void {
  if (typeof document === 'undefined') return
  if (document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`) !== null) return
  const tag = document.createElement('style')
  tag.dataset.pluginCss = STYLE_ID
  tag.textContent = CSS_TEXT
  document.head.appendChild(tag)
}
