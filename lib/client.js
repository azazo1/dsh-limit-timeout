window.__ModuleLoader__.load({
	id: "dsh-limit-timeout",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
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
		/** 上限字段允许的最小值 (1 秒): 再小会让工具调用失去意义. */
		const MIN_LIMIT_MS = 1e3;
		/** 上限字段允许的最大值 (24 小时): 防止误填造成实质上的无限等待. */
		const MAX_LIMIT_MS = 864e5;
		/** 全局默认等待上限: 2 分钟. */
		const DEFAULT_LIMIT_MS = 12e4;
		/** 硬天花板默认值: 30 分钟. */
		const DEFAULT_HARD_LIMIT_MS = 18e5;
		/** 上限字段的合法取值域 (schemastery schema 与解码共用). */
		function isValidLimit(value) {
			return typeof value === "number" && Number.isFinite(value) && value >= 1e3 && value <= 864e5;
		}
		/**
		* 把 Client 从 Host 拿到的未知 section 结构解码为类型化配置. 缺字段或非法
		* 字段回退默认值, 整体不是对象时返回 undefined.
		* @param section - Host settings 返回的未知结构.
		* @returns 解码后的配置, 或 undefined.
		*/
		function decodeLimitTimeoutSettings(section) {
			if (typeof section !== "object" || section === null) return void 0;
			const record = section;
			const defaultLimitMs = record[DEFAULT_LIMIT_FIELD];
			const hardLimitMs = record[HARD_LIMIT_FIELD];
			const allowEscalation = record[ALLOW_ESCALATION_FIELD];
			const requireExplicitJobWaitMs = record[REQUIRE_EXPLICIT_JOB_WAIT_FIELD];
			return {
				defaultLimitMs: isValidLimit(defaultLimitMs) ? defaultLimitMs : DEFAULT_LIMIT_MS,
				hardLimitMs: isValidLimit(hardLimitMs) ? hardLimitMs : DEFAULT_HARD_LIMIT_MS,
				allowEscalation: typeof allowEscalation === "boolean" ? allowEscalation : true,
				requireExplicitJobWaitMs: typeof requireExplicitJobWaitMs === "boolean" ? requireExplicitJobWaitMs : false
			};
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
		/** 毫秒数的可读形态. */
		function formatMsHint(ms) {
			if (ms % 36e5 === 0) return `${String(ms / 36e5)} 小时`;
			if (ms % 6e4 === 0) return `${String(ms / 6e4)} 分钟`;
			if (ms % 1e3 === 0) return `${String(ms / 1e3)} 秒`;
			return `${String(ms)} 毫秒`;
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
		//#region src/client/number-field.ts
		/**
		* 数字字段的本地草稿状态: 输入过程中不回写 Host (否则光标会被打到末尾), 失焦时
		* 校验并提交一次; 非法输入回退到持久值并保留错误提示.
		* @module dsh-limit-timeout/client/number-field
		*/
		/**
		* 维护一个数字字段的草稿状态.
		* @param options.persisted - Host 侧当前值.
		* @param options.min - 允许的最小值.
		* @param options.max - 允许的最大值 (硬天花板等跨字段约束).
		* @param options.onCommit - 提交回调, 只在草稿合法且与持久值不同时调用.
		* @returns 字段状态与事件处理.
		*/
		function useNumberField(options) {
			const { persisted, min, max, onCommit } = options;
			const [draft, setDraft] = (0, react.useState)(() => String(persisted));
			const [error, setError] = (0, react.useState)(void 0);
			const focused = (0, react.useRef)(false);
			const commit = (0, react.useRef)(onCommit);
			commit.current = onCommit;
			(0, react.useEffect)(() => {
				if (!focused.current) {
					setDraft(String(persisted));
					setError(void 0);
				}
			}, [persisted]);
			return {
				draft,
				error,
				onInput: (next) => {
					setDraft(next);
					const parsed = parseLimitInput(next, min, max);
					setError(parsed.ok ? void 0 : parsed.error);
				},
				onFocus: () => {
					focused.current = true;
				},
				onBlur: () => {
					focused.current = false;
					const parsed = parseLimitInput(draft, min, max);
					if (!parsed.ok) {
						setError(parsed.error);
						setDraft(String(persisted));
						return;
					}
					setError(void 0);
					setDraft(String(parsed.value));
					if (parsed.value !== persisted) commit.current(parsed.value);
				}
			};
		}
		//#endregion
		//#region src/client/styles.ts
		/**
		* 设置界面样式: 与 DSH Settings 现有视觉一致的主题 token, 用 data-plugin-css
		* 标记注入一次.
		* @module dsh-limit-timeout/client/styles
		*/
		/** 样式标签标记. */
		const STYLE_ID = "dsh-limit-timeout-client";
		/** 通用设置行的类名. */
		const ROW_CLASS = "dsh-lt-row";
		/** 通用设置行的文案容器类名. */
		const ROW_COPY_CLASS = "dsh-lt-row-copy";
		/** 字段标题类名. */
		const TITLE_CLASS = "dsh-lt-title";
		/** 字段描述类名. */
		const DESC_CLASS = "dsh-lt-desc";
		/** 数字输入框类名. */
		const INPUT_CLASS = "dsh-lt-input";
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
.${ROW_CLASS} { display: flex; align-items: center; gap: 8px; padding: 16px 0; border-bottom: 1px solid var(--dsw-alias-border-l2); }
.${ROW_COPY_CLASS} { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
.${TITLE_CLASS} { font-size: 13px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.${DESC_CLASS} { font-size: 12px; line-height: 1.6; color: var(--dsw-alias-label-tertiary); }
.${INPUT_CLASS} { width: 132px; height: 36px; box-sizing: border-box; padding: 0 12px; border-radius: 18px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-module-platform); color: var(--dsw-alias-label-primary); font-size: 13px; text-align: right; }
.${INPUT_CLASS}:hover { border-color: var(--dsw-alias-label-tertiary); }
.${INPUT_CLASS}:focus { outline: none; border-color: var(--dsw-alias-brand-primary); }
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
		//#region src/client/general-row.tsx
		/**
		* General 设置里的一行: 全局默认允许等待上限. 该值是所有等待参数 (bash 的
		* `timeoutMs`, job_output 的 `timeout_ms`) 的默认上限, 模型可在会话中向用户
		* 申请临时抬高.
		* @module dsh-limit-timeout/client/general-row
		*/
		/**
		* 渲染全局默认等待上限的一行输入.
		* @param props - 已绑定的 scope.
		* @returns 设置行节点.
		*/
		function GeneralLimitRow({ scope }) {
			const settings = (0, react.useSyncExternalStore)((onChange) => scope.subscribe(onChange), () => scope.getSnapshot().value);
			const persisted = settings?.defaultLimitMs ?? 12e4;
			const hardLimitMs = settings?.hardLimitMs ?? 18e5;
			const field = useNumberField({
				persisted,
				min: MIN_LIMIT_MS,
				max: hardLimitMs,
				onCommit: (value) => {
					scope.set(DEFAULT_LIMIT_FIELD, value);
				}
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ROW_CLASS,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: ROW_COPY_CLASS,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: TITLE_CLASS,
							children: "等待上限"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: DESC_CLASS,
							children: [
								"单次工具调用最多可等待多久, 支持 120000, 90s, 2m, 1h 等写法, 省略单位按毫秒. 当前为",
								" ",
								formatMsHint(persisted),
								", 覆盖 bash 的 timeoutMs 与 job_output 的 timeout_ms; 超出上限的调用会被 拒绝, 模型可改用后台执行或向你申请提升."
							]
						}),
						field.error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: DESC_CLASS,
							children: field.error
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					className: INPUT_CLASS,
					type: "text",
					inputMode: "numeric",
					value: field.draft,
					"aria-label": "单次工具调用等待上限 (毫秒)",
					onFocus: field.onFocus,
					onChange: (event) => {
						field.onInput(event.currentTarget.value);
					},
					onBlur: field.onBlur
				})]
			});
		}
		//#endregion
		//#region src/client/settings-page.tsx
		/**
		* 独立设置页: 等待上限的全部字段. 数字字段失焦时提交, 开关即时提交, 两者都经
		* settings scope 写回 Host 并实时生效.
		* @module dsh-limit-timeout/client/settings-page
		*/
		/** 把写入结果转成状态文案的公共入口. */
		function writeSetting(scope, setSave, field, value) {
			setSave({ kind: "saving" });
			Promise.resolve(scope.set(field, value)).then(() => {
				setSave({ kind: "saved" });
			}).catch((error) => {
				setSave({
					kind: "error",
					message: error instanceof Error ? error.message : String(error)
				});
			});
		}
		/**
		* 渲染等待上限配置页.
		* @param props - 已绑定的 scope.
		* @returns 配置页节点.
		*/
		function LimitTimeoutSection({ scope }) {
			const settings = (0, react.useSyncExternalStore)((onChange) => scope.subscribe(onChange), () => scope.getSnapshot().value);
			const [save, setSave] = (0, react.useState)({ kind: "idle" });
			const defaultLimitMs = settings?.defaultLimitMs ?? 12e4;
			const hardLimitMs = settings?.hardLimitMs ?? 18e5;
			const allowEscalation = settings?.allowEscalation ?? true;
			const requireExplicitJobWaitMs = settings?.requireExplicitJobWaitMs ?? false;
			const defaultField = useNumberField({
				persisted: defaultLimitMs,
				min: MIN_LIMIT_MS,
				max: hardLimitMs,
				onCommit: (value) => {
					writeSetting(scope, setSave, DEFAULT_LIMIT_FIELD, value);
				}
			});
			const hardField = useNumberField({
				persisted: hardLimitMs,
				min: MIN_LIMIT_MS,
				max: MAX_LIMIT_MS,
				onCommit: (value) => {
					if (value < defaultLimitMs) {
						setSave({
							kind: "error",
							message: `硬天花板不能低于默认等待上限 (${String(defaultLimitMs)} 毫秒)`
						});
						return;
					}
					writeSetting(scope, setSave, HARD_LIMIT_FIELD, value);
				}
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: SECTION_CLASS,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						className: SECTION_TITLE_CLASS,
						children: "等待上限"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: DESC_CLASS,
						children: "限制 agent 在单次工具调用里可以让调用方等待多久. bash 的 timeoutMs 与 job_output 的 timeout_ms 都受这里约束, 超出上限的调用在真正执行前被拒绝, 理由会提示模型改用后台执行或向你申请提升."
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: CARD_CLASS,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: FIELD_CLASS,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: ROW_COPY_CLASS,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: TITLE_CLASS,
											children: "全局默认等待上限"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: DESC_CLASS,
											children: [
												"支持 120000, 90s, 2m, 1h 等写法, 省略单位按毫秒. 默认 ",
												formatMsHint(DEFAULT_LIMIT_MS),
												", 与 General 设置里的那一行是同一个值."
											]
										}),
										defaultField.error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: ERROR_CLASS,
											children: defaultField.error
										})
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: INPUT_CLASS,
									type: "text",
									inputMode: "numeric",
									value: defaultField.draft,
									"aria-label": "全局默认等待上限 (毫秒)",
									onFocus: defaultField.onFocus,
									onChange: (event) => {
										defaultField.onInput(event.currentTarget.value);
									},
									onBlur: defaultField.onBlur
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: FIELD_CLASS,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: ROW_COPY_CLASS,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: TITLE_CLASS,
											children: "硬天花板"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: DESC_CLASS,
											children: [
												"支持 120000, 90s, 2m, 1h 等写法, 省略单位按毫秒. 默认 ",
												formatMsHint(DEFAULT_HARD_LIMIT_MS),
												". 即使你批准了模型的提升申请, 实际等待也不会超过这个值; 调低它会立刻收回已批准的提升."
											]
										}),
										hardField.error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: ERROR_CLASS,
											children: hardField.error
										})
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: INPUT_CLASS,
									type: "text",
									inputMode: "numeric",
									value: hardField.draft,
									"aria-label": "硬天花板 (毫秒)",
									onFocus: hardField.onFocus,
									onChange: (event) => {
										hardField.onInput(event.currentTarget.value);
									},
									onBlur: hardField.onBlur
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
										checked: allowEscalation,
										onChange: (event) => {
											writeSetting(scope, setSave, ALLOW_ESCALATION_FIELD, event.currentTarget.checked);
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
										checked: requireExplicitJobWaitMs,
										onChange: (event) => {
											writeSetting(scope, setSave, REQUIRE_EXPLICIT_JOB_WAIT_FIELD, event.currentTarget.checked);
										}
									}), "要求"]
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", {
						className: HINT_CLASS,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: "被拒绝的调用会收到明确的错误信息, 模型据此降低等待时间, 改用后台执行或者提出申请." }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: "提升按会话记录: 新会话与进程重启后回到这里的全局默认值." }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: "等待参数名同时匹配 timeoutMs 与 timeout_ms, 因此 bash, pwsh 与 job_output 都被覆盖." })
						]
					}),
					save.kind === "saving" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: STATUS_CLASS,
						children: "保存中..."
					}) : null,
					save.kind === "saved" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: STATUS_CLASS,
						children: "已保存, 立即生效"
					}) : null,
					save.kind === "error" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ERROR_CLASS,
						children: ["保存失败: ", save.message]
					}) : null
				]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** 页面依赖的服务: settingsScope 提供配置通道, slots 提供注册面. */
		const inject = ["settingsScope", "slots"];
		/**
		* 绑定 settings namespace 并注册两个设置界面入口.
		* @param ctx - Web Client 插件上下文.
		*/
		function apply(ctx) {
			installStyles();
			const scope = ctx.settingsScope.bind({
				namespace: PLUGIN_ID,
				decode: decodeLimitTimeoutSettings
			});
			ctx.slots.inject("settings.general.item", () => ctx.slots.register({
				name: "settings.general.item",
				id: `${PLUGIN_ID}-general`,
				order: 120,
				inject: () => ({ scope })
			}, (props) => GeneralLimitRow(props)));
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