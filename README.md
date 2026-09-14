# dsh-limit-timeout

限制 DSH agent 单次工具调用可以让调用方等待多久: 全局默认上限放在设置界面,
模型需要更长等待时可以在会话中向你申请提升.

## 它解决什么

`bash` 的 `timeoutMs`, `job_output` 的 `timeout_ms` 这类参数由模型自己填写, 部署
侧原本只有一个很宽的工具配置兜底. 本插件在调用真正执行前检查这些参数:

- 超过本会话上限的调用被拒绝, 拒绝理由写清当前上限, 并给出三条替代做法: 降低等待
  时间, 改用后台执行 (`run_in_background: true` + `job_output`), 或者调用
  `request_wait_extension` 向你申请提升.
- 申请走 DSH 原生审批通道, 由你决定是否批准; 批准后只对当前进程内的这个会话生效.

## 安装

```shell
dsh plugin --profile web add azazo1/dsh-limit-timeout
```

装好后重启 `dsh web`, 让 profile 重新扫描 Client 元数据.

## 设置

设置界面有两处入口:

- `Settings > General` 的 "等待上限" 一行: 全局默认允许等待上限, 也是日常唯一需要改的值.
- `Settings > 等待上限` 独立页: 全部字段.

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| 全局默认等待上限 (`defaultLimitMs`) | 120000 | 单次调用可声明的最大等待, 覆盖 `timeoutMs` 与 `timeout_ms` |
| 硬天花板 (`hardLimitMs`) | 1800000 | 即使你批准了提升, 实际等待也不会超过它; 调低它会立刻收回已批准的提升 |
| 允许模型申请提升 (`allowEscalation`) | 开 | 关闭后模型看不到申请途径, 超限调用只被拒绝 |
| 要求显式声明等待时长 (`requireExplicitJobWaitMs`) | 关 | 开启后 `job_output` 的 `wait: true` 必须同时给出 `timeout_ms` |

两个时长字段接受 `120000`, `500ms`, `90s`, `2m`, `1h` 这类写法, 省略单位按毫秒;
小数会向下取整到毫秒. 默认上限不能高于硬天花板, 否则写入被拒绝.

## 运行时行为

- 拦截发生在 `tools/pre-execute`: 放行时继续交给下游策略 (权限, 沙箱) 判断, 超限时
  直接短路成错误结果, 调用不会真正执行.
- 工具参数在进入策略管线前已经记录并呈现, 所以插件只能拒绝, 不能改写参数; 这也是
  不做静默钳制的原因.
- 提升按会话对象记录在进程内存里: 新会话, 会话恢复与进程重启都回到全局默认值.
- 每次拒绝都会以 info 级别记入 Host 日志, 包含工具名, 调用 id, 当前上限与是否已提升.

## 边界

- 只覆盖模型可控的等待参数 (`timeoutMs`, `timeout_ms`). 工具自身的部署超时 (例如
  `web_fetch` 的 `fetchTimeoutMs`) 不受影响.
- `job_output` 只写 `wait: true` 而不写 `timeout_ms` 时, 等待时长由 `dsh-tool-jobs`
  自己的 `waitTimeoutMs` 决定, 默认配置下不受本插件约束; 需要严格限制就打开
  "要求显式声明等待时长".
- 提升不写入会话日志, 因此不可回放, 也不能跨进程保留.

## 开发

```shell
just install
just typecheck
just build
just test
just verify
```

`src/` 是 TypeScript 源码, `lib/` 是构建产物 (随包提交). Host 半区注册设置, 拦截器,
申请工具与运行时提示; Client 半区注册设置界面两个入口.
