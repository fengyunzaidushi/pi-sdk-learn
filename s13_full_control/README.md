# s13: 自行装配一个受限 AgentSession

## 目标

组合前面学到的运行时组件，并理解“提供依赖”与“运行 agent 回合”是两件事：本章不用 Pi 的默认资源发现，也不发送模型请求。

## 问题

默认 `createAgentSession()` 方便启动，但会发现本地资源并选默认设置。嵌入受限应用时，你可能要明确控制模型元数据来源、资源集合、设置存储、会话存储和工具列表。

## 调用链

```text
ModelRuntime（临时 auth 路径，关闭网络目录刷新）
SettingsManager.inMemory()
ResourceLoader（固定的空资源 + 自定义 system prompt）
SessionManager.inMemory()
       | 组合
       v
createAgentSession({ model, modelRuntime, settingsManager,
                     resourceLoader, sessionManager, tools: ["read"] })
       -> AgentSession 快照（本章不调用 prompt）
```

## 代码拆解

这里自己实现 `ResourceLoader` 公共接口，返回空扩展、skill、模板、主题和 AGENTS 文件；它是“禁用资源发现”的演示，不是所有应用都应采用的复杂写法。上一章的 `DefaultResourceLoader` 更适合常规应用。

示例从内置目录选一个模型对象，仅用于展示显式传入 `model`；它可能没有有效认证，不能据此推断请求可成功。`tools: ["read"]` 把执行能力限制为读取；`SessionManager.inMemory()` 避免写 JSONL。模型运行时使用临时路径，结束后清理。

## 运行

```powershell
npm run start:s13
```

本章不会调用模型，也不需要认证。

## 观察

- system prompt 含有自定义教学文本，而没有本机 AGENTS 文件；
- active tools 只有 `read`，skills 数量为 0；
- `session file` 为 `(in memory)`；
- `same model runtime` 为 `true`；
- 打印模型元数据不表示已通过认证。

## 练习

把 `tools` 改为 `[]`，比较 active tools 和 system prompt；再用 `DefaultResourceLoader` 替换自定义 loader，说明自动发现能力会如何变化。

## 边界

“全量装配”不等于重写 `Agent` 循环。只有确实需要禁止默认发现时才实现完整 `ResourceLoader`；真实调用还需要配置认证并决定安全策略。对照 Pi 源码：`packages/coding-agent/src/core/sdk.ts`、`resource-loader.ts`、`agent-session.ts`。
