/**
 * dsh-limit-timeout 浏览器半区: 绑定 Host 的 settings namespace, 在 General
 * 放一行全局默认等待上限, 并注册独立的等待上限配置页.
 *
 * 构建产物是 CJS 形态的 loader 模块: tsdown 用 banner/footer 包裹为
 * `window.__ModuleLoader__.load({ id, factory: (require) => ... })`, react 等
 * 外部模块经 factory 注入的 require 解析.
 * @module dsh-limit-timeout/client
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { ConfigForm as SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { PLUGIN_ID, type LimitTimeoutSettings } from '../shared.ts'
import { GeneralLimitRow, type GeneralLimitRowProps } from './general-row.tsx'
import { LimitTimeoutSection, type LimitTimeoutSectionProps } from './settings-page.tsx'
import { installStyles } from './styles.ts'

/** 页面依赖的服务: configForms 提供配置通道, slots 提供注册面. */
export const inject = ['configForms', 'slots']

/**
 * 绑定 settings namespace 并注册两个设置界面入口.
 * @param ctx - Web Client 插件上下文.
 */
export function apply(ctx: ClientContext): void {
  installStyles()
  const scope = ctx.configForms.get<LimitTimeoutSettings>(PLUGIN_ID)

  ctx.slots.inject('settings.general.item', () => ctx.slots.register(
    {
      name: 'settings.general.item',
      id: `${PLUGIN_ID}-general`,
      order: 120,
      inject: () => ({ scope }),
    },
    (props: GeneralLimitRowProps) => GeneralLimitRow(props),
  ))

  ctx.slots.inject('settings.section', () => ctx.slots.register(
    {
      name: 'settings.section',
      id: PLUGIN_ID,
      order: 110,
      label: '等待上限',
      inject: () => ({ scope }),
    },
    (props: LimitTimeoutSectionProps) => LimitTimeoutSection(props),
  ))
}
