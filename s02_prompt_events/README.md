# s02: Prompt、事件与状态

s01 证明了会话可以运行。本章回答另一个问题：一个 agent 回合发生了什么，应用应该观察什么，而不是猜测内部状态。

## 目标

你将掌握：

- `session.subscribe()` 的事件订阅边界；
- `message_update` 为什么适合做流式 UI；
- `session.messages` 和 `session.agent.state` 的关系；
- `session.prompt()` 返回时，为什么可以认为本轮已结束。

## 问题

如果程序只等待一个最终字符串，就无法显示流式响应，也无法知道 agent 是否调用了工具、是否发生了错误或是否仍在处理队列。

反过来，如果 UI 直接读取私有字段，就会和实现细节绑定。Pi 的解决方案是：用事件观察过程，用公开状态读取当前快照。

## 稳定的事件骨架

一次没有工具调用的回合通常遵循这个顺序：

```text
agent_start
  -> turn_start
  -> message_start(user)
  -> message_end(user)
  -> message_start(assistant)
  -> message_update(text_delta)*
  -> message_end(assistant)
  -> turn_end
  -> agent_end
  -> agent_settled
```

具体的 `message_update` 次数取决于 provider。不要按固定 token 数编程；只依赖事件的偏序，例如 `message_end` 在同一条消息的更新之后出现。

## 代码拆解

### 事件是过程，messages 是结果

代码把每个事件类型记录到 `eventNames`，同时在 `text_delta` 到达时立即写出文本。回合结束后再读取：

```ts
console.log("message roles:", session.messages.map((message) => message.role));
```

`messages` 是当前 agent transcript 的公开快照；它不是事件日志的替代品。UI 需要增量更新时订阅事件，导出或统计时读取消息状态。

### AgentSession 和 Agent 的边界

`session.agent` 暴露底层 `Agent`，用于需要更低层控制的应用。一般业务代码优先使用 `session.prompt()`，因为 `AgentSession` 还负责 prompt 模板、扩展、持久化、压缩和重试。

### `isIdle` 是生命周期状态

`await session.prompt()` 返回后，本例打印 `isIdle: true`。在流式期间不要以“没有新的文本片段”判断空闲；正确的边界是 `agent_settled` 或 `session.isIdle`。

## 运行

```powershell
npm run typecheck
npm run start:s02
```

本章会发送一次不带工具的真实 prompt。若只想检查代码，不发送请求，可以运行 `npm run typecheck`。

## 观察

重点看三件事：

1. `message_update` 通常出现多次，而 `message_end` 每条消息只出现一次；
2. 用户消息和 assistant 消息都进入 `session.messages`；
3. `prompt()` 返回之前，事件监听器仍然可能在处理最后的 settled 生命周期。

可以把监听器中的 `eventNames.push` 删除，再比较 UI 是否仍然能显示文本。显示文本只需要 `message_update`，但审计和状态同步通常需要完整事件流。

## 练习

1. 只打印 `agent_start`、`tool_execution_start` 和 `agent_settled`，构建一个最小进度指示器。
2. 在 `message_end` 时统计 assistant 消息的字符数。
3. 把 `session.messages` 改成 `session.agent.state.messages`，说明两者为什么能得到同一份当前状态。

## 边界

本章不改变 agent 的控制流，只观察它。事件监听器也不应该通过修改消息数组来阻止工具或改变模型请求；控制工具要使用工具配置或扩展 hook。下一章进入工具 allowlist。
