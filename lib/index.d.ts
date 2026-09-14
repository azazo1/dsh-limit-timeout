import { Context } from "@deepseek-ai/cordis";
//#region src/index.d.ts
declare const name = "dsh-limit-timeout";
declare const inject: string[];
/**
 * 装载设置绑定, 拦截器, 申请工具与提示说明.
 * @param ctx - Host 插件上下文.
 */
declare function apply(ctx: Context): void;
//#endregion
export { apply, inject, name };
//# sourceMappingURL=index.d.ts.map