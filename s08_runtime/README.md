# s08: AgentSessionRuntime 负责替换活动会话

单个 `AgentSession` 适合发送 prompt；当应用支持 `/new`、resume、fork 或 import 时，活动会话会被替换，cwd 相关的服务也必须一起重建。

## 目标

你将掌握：

- `createAgentSessionServices()` 创建 cwd 绑定的服务；
- `createAgentSessionFromServices()` 用服务创建会话；
- `createAgentSessionRuntime()` 保存重建工厂；
- `newSession()` 和 `switchSession()` 会替换 `runtime.session`。

## 问题

下面这种代码在切换会话后会留下旧引用：

```ts
const session = runtime.session;
await runtime.newSession();
await session.prompt("..."); // 仍然操作旧会话
```

运行时 API 的边界是：`runtime.session` 才是当前活动会话；替换后，订阅、扩展绑定和 UI 引用都要重新绑定。

## 两阶段创建

```text
createAgentSessionServices(cwd)
  -> ModelRuntime / SettingsManager / ResourceLoader

createAgentSessionFromServices(services, sessionManager)
  -> AgentSession

createAgentSessionRuntime(factory)
  -> 保存 factory，供 new/resume/fork/import 重用
```

把服务创建和会话创建拆开，是为了让 cwd 改变时不复用旧 cwd 的资源和设置。

## 代码拆解

本章的工厂只启用 `tools: []`，并使用临时 session 目录。代码先写入确定性的 assistant fixture，让初始 JSONL 文件真正落盘；然后打印初始会话 ID，调用 `newSession()`，最后用保存的文件 `switchSession()` 回去。

注意 `runtime.session` 在每次替换后都重新读取。真实 UI 需要像下面这样重新订阅：

```ts
unsubscribe?.();
const session = runtime.session;
unsubscribe = session.subscribe(listener);
```

## 运行

```powershell
npm run typecheck
npm run start:s08
```

本章不发送模型请求，但会加载默认资源和模型目录。

## 观察

- `after newSession` 的 ID 与初始 ID 不同；
- `after switchSession: true` 说明运行时回到了原会话；
- 每次切换都由同一个 factory 重建服务和会话；
- 临时目录在 finally 中删除，不留下跨运行状态。

## 练习

1. 为 `runtime.session` 添加订阅，然后在 `newSession()` 后验证旧订阅不会自动转移。
2. 让工厂根据 `targetCwd` 注入不同的 system prompt，确认切换 cwd 后资源改变。
3. 加入 `runtime.fork()`，记录新旧 session ID 和父子关系。

## 边界

本章只讲运行时替换，不讨论交互模式如何渲染事件，也不把 `AgentSessionRuntime` 当作模型循环。循环仍然由底层 `Agent` 执行；runtime 管理的是会话和其 cwd 绑定的服务生命周期。
