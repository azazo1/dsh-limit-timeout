window.__ModuleLoader__.load({
	id: "dsh-limit-timeout",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
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
		/** 上限字段允许的最小值 (1 秒): 再小会让工具调用失去意义. */
		const MIN_LIMIT_MS = 1e3;
		/** 上限字段允许的最大值 (24 小时): 防止误填造成实质上的无限等待. */
		const MAX_LIMIT_MS = 864e5;
		/** 全局默认等待上限: 2 分钟. */
		const DEFAULT_LIMIT_MS = 12e4;
		/** 硬天花板默认值: 30 分钟. */
		const DEFAULT_HARD_LIMIT_MS = 18e5;
		/** 未注册 settings namespace 或用户未保存过时的生效值. */
		const DEFAULT_SETTINGS = {
			defaultLimitMs: DEFAULT_LIMIT_MS,
			hardLimitMs: DEFAULT_HARD_LIMIT_MS,
			allowEscalation: true,
			requireExplicitJobWaitMs: false,
			suppressRepeatToolReminders: false
		};
		//#endregion
		//#region src/client/styles.ts
		/**
		* 设置界面样式: 与 DSH Settings 现有视觉一致的主题 token, 用 data-plugin-css
		* 标记注入一次.
		* @module dsh-limit-timeout/client/styles
		*/
		/** 样式标签标记. */
		const STYLE_ID = "dsh-limit-timeout-client";
		/** 通用设置行的文案容器类名. */
		const ROW_COPY_CLASS = "dsh-lt-row-copy";
		/** 字段标题类名. */
		const TITLE_CLASS = "dsh-lt-title";
		/** 字段描述类名. */
		const DESC_CLASS = "dsh-lt-desc";
		/** 数字输入框类名. */
		const INPUT_CLASS = "dsh-lt-input";
		/** 输入框与其错误提示的容器类名. */
		const INPUT_COL_CLASS = "dsh-lt-input-col";
		/** 保存与放弃按钮所在行类名. */
		const ACTIONS_CLASS = "dsh-lt-actions";
		/** 次要按钮类名. */
		const BTN_CLASS = "dsh-lt-btn";
		/** 主要按钮类名. */
		const BTN_PRIMARY_CLASS = "dsh-lt-btn-primary";
		/** 独立设置页容器类名. */
		const SECTION_CLASS = "dsh-lt-section";
		/** 独立设置页标题类名. */
		const SECTION_TITLE_CLASS = "dsh-lt-section-title";
		/** 卡片类名. */
		const CARD_CLASS = "dsh-lt-card";
		/** 卡片内字段行类名. */
		const FIELD_CLASS = "dsh-lt-field";
		/** 开关行类名. */
		const TOGGLE_CLASS = "dsh-lt-toggle";
		/** 状态文本类名. */
		const STATUS_CLASS = "dsh-lt-status";
		/** 错误文本类名. */
		const ERROR_CLASS = "dsh-lt-error";
		/** 说明列表类名. */
		const HINT_CLASS = "dsh-lt-hint";
		const CSS_TEXT = `
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
  .${INPUT_CLASS} { width: 100%; }
}
`;
		/** 注入页面样式 (重复调用只插入一次). */
		function installStyles() {
			if (typeof document === "undefined") return;
			if (document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`) !== null) return;
			const tag = document.createElement("style");
			tag.dataset.pluginCss = STYLE_ID;
			tag.textContent = CSS_TEXT;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region src/client/duration-input.tsx
		/**
		* 时长输入框: 受控文本输入, 值由上层草稿提供, 错误提示就地展示.
		* @module dsh-limit-timeout/client/duration-input
		*/
		/**
		* 渲染一个时长输入框.
		* @param props - 值与回调.
		* @returns 输入框节点.
		*/
		function DurationInput({ value, error, ariaLabel, onInput }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: INPUT_COL_CLASS,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					className: INPUT_CLASS,
					type: "text",
					value,
					"aria-label": ariaLabel,
					onChange: (event) => {
						onInput(event.currentTarget.value);
					}
				}), error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: ERROR_CLASS,
					children: error
				})]
			});
		}
		//#endregion
		//#region src/client/format.ts
		/**
		* Client 侧的时长解析与格式化: 与 Host 使用同一套取值域常量.
		* @module dsh-limit-timeout/client/format
		*/
		/** 支持的单位后缀及其毫秒数, 省略单位时按毫秒处理. */
		const UNIT_MS = {
			ms: 1,
			s: 1e3,
			m: 6e4,
			h: 36e5
		};
		/** 毫秒数的中文可读形态, 用在说明文字里. */
		function formatMsHint(ms) {
			if (ms % 36e5 === 0) return `${String(ms / 36e5)} 小时`;
			if (ms % 6e4 === 0) return `${String(ms / 6e4)} 分钟`;
			if (ms % 1e3 === 0) return `${String(ms / 1e3)} 秒`;
			return `${String(ms)} 毫秒`;
		}
		/**
		* 毫秒数的输入形态: 整小时写 `1h`, 整分钟写 `2m`, 整秒写 `90s`, 否则写 `1500ms`.
		* 数字字段在未编辑, 保存后与放弃更改后都还原成这种带单位的写法.
		* @param ms - 毫秒数.
		* @returns 便于阅读的输入文本.
		*/
		function formatLimitInput(ms) {
			if (ms % 36e5 === 0) return `${String(ms / 36e5)}h`;
			if (ms % 6e4 === 0) return `${String(ms / 6e4)}m`;
			if (ms % 1e3 === 0) return `${String(ms / 1e3)}s`;
			return `${String(ms)}ms`;
		}
		/**
		* 解析用户输入的时长: 支持纯毫秒数, 也支持 `500ms`, `90s`, `2m`, `1h` 这类带
		* 单位的写法 (单位不区分大小写, 允许小数, 结果四舍五入到整数毫秒).
		* @param text - 输入框文本.
		* @param min - 允许的最小值 (毫秒).
		* @param max - 允许的最大值 (毫秒).
		* @returns 解析结果.
		*/
		function parseLimitInput(text, min, max) {
			const trimmed = text.trim().toLowerCase();
			if (trimmed.length === 0) return {
				ok: false,
				error: "请输入时长, 例如 120000 或 2m"
			};
			const match = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h)?$/.exec(trimmed);
			if (match === null) return {
				ok: false,
				error: "格式为数字加可选单位: ms, s, m, h"
			};
			const amount = Number(match[1]);
			const unit = match[2] ?? "ms";
			const value = Math.round(amount * (UNIT_MS[unit] ?? 1));
			if (!Number.isFinite(value) || value <= 0) return {
				ok: false,
				error: "时长必须大于 0"
			};
			if (value < min) return {
				ok: false,
				error: `不能小于 ${String(min)} 毫秒`
			};
			if (value > max) return {
				ok: false,
				error: `不能大于 ${String(max)} 毫秒`
			};
			return {
				ok: true,
				value
			};
		}
		//#endregion
		//#region src/client/settings-draft.ts
		/**
		* 设置表单的草稿状态: 编辑只改本地草稿, 点保存才一次性写回 Host, 点放弃更改
		* 立即还原成 Host 当前值. 数字字段以带单位的文本保存, 未编辑与保存后都还原成
		* 合适的单位写法.
		* @module dsh-limit-timeout/client/settings-draft
		*/
		/** 以时长文本编辑的字段. */
		const DURATION_FIELDS = [DEFAULT_LIMIT_FIELD, HARD_LIMIT_FIELD];
		/** 以开关编辑的字段. */
		const FLAG_FIELDS = [
			ALLOW_ESCALATION_FIELD,
			REQUIRE_EXPLICIT_JOB_WAIT_FIELD,
			SUPPRESS_REPEAT_REMINDER_FIELD
		];
		/** 从 Host 配置构造一份干净草稿. */
		function draftFrom(settings) {
			return {
				durations: {
					[DEFAULT_LIMIT_FIELD]: formatLimitInput(settings.defaultLimitMs),
					[HARD_LIMIT_FIELD]: formatLimitInput(settings.hardLimitMs)
				},
				flags: {
					[ALLOW_ESCALATION_FIELD]: settings.allowEscalation,
					[REQUIRE_EXPLICIT_JOB_WAIT_FIELD]: settings.requireExplicitJobWaitMs,
					[SUPPRESS_REPEAT_REMINDER_FIELD]: settings.suppressRepeatToolReminders
				}
			};
		}
		/** 两份草稿是否完全一致. */
		function sameDraft(a, b) {
			return DURATION_FIELDS.every((field) => a.durations[field] === b.durations[field]) && FLAG_FIELDS.every((field) => a.flags[field] === b.flags[field]);
		}
		/** 读取 Host 配置里某个开关字段的值. */
		function hostFlag(settings, field) {
			switch (field) {
				case ALLOW_ESCALATION_FIELD: return settings.allowEscalation;
				case REQUIRE_EXPLICIT_JOB_WAIT_FIELD: return settings.requireExplicitJobWaitMs;
				case SUPPRESS_REPEAT_REMINDER_FIELD: return settings.suppressRepeatToolReminders;
				default: return false;
			}
		}
		/**
		* 校验草稿并算出需要写入的字段操作. 只有相对 Host 当前值真正变化的字段才会写,
		* 因此一次保存是一次原子 mutation, 且不会把未动过的字段标记成用户覆盖.
		* @param draft - 当前草稿.
		* @param settings - Host 当前生效配置.
		* @returns 保存计划, 或第一条校验错误.
		*/
		function buildSavePlan(draft, settings) {
			const hard = parseLimitInput(draft.durations[HARD_LIMIT_FIELD], MIN_LIMIT_MS, MAX_LIMIT_MS);
			if (!hard.ok) return {
				ok: false,
				error: `硬天花板: ${hard.error}`
			};
			const fallback = parseLimitInput(draft.durations[DEFAULT_LIMIT_FIELD], MIN_LIMIT_MS, hard.value);
			if (!fallback.ok) return {
				ok: false,
				error: `全局默认等待上限: ${fallback.error}`
			};
			const ops = [];
			if (fallback.value !== settings.defaultLimitMs) ops.push({
				op: "set",
				path: [DEFAULT_LIMIT_FIELD],
				value: fallback.value
			});
			if (hard.value !== settings.hardLimitMs) ops.push({
				op: "set",
				path: [HARD_LIMIT_FIELD],
				value: hard.value
			});
			for (const field of FLAG_FIELDS) if (draft.flags[field] !== hostFlag(settings, field)) ops.push({
				op: "set",
				path: [field],
				value: draft.flags[field]
			});
			return {
				ok: true,
				ops,
				normalized: {
					durations: {
						[DEFAULT_LIMIT_FIELD]: formatLimitInput(fallback.value),
						[HARD_LIMIT_FIELD]: formatLimitInput(hard.value)
					},
					flags: { ...draft.flags }
				}
			};
		}
		/**
		* 维护一份设置草稿. Host 侧被别处改动时, 只要本地没有正在编辑的内容就跟随更新.
		* @param scope - 已绑定的 settings scope.
		* @returns 草稿句柄.
		*/
		function useSettingsDraft(scope) {
			const settings = (0, react.useSyncExternalStore)((onChange) => scope.subscribe(onChange), () => scope.getSnapshot().value) ?? DEFAULT_SETTINGS;
			const hostDraft = (0, react.useMemo)(() => draftFrom(settings), [settings]);
			const [draft, setDraft] = (0, react.useState)(hostDraft);
			const [status, setStatus] = (0, react.useState)({ kind: "idle" });
			const lastHost = (0, react.useRef)(hostDraft);
			(0, react.useEffect)(() => {
				const previous = lastHost.current;
				lastHost.current = hostDraft;
				setDraft((current) => sameDraft(current, previous) ? hostDraft : current);
			}, [hostDraft]);
			const durationError = (0, react.useCallback)((field) => {
				if (field === "hardLimitMs") {
					const parsed = parseLimitInput(draft.durations[HARD_LIMIT_FIELD], MIN_LIMIT_MS, MAX_LIMIT_MS);
					return parsed.ok ? void 0 : parsed.error;
				}
				const hard = parseLimitInput(draft.durations[HARD_LIMIT_FIELD], MIN_LIMIT_MS, MAX_LIMIT_MS);
				const parsed = parseLimitInput(draft.durations[DEFAULT_LIMIT_FIELD], MIN_LIMIT_MS, hard.ok ? hard.value : MAX_LIMIT_MS);
				return parsed.ok ? void 0 : parsed.error;
			}, [draft]);
			const save = (0, react.useCallback)(() => {
				const plan = buildSavePlan(draft, settings);
				if (!plan.ok) {
					setStatus({
						kind: "error",
						message: plan.error
					});
					return;
				}
				if (plan.ops.length === 0) {
					setStatus({ kind: "saved" });
					return;
				}
				setStatus({ kind: "saving" });
				scope.mutate(plan.ops).then((accepted) => {
					if (!accepted) {
						setStatus({
							kind: "error",
							message: "配置写入被拒绝"
						});
						return;
					}
					setStatus({ kind: "saved" });
					setDraft(plan.normalized);
				}).catch((error) => {
					setStatus({
						kind: "error",
						message: error instanceof Error ? error.message : String(error)
					});
				});
			}, [
				draft,
				scope,
				settings
			]);
			const discard = (0, react.useCallback)(() => {
				setDraft(draftFrom(settings));
				setStatus({ kind: "idle" });
			}, [settings]);
			return {
				settings,
				draft,
				dirty: !sameDraft(draft, hostDraft),
				status,
				setDuration: (field, text) => {
					setDraft((current) => ({
						...current,
						durations: {
							...current.durations,
							[field]: text
						}
					}));
					setStatus({ kind: "idle" });
				},
				setFlag: (field, value) => {
					setDraft((current) => ({
						...current,
						flags: {
							...current.flags,
							[field]: value
						}
					}));
					setStatus({ kind: "idle" });
				},
				save,
				discard,
				durationError
			};
		}
		//#endregion
		//#region src/client/settings-page.tsx
		/**
		* 渲染等待上限配置页.
		* @param props - 已绑定的 scope.
		* @returns 配置页节点.
		*/
		function LimitTimeoutSection({ scope }) {
			const handle = useSettingsDraft(scope);
			const { draft, status, dirty } = handle;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: SECTION_CLASS,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						className: SECTION_TITLE_CLASS,
						children: "等待上限"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: DESC_CLASS,
						children: "限制 agent 在单次工具调用里可以让调用方等待多久. bash 的 timeoutMs 与 job_output 的 timeout_ms 都受这里约束, 超出上限的调用在真正执行前被拒绝, 理由会提示模型改用后台执行或向你申请提升. 改动只在点击保存后生效."
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: CARD_CLASS,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: FIELD_CLASS,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: ROW_COPY_CLASS,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: TITLE_CLASS,
										children: "全局默认等待上限"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: DESC_CLASS,
										children: [
											"支持 120000, 90s, 2m, 1h 等写法, 省略单位按毫秒. 默认 ",
											formatMsHint(DEFAULT_LIMIT_MS),
											"."
										]
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DurationInput, {
									value: draft.durations[DEFAULT_LIMIT_FIELD],
									error: handle.durationError(DEFAULT_LIMIT_FIELD),
									ariaLabel: "全局默认等待上限",
									onInput: (next) => {
										handle.setDuration(DEFAULT_LIMIT_FIELD, next);
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: FIELD_CLASS,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: ROW_COPY_CLASS,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: TITLE_CLASS,
										children: "硬天花板"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: DESC_CLASS,
										children: [
											"支持 120000, 90s, 2m, 1h 等写法, 省略单位按毫秒. 默认 ",
											formatMsHint(DEFAULT_HARD_LIMIT_MS),
											". 即使你批准了模型的提升申请, 实际等待也不会超过这个值; 调低它会立刻收回已批准的提升."
										]
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DurationInput, {
									value: draft.durations[HARD_LIMIT_FIELD],
									error: handle.durationError(HARD_LIMIT_FIELD),
									ariaLabel: "硬天花板",
									onInput: (next) => {
										handle.setDuration(HARD_LIMIT_FIELD, next);
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: FIELD_CLASS,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: ROW_COPY_CLASS,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: TITLE_CLASS,
										children: "允许模型申请提升"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: DESC_CLASS,
										children: "开启后模型可以调用 request_wait_extension 说明理由, 由你决定是否把本会话的上限抬高; 批准只在本次进程运行期间有效."
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: TOGGLE_CLASS,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: draft.flags[ALLOW_ESCALATION_FIELD],
										onChange: (event) => {
											handle.setFlag(ALLOW_ESCALATION_FIELD, event.currentTarget.checked);
										}
									}), "允许"]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: FIELD_CLASS,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: ROW_COPY_CLASS,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: TITLE_CLASS,
										children: "要求显式声明等待时长"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: DESC_CLASS,
										children: "开启后 job_output 的 wait 必须同时给出 timeout_ms, 否则调用被拒绝; 关闭时这类隐式等待 由 job_output 自身的部署配置约束."
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: TOGGLE_CLASS,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: draft.flags[REQUIRE_EXPLICIT_JOB_WAIT_FIELD],
										onChange: (event) => {
											handle.setFlag(REQUIRE_EXPLICIT_JOB_WAIT_FIELD, event.currentTarget.checked);
										}
									}), "要求"]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: FIELD_CLASS,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: ROW_COPY_CLASS,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: TITLE_CLASS,
										children: "屏蔽重复调用提醒"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: DESC_CLASS,
										children: "开启后 repeat-tool-reminder 注入的重复工具调用提醒不再进入模型请求; 会话日志仍保留这些记录, 只是模型看不到."
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: TOGGLE_CLASS,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: draft.flags[SUPPRESS_REPEAT_REMINDER_FIELD],
										onChange: (event) => {
											handle.setFlag(SUPPRESS_REPEAT_REMINDER_FIELD, event.currentTarget.checked);
										}
									}), "屏蔽"]
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ACTIONS_CLASS,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: `${BTN_CLASS} ${BTN_PRIMARY_CLASS}`,
								disabled: !dirty || status.kind === "saving",
								onClick: handle.save,
								children: status.kind === "saving" ? "保存中..." : "保存"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: BTN_CLASS,
								disabled: !dirty || status.kind === "saving",
								onClick: handle.discard,
								children: "放弃更改"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: STATUS_CLASS,
								children: [status.kind === "saved" && !dirty ? "已保存, 立即生效" : "", dirty ? "有未保存的更改" : ""]
							})
						]
					}),
					status.kind === "error" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ERROR_CLASS,
						children: ["保存失败: ", status.message]
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", {
						className: HINT_CLASS,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: "被拒绝的调用会收到明确的错误信息, 模型据此降低等待时间, 改用后台执行或者提出申请." }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: "提升按会话记录: 新会话与进程重启后回到这里的全局默认值." }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: "等待参数名同时匹配 timeoutMs 与 timeout_ms, 因此 bash, pwsh 与 job_output 都被覆盖." }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: "屏蔽重复调用提醒只改变模型看到的内容, 不影响会话日志与历史回放." })
						]
					})
				]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** 页面依赖的服务: configForms 提供配置通道, slots 提供注册面. */
		const inject = ["configForms", "slots"];
		/**
		* 绑定 settings namespace 并注册设置界面入口.
		* @param ctx - Web Client 插件上下文.
		*/
		function apply(ctx) {
			installStyles();
			const scope = ctx.configForms.get(PLUGIN_ID);
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: PLUGIN_ID,
				order: 110,
				label: "等待上限",
				inject: () => ({ scope })
			}, (props) => LimitTimeoutSection(props)));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map