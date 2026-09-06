# s07: Agent 状态与会话持久化是两层

`Agent` 的 messages 是当前运行状态，`SessionManager` 的 JSONL 文件是可恢复的会话历史。把二者混成一个对象，会很难解释 resume、分支和恢复失败。

## 目标

你将掌握：

- `SessionManager.create()` 创建持久会话；
- `SessionManager.open()` 从指定 JSONL 文件重新打开；
- `SessionManager.continueRecent()` 选择最近会话；
- `SessionManager.inMemory()` 与持久会话的差异。

## 问题

如果只把消息保存在内存，进程退出后无法恢复；如果每次都把完整 transcript 手动塞回 prompt，又会绕过 Pi 的会话树和元数据。

Pi 把持久化边界交给 `SessionManager`：

```text
Agent.state.messages       当前回合可用的内存快照
SessionManager JSONL       会话入口、消息、模型和分支记录
```

本章使用临时目录，所以不会污染项目或 `~/.pi/agent/sessions`。代码写入一对确定性的 user/assistant fixture 来触发 JSONL flush，不需要调用模型；真实 prompt 持久化会在后续实验中验证。

## 代码拆解

### 创建

```ts
SessionManager.create(cwd, sessionDir)
```

第一次 `createAgentSession` 会准备会话元数据；会话文件在第一条 assistant 消息出现时才会 flush。本例用 fixture 模拟这个持久化边界，这比只打印一个尚不存在的路径更可靠。

### 打开与继续

`open(path)` 是确定性恢复；`continueRecent(cwd, dir)` 是按最近时间选择。生产应用应该记录选择依据，并在模型无法恢复时处理 `modelFallbackMessage`。

### 清理

教程用 `mkdtemp` 和 `rm` 包住实验。持久化示例如果不清理临时目录，测试会变成隐式的外部状态依赖。

## 运行

```powershell
npm run typecheck
npm run start:s07
```

本章不发送模型请求。

## 观察

- `created` 是临时目录中的 JSONL 文件；
- `listed session ids` 能发现刚创建的会话；
- `reopened: true` 说明 `open()` 恢复了同一个 session ID；
- 最后打印的 `continued` 来自最近会话选择，而不是新建的内存会话。

## 练习

1. 在 `first.session` 上发送一条 prompt，再用 `open()` 检查恢复后的 message 数量。
2. 删除临时目录清理，观察第二次运行是否还能看到旧会话。
3. 使用 `SessionManager.inMemory()` 替换 `create()`，比较 `sessionFile` 和 list 结果。

## 边界

本章只讲单个会话文件的创建和恢复，不讲多个 cwd 之间如何替换活动会话。那是 `AgentSessionRuntime` 的职责，下一章展开。
