/**
 * dsh-limit-timeout 浏览器半区: 绑定 Host 条目的配置表单, 并在插件页的卡片上注册配置界面.
 *
 * 构建产物是 CJS 形态的 loader 模块: tsdown 用 banner/footer 包裹为
 * `window.__ModuleLoader__.load({ id, factory: (require) => ... })`, react 等
 * 外部模块经 factory 注入的 require 解析.
 * @module dsh-limit-timeout/client
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import type { ConfigForm as SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { PLUGIN_ID, type LimitTimeoutSettings } from '../shared.ts'
import { en, NS, zh } from './locales.ts'
import { LimitTimeoutSettingsCard } from './settings-card.tsx'
import { LimitTimeoutSettingsForm } from './settings-form.ts'
import { installStyles } from './styles.ts'

/** 页面依赖的服务: configForms 提供配置通道, slots 提供注册面, locale 提供字典. */
export const inject = ['configForms', 'slots', 'locale']

/**
 * 绑定 profile 条目表单并注册插件页的配置卡片.
 * @param ctx - Web Client 插件上下文.
 */
export function apply(ctx: ClientContext): void {
  installStyles()
  const scope = ctx.configForms.get<LimitTimeoutSettings>(PLUGIN_ID)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-limit-timeout: dictionaries')

  const card = new LimitTimeoutSettingsForm(scope)
  ctx.effect(() => () => { card.dispose() }, 'dsh-limit-timeout: settings form')
  ctx.effect(() => ctx.configForms.whileServed([PLUGIN_ID], () => ctx.slots.inject(
    'plugins.bundle.config',
    () => ctx.slots.register({
      name: 'plugins.bundle.config',
      key: PLUGIN_ID,
      locale: NS,
      inject: () => card.inject(),
    }, LimitTimeoutSettingsCard),
  )), 'dsh-limit-timeout: plugins page card')
}
