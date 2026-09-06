# s01: 创建一个最小会话

这章只解决一个问题：如何把 Pi SDK 放进一个普通的 TypeScript 程序中，并完成一次 prompt。

## 目标

读完并运行本章后，你应该能说明四个对象的职责：

| 对象 | 职责 |
| --- | --- |
| `createAgentSession` | 创建并装配一次 Pi 会话运行环境 |
| `AgentSession` | 提供 prompt、事件、工具和资源等应用层接口 |
| `SessionManager.inMemory()` | 本次实验不写 JSONL 会话文件 |
| `session.dispose()` | 结束会话并释放事件、重试和工具资源 |

`createAgentSession` 不是模型调用本身。它先准备运行时，返回一个可以反复调用的 `session`。

## 问题

直接调用模型 API，需要自己处理模型选择、认证、流式响应、工具结果和清理。这样的程序很快把业务代码和 agent 生命周期混在一起。

第一章先把边界固定下来：业务程序只创建会话、订阅事件、提交 prompt，回合内部由 Pi 负责。

## 调用链

```text
createAgentSession()
  -> ModelRuntime / SettingsManager / ResourceLoader / SessionManager
  -> Agent
  -> AgentSession

session.prompt(text)
  -> AgentSession 预处理
  -> Agent.prompt
  -> Agent loop
  -> message_update 事件
```

代码中 `tools: []` 表示本章不暴露工具。模型仍然会运行，但只能返回文本，实验更容易观察。

## 代码拆解

### 1. 创建会话

```ts
const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  tools: [],
});
```

返回值是一个对象，因为创建过程还可能返回 `extensionsResult` 和模型恢复警告。这里使用内存会话，避免第一章把持久化问题带进来。

### 2. 订阅流式文本

`session.subscribe()` 不会启动模型。它只是登记事件监听器。模型产生文本增量时，Pi 发出 `message_update`，其中的 `text_delta` 才是可以直接显示给用户的片段。

### 3. 等待完整回合

`await session.prompt(...)` 会等到本轮 agent 完成。它不是只等待第一个 token；工具、重试和必要的后续回合也属于这次调用的生命周期。

### 4. 始终释放会话

`try/finally` 是必要的。即使模型请求失败，也要调用 `dispose()`，否则监听器、重试计时器或工具资源可能继续存活。

## 运行

在本项目根目录执行：

```powershell
npm install --ignore-scripts
npm run typecheck
npm run start:s01
```

本章需要一个可用的 Pi 模型和认证。没有认证时，程序会在 `session.prompt()` 前后给出认证错误；这不是 TypeScript 或项目路径错误。

## 观察

运行时记录三类信息：

- `session`：会话 ID，由 `SessionManager` 管理；
- `model`：最终选中的 provider 和模型；
- 连续的文本片段：来自 `message_update`，不是一次性拼接的返回值。

可以把 `tools: []` 改成删除，再运行一次。你会看到默认工具可能被重新启用，这说明“没有传配置”和“明确关闭工具”不是同一件事。

## 练习

1. 把 prompt 改成要求模型输出三句话，观察文本增量如何到达。
2. 删除 `SessionManager.inMemory()`，重新运行并查看默认会话目录的变化。
3. 把 `session.dispose()` 临时移出 `finally`，说明为什么异常路径会留下资源。

## 边界

本章不讨论：

- 单个事件的完整顺序；
- 工具注册和权限；
- 模型运行时的多 provider 配置；
- 会话 JSONL 的恢复和分支。

这些内容分别在后续章节展开。对应的 Pi 源码入口是 `packages/coding-agent/src/core/sdk.ts` 的 `createAgentSession`。
