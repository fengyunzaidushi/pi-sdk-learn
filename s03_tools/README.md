# s03: 工具不是循环，工具是能力边界

s01 关闭了工具，s02 只观察事件。本章重新打开一组只读工具，学习如何限制模型可以采取的动作。

## 目标

你将掌握：

- `tools: string[]` 是工具名称 allowlist；
- `getActiveToolNames()` 是当前实际暴露给 agent 的工具集合；
- 工具执行通过 `tool_execution_start` / `tool_execution_end` 事件可观察；
- 工具结果会回到 agent 上下文，模型可以据此继续推理。

## 问题

“默认开启所有工具”对演示很方便，但对应用不是安全边界。一个只需要检查代码的任务，不应该同时拥有写文件和执行 shell 的权限。

工具选择应该是显式策略：

```text
tools: ["read", "grep", "find", "ls"]
```

这表示本会话只把四个已注册工具放进 agent 的工具列表。没有写入和 shell 工具，模型即使提出对应调用，也无法执行。

## 一次工具回合

```text
assistant message(toolCall: ls)
  -> tool_execution_start
  -> 内置 ls 执行
  -> tool_execution_end
  -> toolResult message 写入 transcript
  -> 下一次模型请求
  -> assistant 最终文本
```

工具调用不是普通函数返回值。它是 agent 回合中的一条消息转换，结果会成为下一次模型请求的上下文。

## 代码拆解

### 工具 allowlist

```ts
const { session } = await createAgentSession({
  tools: ["read", "grep", "find", "ls"],
});
```

名称由 Pi 的工具注册表解析。`session.getActiveToolNames()` 用来验证最终结果，不要只相信配置对象。

### 工具事件

`tool_execution_start` 适合显示“正在读取什么”，`tool_execution_end` 适合收尾和显示错误状态。工具输出本身在 `toolResult` 消息中，应用可以从事件的 `result` 字段或最终 `session.messages` 读取。

### 为什么 prompt 要明确工具

模型决定是否调用工具。allowlist 只决定它能调用什么，不保证它一定调用某个工具。因此示例 prompt 明确要求使用 `ls`，并把观察重点放在事件，而不是把工具调用当成代码的硬分支。

## 运行

工具章节请在临时目录中运行，避免让模型接触不应读取的文件：

```powershell
mkdir C:\Temp\pi-sdk-learn-s03
cd C:\Temp\pi-sdk-learn-s03
npx --prefix F:\code\github\05\pi-sdk-learn --no-install tsx F:\code\github\05\pi-sdk-learn\s03_tools\code.ts
```

也可以直接在教程根目录运行：

```powershell
cd F:\code\github\05\pi-sdk-learn
npm run start:s03
```

第二种方式的工作目录是教程项目本身。

## 观察

- 启动时打印的 active tools 不应包含 `bash`、`edit` 或 `write`；
- 工具事件发生在 assistant 工具调用之后、最终文本之前；
- 工具执行失败时仍然会产生 `tool_execution_end`，但 `error=true`；
- `session.prompt()` 返回后，工具结果已经进入消息状态。

如果模型没有调用 `ls`，不要立即修改循环。先检查模型是否理解 prompt、`ls` 是否在 active tools 中，以及是否有 provider 返回了不同的工具调用格式。

## 练习

1. 删除 `ls`，只保留 `read`，观察模型如何调整行为。
2. 加入 `bash` 后要求模型执行 `pwd`，比较能力边界变化。
3. 把 `session.getActiveToolNames()` 的结果写入启动日志，作为审计记录。

## 边界

allowlist 不是完整的权限系统。它只能控制“哪些工具存在”；工具内部的路径校验、危险命令审批和项目可信度属于更细的安全层。下一期会增加自定义工具和扩展 hook，并说明它们的生命周期边界。
