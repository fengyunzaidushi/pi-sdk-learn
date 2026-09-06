# s05: 资源加载就是上下文边界

system prompt、项目说明和 AGENTS 文件是 agent 的知识来源。把它们全部拼进每个 `prompt` 会让业务代码不可维护，也无法区分全局规则和项目规则。

## 目标

你将掌握：

- `DefaultResourceLoader` 负责发现和合并资源；
- `systemPromptOverride` 可以替换基础 system prompt；
- `agentsFilesOverride` 可以注入结构化的项目上下文；
- `createAgentSession` 会把资源加载结果应用到 agent 状态。

## 问题

假设应用有一条固定规则：“回答简短，并先给命令”。如果每次调用都写：

```ts
session.prompt(`${rules}\n\n${userText}`)
```

规则会和用户输入混在一起，无法审计，也无法在扩展或不同会话之间复用。资源加载器提供了更稳定的边界。

## 工作流

```text
DefaultResourceLoader
  -> reload()
  -> system prompt / context files / skills / prompts
  -> createAgentSession
  -> Agent.state.systemPrompt
```

`reload()` 是明确的资源刷新点。创建会话后，代码可以通过 `session.systemPrompt` 和 loader 的资源查询 API 验证当前快照。

## 代码拆解

本章使用两个覆盖函数：

- `systemPromptOverride`：替换默认 system prompt，避免示例受到用户机器上已有提示词影响；
- `agentsFilesOverride`：在不写入磁盘的情况下加入一份教学用 `AGENTS.md` 内容。

真实项目可以让 loader 从 cwd 和 `~/.pi/agent` 发现文件，也可以在测试中用 override 提供确定输入。二者都是资源层能力，不需要修改 `Agent` 或循环。

## 运行

```powershell
npm run typecheck
npm run start:s05
```

本章只创建会话和打印 system prompt，不发送模型请求。

## 观察

- `context files` 中包含 `<lesson>/AGENTS.md`；
- system prompt 使用 override 的教学角色；
- `tools: []` 仍然有效，说明工具选择和资源加载是两个独立维度；
- loader 的资源查询结果是结构化对象，不需要从最终 prompt 反向解析文件名。

## 练习

1. 把教学上下文改成项目编码规范，观察 system prompt 是否变化。
2. 删除 `appendSystemPromptOverride`，比较用户全局追加提示词对实验的影响。
3. 为不同 cwd 创建两个 loader，确认资源应绑定到目标工作目录，而不是进程启动目录。

## 边界

本章不讨论 skill 的按需展开，也不把资源内容当成用户命令。资源提供背景和规则；当前用户 prompt 仍然是当前任务的直接输入。下一章增加扩展 hook 和自定义工具。
