import { defineConfig } from 'tsdown'

const PLUGIN_ID = 'dsh-limit-timeout'

// Client 半区: loader 模块形态, banner/footer 包裹为
// window.__ModuleLoader__.load({ id, factory: (require) => ... }); react 由
// factory 的 require 解析, 其余代码内联.
export default defineConfig({
  entry: { client: 'src/client/index.ts' },
  format: ['cjs'],
  platform: 'browser',
  outDir: 'lib',
  dts: false,
  clean: false,
  sourcemap: true,
  target: 'es2022',
  fixedExtension: false,
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PLUGIN_ID)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
  deps: {
    // 平台模块表里的模块: 运行时由 loader 的 require 提供, 不打进本 bundle.
    neverBundle: [
      'react',
      'react/jsx-runtime',
      '@deepseek-ai/dsh-client-ui-primitives',
    ],
  },
})
