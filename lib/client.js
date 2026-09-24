window.__ModuleLoader__.load({
	id: "dsh-limit-timeout",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/shared.ts
		/**
		* Host 与 Client 共享的标识, 字段名, 默认值与解码逻辑. 两侧都从这里导入,
		* 避免各自复制字符串常量.
		* @module dsh-limit-timeout/shared
		*/
		/** 插件标识: settings namespace, patch row id 与 client 注册 id 三者一致. */
		const PLUGIN_ID = "dsh-limit-timeout";
		/** 全局默认允许等待上限 (毫秒) 的字段名. */
		const DEFAULT_LIMIT_FIELD = "defaultLimitMs";
		/** 硬天花板 (毫秒) 的字段名: 会话提升也不可超越. */
		const HARD_LIMIT_FIELD = "hardLimitMs";
		/** 是否允许模型在会话中申请提升的字段名. */
		const ALLOW_ESCALATION_FIELD = "allowEscalation";
		/** job_output 的 wait 是否必须显式给出 timeout_ms 的字段名. */
		const REQUIRE_EXPLICIT_JOB_WAIT_FIELD = "requireExplicitJobWaitMs";
		/** 是否屏蔽重复工具调用提醒注入的字段名. */
		const SUPPRESS_REPEAT_REMINDER_FIELD = "suppressRepeatToolReminders";
		/** 全局默认等待上限: 2 分钟. */
		const DEFAULT_LIMIT_MS = 12e4;
		/** 硬天花板默认值: 30 分钟. */
		const DEFAULT_HARD_LIMIT_MS = 18e5;
		//#endregion
		//#region src/client/locales.ts
		/** 本插件字典的命名空间, 与包名一致. */
		const NS = "dsh-limit-timeout";
		/** English copy. */
		const en = {
			description: "Cap how long one tool call may wait, and how far the model may raise it per session.",
			defaultLimit: "Default wait limit (ms)",
			defaultLimitHint: "How long one tool call may wait unless the session raises it.",
			hardLimit: "Hard ceiling (ms)",
			hardLimitHint: "The ceiling no session raise may exceed; it must not be below the default limit.",
			allowEscalation: "Allow per-session raises",
			allowEscalationHint: "Let the model ask you to raise the limit for the current session.",
			requireExplicitJobWait: "Require an explicit job wait",
			requireExplicitJobWaitHint: "Every job_output wait must name its timeout_ms instead of taking the default.",
			suppressRepeatReminder: "Suppress repeat-call reminders",
			suppressRepeatReminderHint: "Stop injecting the reminder that a tool call was repeated.",
			overridden: "Overridden",
			reset: "Reset to default",
			invalidNumber: "Enter a whole number of milliseconds, or leave blank to use the default.",
			readOnly: "This deployment stores settings read-only.",
			unavailable: "This plugin is not loaded, so it cannot be configured right now.",
			save: "Save",
			saving: "Saving...",
			saveFailed: "The deployment did not accept these values; they were left for you to correct."
		};
		/** Simplified Chinese copy. */
		const zh = {
			description: "限制单次工具调用能让调用方等待多久, 以及模型在会话里最多能提升到多少.",
			defaultLimit: "默认等待上限 (毫秒)",
			defaultLimitHint: "没有会话提升时, 单次工具调用最多等待多久.",
			hardLimit: "硬天花板 (毫秒)",
			hardLimitHint: "任何会话提升都不得超过它; 不能低于默认等待上限.",
			allowEscalation: "允许会话内提升",
			allowEscalationHint: "允许模型向你申请为当前会话提高上限.",
			requireExplicitJobWait: "必须显式给出等待时长",
			requireExplicitJobWaitHint: "job_output 的每次等待都必须写明 timeout_ms, 不能取默认值.",
			suppressRepeatReminder: "屏蔽重复调用提醒",
			suppressRepeatReminderHint: "不再注入 \"同一工具调用被重复\" 的提醒.",
			overridden: "已覆盖",
			reset: "恢复默认",
			invalidNumber: "请填整数毫秒数; 留空表示使用默认值.",
			readOnly: "本部署的设置为只读.",
			unavailable: "该插件当前未加载, 暂时无法配置.",
			save: "保存",
			saving: "保存中...",
			saveFailed: "本部署没有接受这些值, 已保留供你修改."
		};
		/**
		* 表单框架要的文案, 从本插件字典取.
		* @param t - 本插件字典的读取函数.
		* @returns 共享设置表单渲染的标签.
		*/
		function formLabels(t) {
			return {
				unavailable: t("unavailable"),
				readOnly: t("readOnly"),
				saveFailed: t("saveFailed"),
				save: t("save"),
				saving: t("saving")
			};
		}
		//#endregion
		//#region src/client/fields.tsx
		/**
		* 配置卡片里的开关字段行: 官方 SettingsForm 内的一行 (标签, 覆盖标记, 重置, 官方 Switch, 说明).
		*
		* 官方字段控件只覆盖文本与数字, 布尔字段由这里用官方 Switch 拼出,
		* 排版沿用官方 fields.module.css 的尺寸与间距.
		*/
		/**
		* 渲染一行开关字段.
		* @param props - 字段文案, 当前值与动作.
		* @returns 该字段行.
		*/
		function SwitchField(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-lt-field",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-lt-head",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-lt-label",
							id: `${props.id}-label`,
							children: props.label
						}),
						props.overridden ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dsh-lt-badges",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
								tone: "neutral",
								children: props.overriddenLabel
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-lt-reset",
								disabled: props.disabled,
								onClick: props.onReset,
								children: props.resetLabel
							})]
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
							checked: props.checked,
							label: props.label,
							disabled: props.disabled,
							onChange: props.onToggle
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dsh-lt-hint",
					children: props.hint
				})]
			});
		}
		//#endregion
		//#region src/client/format.ts
		/**
		* Client 侧的时长格式化: 把毫秒数说成人话, 用在字段说明里.
		* @module dsh-limit-timeout/client/format
		*/
		/** 毫秒数的中文可读形态, 用在说明文字里. */
		function formatMsHint(ms) {
			if (ms % 36e5 === 0) return `${String(ms / 36e5)} 小时`;
			if (ms % 6e4 === 0) return `${String(ms / 6e4)} 分钟`;
			if (ms % 1e3 === 0) return `${String(ms / 1e3)} 秒`;
			return `${String(ms)} 毫秒`;
		}
		//#endregion
		//#region src/client/settings-card.tsx
		/**
		* 草稿文本对应的毫秒数, 空或非法时退回给定的默认值.
		* @param text - 字段草稿文本.
		* @param fallback - 回退用的毫秒数.
		* @returns 用于说明文字的毫秒数.
		*/
		function draftMs(text, fallback) {
			const trimmed = text.trim();
			if (trimmed === "") return fallback;
			const parsed = Number(trimmed);
			return Number.isFinite(parsed) ? parsed : fallback;
		}
		/**
		* 渲染卡片的一行简介或配置表单, 由插件页的 view 决定.
		* @param props - 页面要的视图, 字典, 表单快照与动作.
		* @returns 简介文本或配置表单.
		*/
		function LimitTimeoutSettingsCard(props) {
			const { t } = props;
			const state = props.useLimitTimeoutCard((snapshot) => snapshot);
			if (props.view === "summary") return t("description");
			const disabled = !state.writable;
			const switchField = (id, label, hint, fieldName, fieldState) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SwitchField, {
				id,
				label,
				hint,
				checked: fieldState.text === "true",
				overridden: fieldState.overridden,
				overriddenLabel: t("overridden"),
				resetLabel: t("reset"),
				disabled,
				onToggle: (next) => {
					props.edit(fieldName, next ? "true" : "false");
				},
				onReset: () => {
					props.resetField(fieldName);
				}
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.SettingsForm, {
				labels: formLabels(t),
				state,
				onSave: props.save,
				onDiscard: props.discard,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SettingsValueField, {
						id: "plugin-config-limit-timeout-default",
						label: t("defaultLimit"),
						hint: t("defaultLimitHint") + " (" + formatMsHint(draftMs(state.defaultLimitMs.text, DEFAULT_LIMIT_MS)) + ")",
						overriddenLabel: t("overridden"),
						resetLabel: t("reset"),
						invalidLabel: t("invalidNumber"),
						numeric: true,
						disabled,
						...state.defaultLimitMs,
						onEdit: (text) => {
							props.edit(DEFAULT_LIMIT_FIELD, text);
						},
						onReset: () => {
							props.resetField(DEFAULT_LIMIT_FIELD);
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SettingsValueField, {
						id: "plugin-config-limit-timeout-hard",
						label: t("hardLimit"),
						hint: t("hardLimitHint") + " (" + formatMsHint(draftMs(state.hardLimitMs.text, DEFAULT_HARD_LIMIT_MS)) + ")",
						overriddenLabel: t("overridden"),
						resetLabel: t("reset"),
						invalidLabel: t("invalidNumber"),
						numeric: true,
						disabled,
						...state.hardLimitMs,
						onEdit: (text) => {
							props.edit(HARD_LIMIT_FIELD, text);
						},
						onReset: () => {
							props.resetField(HARD_LIMIT_FIELD);
						}
					}),
					switchField("plugin-config-limit-timeout-escalation", t("allowEscalation"), t("allowEscalationHint"), ALLOW_ESCALATION_FIELD, state.allowEscalation),
					switchField("plugin-config-limit-timeout-explicit-wait", t("requireExplicitJobWait"), t("requireExplicitJobWaitHint"), REQUIRE_EXPLICIT_JOB_WAIT_FIELD, state.requireExplicitJobWait),
					switchField("plugin-config-limit-timeout-repeat", t("suppressRepeatReminder"), t("suppressRepeatReminderHint"), SUPPRESS_REPEAT_REMINDER_FIELD, state.suppressRepeatReminder)
				]
			});
		}
		//#endregion
		//#region src/client/settings-form.ts
		/**
		* 布尔字段的草稿编码: 官方模型只解析文本字段, 布尔值以 `true` / `false` 暂存.
		* @param field - 字段名.
		* @returns 该字段的转换描述.
		*/
		function settingsBooleanField(field) {
			return {
				field,
				format: (value) => typeof value === "boolean" ? String(value) : "",
				parse: (text) => text === "true" ? {
					kind: "set",
					value: true
				} : text === "false" ? {
					kind: "set",
					value: false
				} : void 0
			};
		}
		/** 把本插件条目的配置表单桥接成配置卡片的暂存表单. */
		var LimitTimeoutSettingsForm = class {
			form;
			store;
			/**
			* @param scope - 本插件 profile 条目的共享配置表单 (ctx.configForms.get).
			*/
			constructor(scope) {
				this.form = new _deepseek_ai_dsh_client_ui_primitives.SettingsFormModel(scope, [
					(0, _deepseek_ai_dsh_client_ui_primitives.settingsNumberField)(DEFAULT_LIMIT_FIELD),
					(0, _deepseek_ai_dsh_client_ui_primitives.settingsNumberField)(HARD_LIMIT_FIELD),
					settingsBooleanField(ALLOW_ESCALATION_FIELD),
					settingsBooleanField(REQUIRE_EXPLICIT_JOB_WAIT_FIELD),
					settingsBooleanField(SUPPRESS_REPEAT_REMINDER_FIELD)
				]);
				this.store = this.form.bind(() => ({
					...this.form.shell(),
					defaultLimitMs: this.form.field(DEFAULT_LIMIT_FIELD),
					hardLimitMs: this.form.field(HARD_LIMIT_FIELD),
					allowEscalation: this.form.field(ALLOW_ESCALATION_FIELD),
					requireExplicitJobWait: this.form.field(REQUIRE_EXPLICIT_JOB_WAIT_FIELD),
					suppressRepeatReminder: this.form.field(SUPPRESS_REPEAT_REMINDER_FIELD)
				}));
			}
			/**
			* 构造 slot 注册要注入的面.
			* @returns 快照 hook 与表单动作.
			*/
			inject() {
				return {
					hooks: { limitTimeoutCard: this.store },
					...this.form.actions()
				};
			}
			/** 释放对配置表单的订阅. */
			dispose() {
				this.form.dispose();
			}
		};
		//#endregion
		//#region src/client/styles.ts
		/**
		* 配置卡片字段行的样式.
		*
		* 官方 SettingsForm 只覆盖文本与数字字段, 开关字段由本插件的 SwitchField 自绘,
		* 尺寸与间距对齐官方 fields.module.css, 颜色只用 --dsw-alias-* 语义 token.
		* @module dsh-limit-timeout/client/styles
		*/
		/** 样式标签标记. */
		const STYLE_ID = "dsh-limit-timeout-client";
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
`;
		/** 注入卡片字段样式一次; 重复调用为空操作. */
		function installStyles() {
			if (typeof document === "undefined") return;
			if (document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`) !== null) return;
			const style = document.createElement("style");
			style.dataset.pluginCss = STYLE_ID;
			style.textContent = css;
			document.head.appendChild(style);
		}
		//#endregion
		//#region src/client/index.ts
		/** 页面依赖的服务: configForms 提供配置通道, slots 提供注册面, locale 提供字典. */
		const inject = [
			"configForms",
			"slots",
			"locale"
		];
		/**
		* 绑定 profile 条目表单并注册插件页的配置卡片.
		* @param ctx - Web Client 插件上下文.
		*/
		function apply(ctx) {
			installStyles();
			const scope = ctx.configForms.get(PLUGIN_ID);
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-limit-timeout: dictionaries");
			const card = new LimitTimeoutSettingsForm(scope);
			ctx.effect(() => () => {
				card.dispose();
			}, "dsh-limit-timeout: settings form");
			ctx.effect(() => ctx.configForms.whileServed([PLUGIN_ID], () => ctx.slots.inject("plugins.bundle.config", () => ctx.slots.register({
				name: "plugins.bundle.config",
				key: PLUGIN_ID,
				locale: NS,
				inject: () => card.inject()
			}, LimitTimeoutSettingsCard))), "dsh-limit-timeout: plugins page card");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map