import z from "@deepseek-ai/schemastery";
import { Context, Volatile } from "@deepseek-ai/cordis";
//#region src/settings.d.ts
/** Loader 投影到 settings 页面的实时配置引用. */
interface LimitTimeoutConfig {
  defaultLimitMs: Volatile<number>;
  hardLimitMs: Volatile<number>;
  allowEscalation: Volatile<boolean>;
  requireExplicitJobWaitMs: Volatile<boolean>;
  suppressRepeatToolReminders: Volatile<boolean>;
}
/** 插件配置 schema. */
declare const Config: z<Schemastery.ObjectS<NoInfer<{
  defaultLimitMs: z<number, number, "volatile-defined">;
  hardLimitMs: z<number, number, "volatile-defined">;
  allowEscalation: z<boolean, boolean, "volatile-defined">;
  requireExplicitJobWaitMs: z<boolean, boolean, "volatile-defined">;
  suppressRepeatToolReminders: z<boolean, boolean, "volatile-defined">;
}>>, Schemastery.ObjectT<NoInfer<{
  defaultLimitMs: z<number, number, "volatile-defined">;
  hardLimitMs: z<number, number, "volatile-defined">;
  allowEscalation: z<boolean, boolean, "volatile-defined">;
  requireExplicitJobWaitMs: z<boolean, boolean, "volatile-defined">;
  suppressRepeatToolReminders: z<boolean, boolean, "volatile-defined">;
}>>, "plain">;
//#endregion
//#region src/index.d.ts
declare const name = "dsh-limit-timeout";
declare const inject: string[];
/**
 * 装载设置绑定, 拦截器, 申请工具与提示说明.
 * @param ctx - Host 插件上下文.
 */
declare function apply(ctx: Context, config: LimitTimeoutConfig): void;
//#endregion
export { Config, apply, inject, name };
//# sourceMappingURL=index.d.ts.map