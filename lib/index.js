import { defineTool } from "@deepseek-ai/dsh-tools";
import z from "@deepseek-ai/schemastery";
//#region src/limits.ts
/**
* 模型可控的等待参数名: 单次调用里声明"我愿意等多久"的字段. `timeoutMs` 属于
* bash / pwsh 类工具, `timeout_ms` 属于 job_output 类工具.
*/
const WAIT_ARG_FIELDS = ["timeoutMs", "timeout_ms"];
/** 声明后台执行的参数: 置为 true 后调用方不再等待, 超时参数随之失效. */
const BACKGROUND_ARG = "run_in_background";
/** 后台执行是"不等待"的替代方案的工具集合. */
const BACKGROUND_CAPABLE_TOOLS = /* @__PURE__ */ new Set(["bash", "pwsh"]);
/** job_output 的等待开关参数名. */
const JOB_WAIT_ARG = "wait";
/** 把未知参数值收窄为普通对象. */
function asRecord(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
	return value;
}
/**
* 读取一次调用里的等待请求.
* @param args - 工具调用的解析后参数.
* @returns 命中的等待字段与值, 没有则 undefined.
*/
function readWaitRequest(args) {
	const record = asRecord(args);
	if (record === void 0) return void 0;
	for (const field of WAIT_ARG_FIELDS) {
		const value = record[field];
		if (typeof value === "number" && Number.isFinite(value)) return {
			field,
			value
		};
	}
}
/** 判定一次调用是否占用调用方等待: 后台执行不占用. */
function occupiesCaller(toolName, args) {
	const record = asRecord(args);
	if (record === void 0) return true;
	if (!BACKGROUND_CAPABLE_TOOLS.has(toolName)) return true;
	return record[BACKGROUND_ARG] !== true;
}
/** 允许调用的单例判定. */
const ALLOW = { kind: "allow" };
/** 把毫秒数写成便于阅读的形态. */
function formatDuration(ms) {
	if (ms % 6e4 === 0) return `${String(ms / 6e4)} min`;
	if (ms % 1e3 === 0) return `${String(ms / 1e3)} s`;
	return `${String(ms)} ms`;
}
/** 生成超限拒绝理由 (模型可见, 用英文与工具描述保持一致). */
function denyReason(input, request) {
	const alternatives = [];
	if (BACKGROUND_CAPABLE_TOOLS.has(input.toolName)) alternatives.push("run the command with `run_in_background: true` and collect it with `job_output`");
	alternatives.push(`retry with \`${request.field}\` at or below ${String(input.limitMs)} ms`);
	if (input.allowEscalation) alternatives.push(`call \`request_wait_extension\` to ask the user to raise this session's wait limit (hard ceiling ${String(input.hardLimitMs)} ms)`);
	return `\`${request.field}\` ${String(request.value)} ms exceeds this session's wait limit of ${String(input.limitMs)} ms (${formatDuration(input.limitMs)}). Either ${alternatives.join(", or ")}.`;
}
/** 生成隐式等待被拒绝的理由. */
function implicitWaitReason(input) {
	return `\`job_output\` with \`wait: true\` must declare an explicit \`timeout_ms\` in this deployment: the deployment caps every wait through that field (session limit ${String(input.limitMs)} ms). Read the job without waiting, or pass \`wait: true\` together with \`timeout_ms\` at or below the limit.`;
}
/**
* 判定一次工具调用是否超出等待上限.
* @param input - 工具名, 参数与当前生效的上限.
* @returns 允许或带理由的拒绝.
*/
function evaluateWaitGuard(input) {
	const record = asRecord(input.args);
	if (record === void 0) return ALLOW;
	const request = readWaitRequest(record);
	if (request === void 0) {
		if (input.toolName === "job_output" && record[JOB_WAIT_ARG] === true && input.requireExplicitJobWaitMs) return {
			kind: "deny",
			reason: implicitWaitReason(input)
		};
		return ALLOW;
	}
	if (!occupiesCaller(input.toolName, record)) return ALLOW;
	if (request.value <= input.limitMs) return ALLOW;
	return {
		kind: "deny",
		reason: denyReason(input, request)
	};
}
/** 生成给模型看的当前等待预算说明文本. */
function describeWaitBudget(input) {
	const { settings, sessionLimitMs, raised } = input;
	const parts = [`Wait budget: a single tool call in this session may wait at most ${String(sessionLimitMs)} ms (${formatDuration(sessionLimitMs)}) through \`timeoutMs\` (bash, pwsh) or \`timeout_ms\` (job_output).`];
	if (raised) parts.push(`The user raised this session's limit from the default ${String(settings.defaultLimitMs)} ms to ${String(sessionLimitMs)} ms.`);
	parts.push("A larger value is rejected before the call runs.", "Work that outlives the limit belongs in the background: start it with `run_in_background: true` and collect it with `job_output`.");
	if (settings.allowEscalation) parts.push(`When a longer wait is genuinely required, call \`request_wait_extension\` to ask the user for a larger session limit (hard ceiling ${String(settings.hardLimitMs)} ms).`);
	else parts.push("This deployment does not allow raising the limit inside a session.");
	return parts.join(" ");
}
//#endregion
//#region src/extension-tool.ts
/** 工具名 (与 dsh-plugin.naming.json 的 tools 声明一致). */
const REQUEST_WAIT_EXTENSION_TOOL = "request_wait_extension";
/**
* 校验参数并执行一次申请.
* @param ctx - Host 插件上下文 (读取 approval 服务).
* @param deps - 工具依赖.
* @param args - 已通过参数 schema 校验的参数.
* @param exec - 本次工具调用上下文.
* @returns 申请结果.
* @throws {Error} 参数非法, 超过硬天花板, 部署禁止申请, 无审批通道, 或被用户拒绝.
*/
async function requestExtension(ctx, deps, args, exec) {
	const settings = deps.settings();
	const durationMs = args.durationMs;
	if (!Number.isFinite(durationMs) || durationMs <= 0) throw new Error(`invalid durationMs: expected a positive number of milliseconds, got ${JSON.stringify(durationMs)}`);
	const reason = args.reason.trim();
	if (reason.length === 0) throw new Error("invalid reason: expected a non-empty sentence for the user");
	const agent = exec.agent;
	if (agent === void 0) throw new Error("request_wait_extension needs an agent session to route the request to the user");
	const session = agent.session;
	const currentLimitMs = deps.sessionLimits.limitOf(session, settings.defaultLimitMs, settings.hardLimitMs);
	if (!settings.allowEscalation) throw new Error(`raising the wait limit inside a session is disabled by this deployment (limit stays ${String(currentLimitMs)} ms)`);
	if (durationMs > settings.hardLimitMs) throw new Error(`requested ${String(durationMs)} ms exceeds the deployment hard ceiling of ${String(settings.hardLimitMs)} ms (${formatDuration(settings.hardLimitMs)}); request at most that value`);
	if (durationMs <= currentLimitMs) return {
		status: "already-within-limit",
		sessionLimitMs: currentLimitMs,
		text: `No approval needed: this session's wait limit is already ${String(currentLimitMs)} ms (${formatDuration(currentLimitMs)}). Pass \`timeoutMs\` or \`timeout_ms\` at or below it.`
	};
	const approval = ctx.get("approval");
	if (approval === void 0) throw new Error("no approval channel is available, so the wait limit cannot be raised");
	deps.log(`asking the user to raise the wait limit of session ${session.id} to ${String(durationMs)} ms`);
	const outcome = await approval.request({
		agent,
		toolName: REQUEST_WAIT_EXTENSION_TOOL,
		callId: exec.callId,
		reason: `Raise this session's tool-call wait limit to ${String(durationMs)} ms (${formatDuration(durationMs)}): ${reason}`,
		signal: exec.signal
	});
	switch (outcome) {
		case "allowed-once":
			deps.sessionLimits.grant(session, durationMs, reason);
			deps.log(`wait limit of session ${session.id} raised to ${String(durationMs)} ms`);
			return {
				status: "granted",
				sessionLimitMs: durationMs,
				text: `The user approved: this session's wait limit is now ${String(durationMs)} ms (${formatDuration(durationMs)}) and applies to later calls until the process restarts. Retry the call whose wait was rejected, with \`timeoutMs\` / \`timeout_ms\` at or below the new limit.`
			};
		case "rejected": throw new Error(`the user rejected raising this session's wait limit to ${String(durationMs)} ms`);
		case "cancelled": throw new Error("the wait-limit request was cancelled before the user answered");
		case "unavailable": throw new Error("the wait-limit request could not be delivered: no approval answerer is available");
		default: throw new Error(`unexpected approval outcome: ${String(outcome)}`);
	}
}
/**
* 创建申请工具定义.
* @param ctx - Host 插件上下文.
* @param deps - 工具依赖.
* @returns 可注册到 `ctx.tools` 的工具定义.
*/
function createRequestWaitExtensionTool(ctx, deps) {
	return defineTool({
		name: REQUEST_WAIT_EXTENSION_TOOL,
		description: "Ask the user to raise this session's tool-call wait limit (`timeoutMs` for bash/pwsh, `timeout_ms` for job_output). Use it after a call was rejected for exceeding the limit and the wait is genuinely needed: the user decides, and an approval covers the rest of this session. Returns the limit now in effect.",
		parameters: {
			durationMs: {
				type: "number",
				required: true,
				description: "Requested wait limit for this session in milliseconds. Must exceed the current limit and stay at or below the deployment hard ceiling stated in the runtime context."
			},
			reason: {
				type: "string",
				required: true,
				description: "One sentence shown to the user explaining why the longer wait is needed, for example which command or job must finish."
			}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					status: {
						type: "string",
						required: true
					},
					sessionLimitMs: {
						type: "number",
						required: true
					},
					text: {
						type: "string",
						required: true
					}
				}
			},
			render: (_args, value) => [{
				type: "text",
				text: value.text
			}]
		},
		async execute(args, exec) {
			return await requestExtension(ctx, deps, args, exec);
		}
	});
}
//#endregion
//#region src/intercept.ts
/** 取调用所属的会话对象, 用作提升记录的键. */
function sessionOf(exec) {
	return exec.agent?.session;
}
/**
* 判定一次调用是否放行.
* @param exec - 进入策略管线的调用.
* @param deps - 拦截器依赖.
* @returns 允许或带理由的拒绝.
*/
function decideWaitGuard(exec, deps) {
	const settings = deps.settings();
	const session = sessionOf(exec);
	const limitMs = deps.sessionLimits.limitOf(session, settings.defaultLimitMs, settings.hardLimitMs);
	const decision = evaluateWaitGuard({
		toolName: exec.name,
		args: exec.arguments,
		limitMs,
		hardLimitMs: settings.hardLimitMs,
		allowEscalation: settings.allowEscalation,
		requireExplicitJobWaitMs: settings.requireExplicitJobWaitMs
	});
	if (decision.kind === "deny") {
		const raised = deps.sessionLimits.grantOf(session) !== void 0;
		deps.log(`denied ${exec.name} (call ${exec.callId}): ${decision.reason} [limit=${String(limitMs)}ms, raised=${String(raised)}]`);
	}
	return decision;
}
/**
* 创建 `tools/pre-execute` 监听器. 放行时继续 `next()`, 让下游策略 (权限,
* 沙箱) 仍有机会拒绝; 超限时短路并直接拒绝.
* @param deps - 拦截器依赖.
* @returns waterfall 监听器.
*/
function createWaitGuardListener(deps) {
	return async (exec, next) => {
		const decision = decideWaitGuard(exec, deps);
		if (decision.kind === "deny") return decision;
		return next();
	};
}
//#endregion
//#region src/session-limits.ts
/** 按会话保存的提升记录. */
var SessionWaitLimits = class {
	grants = /* @__PURE__ */ new WeakMap();
	/**
	* 记录一次已批准的提升, 覆盖同会话的旧记录.
	* @param session - 目标会话对象.
	* @param limitMs - 批准生效的等待上限.
	* @param reason - 模型给出的申请理由.
	* @param grantedAt - 批准时间戳, 缺省为当前时刻.
	* @returns 写入的记录.
	*/
	grant(session, limitMs, reason, grantedAt = Date.now()) {
		const grant = {
			limitMs,
			reason,
			grantedAt
		};
		this.grants.set(session, grant);
		return grant;
	}
	/**
	* 读取会话的当前提升记录.
	* @param session - 目标会话对象, 可能不存在.
	* @returns 提升记录, 没有则 undefined.
	*/
	grantOf(session) {
		return session === void 0 ? void 0 : this.grants.get(session);
	}
	/**
	* 计算会话当前生效的等待上限: 已批准的提升值 (没有则全局默认值) 与硬天花板
	* 取小, 这样调低硬天花板可以立即收回既有提升.
	* @param session - 目标会话对象.
	* @param defaultLimitMs - 全局默认允许等待上限.
	* @param hardLimitMs - 硬天花板.
	* @returns 当前生效的等待上限 (毫秒).
	*/
	limitOf(session, defaultLimitMs, hardLimitMs) {
		const grant = this.grantOf(session);
		const base = grant === void 0 ? defaultLimitMs : grant.limitMs;
		return Math.min(base, hardLimitMs);
	}
	/**
	* 撤销会话的既有提升.
	* @param session - 目标会话对象.
	* @returns 是否确实删除了一条记录.
	*/
	revoke(session) {
		return this.grants.delete(session);
	}
};
//#endregion
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
//#region src/settings.ts
/**
* Host 侧 settings namespace 定义. 设置页保存的值经此 schema 校验与持久化,
* 插件运行时通过注册返回的 scope 读取并监听变化.
* @module dsh-limit-timeout/settings
*/
/** settings namespace 的字段 schema. */
const LimitTimeoutSettingsSchema = z.object({
	[DEFAULT_LIMIT_FIELD]: z.number().step(1).min(MIN_LIMIT_MS).max(MAX_LIMIT_MS).default(DEFAULT_LIMIT_MS),
	[HARD_LIMIT_FIELD]: z.number().step(1).min(MIN_LIMIT_MS).max(MAX_LIMIT_MS).default(DEFAULT_HARD_LIMIT_MS),
	[ALLOW_ESCALATION_FIELD]: z.boolean().default(true),
	[REQUIRE_EXPLICIT_JOB_WAIT_FIELD]: z.boolean().default(false),
	[SUPPRESS_REPEAT_REMINDER_FIELD]: z.boolean().default(false)
});
/**
* schema 无法表达的跨字段约束: 默认上限不能高于硬天花板, 否则默认值会被天花板
* 立刻压回去, 设置页与运行时行为将互相矛盾.
* @param value - schema 校验通过的完整配置.
* @throws {Error} 当默认上限高于硬天花板.
*/
function validateLimitTimeoutSettings(value) {
	if (value.defaultLimitMs > value.hardLimitMs) throw new Error(`defaultLimitMs (${String(value.defaultLimitMs)} ms) must not exceed hardLimitMs (${String(value.hardLimitMs)} ms): the hard ceiling caps every wait, including the default.`);
}
/**
* 判断一条消息是否来自重复调用提醒.
* @param message - pre-step 拿到的消息.
* @returns 是提醒消息时为 true.
*/
function isRepeatReminder(message) {
	const source = message.source;
	return source.kind === "plugin" && source.plugin === "repeat-tool-reminder";
}
/**
* 创建 `agent/pre-step` 监听器: 始终先委托下游, 只在开关打开时删掉提醒消息.
* @param deps - 监听器依赖.
* @returns waterfall 监听器.
*/
function createSuppressReminderListener(deps) {
	return async (payload, next) => {
		const decision = await next();
		if (decision.kind === "reject") return decision;
		if (!deps.settings().suppressRepeatToolReminders) return decision;
		const kept = decision.messages.filter((message) => !isRepeatReminder(message));
		if (kept.length === decision.messages.length) return decision;
		deps.log(`suppressed ${String(decision.messages.length - kept.length)} repeat-tool reminder message(s) for agent ${payload.agent.id}`);
		return {
			...decision,
			messages: kept
		};
	};
}
//#endregion
//#region src/index.ts
const name = PLUGIN_ID;
const inject = ["tools"];
/**
* 等待预算说明在系统提示里的位置: 紧跟 approval 策略 (115) 之后, 早于子代理
* 委派说明 (120). 该位置由 harness 集中分配, 这里取相邻的空档.
*/
const WAIT_BUDGET_CONTEXT_ORDER = 117;
/**
* 装载设置绑定, 拦截器, 申请工具与提示说明.
* @param ctx - Host 插件上下文.
*/
function apply(ctx) {
	const sessionLimits = new SessionWaitLimits();
	let settings = { ...DEFAULT_SETTINGS };
	ctx.inject(["settings"], (settingsCtx) => {
		const owner = settingsCtx.settings.register(PLUGIN_ID, LimitTimeoutSettingsSchema, { validate: validateLimitTimeoutSettings });
		const sync = () => {
			settings = owner.get();
		};
		sync();
		owner.watch(sync);
		ctx.logger.info("%s: settings bound (defaultLimitMs=%d ms, hardLimitMs=%d ms, allowEscalation=%s, requireExplicitJobWaitMs=%s)", PLUGIN_ID, settings.defaultLimitMs, settings.hardLimitMs, String(settings.allowEscalation), String(settings.requireExplicitJobWaitMs));
	});
	ctx.inject(["systemPrompt"], (promptCtx) => {
		promptCtx.systemPrompt.context({
			name: "limit-timeout:budget",
			order: WAIT_BUDGET_CONTEXT_ORDER,
			text: (context) => {
				const session = context.agent?.session;
				const raised = sessionLimits.grantOf(session) !== void 0;
				const sessionLimitMs = sessionLimits.limitOf(session, settings.defaultLimitMs, settings.hardLimitMs);
				return describeWaitBudget({
					settings,
					sessionLimitMs,
					raised
				});
			}
		});
	});
	const log = (message) => {
		ctx.logger.info("%s: %s", PLUGIN_ID, message);
	};
	ctx.tools.register(createRequestWaitExtensionTool(ctx, {
		settings: () => settings,
		sessionLimits,
		log
	}));
	ctx.on("tools/pre-execute", createWaitGuardListener({
		settings: () => settings,
		sessionLimits,
		log
	}));
	ctx.on("agent/pre-step", createSuppressReminderListener({
		settings: () => settings,
		log: (message) => {
			ctx.logger.debug("%s: %s", PLUGIN_ID, message);
		}
	}));
	ctx.logger.info("%s: host loaded", PLUGIN_ID);
}
//#endregion
export { apply, inject, name };

//# sourceMappingURL=index.js.map