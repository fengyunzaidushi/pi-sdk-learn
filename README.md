# Pi SDK Learn

这是一个独立的 Pi SDK 入门教程。它使用 npm 发布包，不依赖 `pi` monorepo 的源码路径、构建产物或内部脚本。

教程的目标不是背 API，而是建立一条可验证的心智模型：一个 prompt 如何进入会话，模型如何产生事件和工具调用，Pi 如何保存状态，以及应用如何在不修改核心循环的情况下增加能力。

## 先建立正确的分层

```text
你的应用
  └─ AgentSession：prompt、事件、工具选择、资源、持久化
       └─ Agent：状态、队列、回合生命周期
            └─ runAgentLoop：模型响应、工具执行、继续下一轮
                 └─ pi-ai：provider、模型协议、流式响应
```

`createAgentSession()` 是 `pi-coding-agent` 的装配入口。它创建模型运行时、资源加载器、设置管理器、会话管理器和底层 `Agent`，最后返回 `AgentSession`。实际的 agent 回合由 `Agent` 和 `runAgentLoop` 执行。

这一区分会贯穿全教程：

| 问题 | 应该先看什么 |
| --- | --- |
| 如何启动一个 Pi agent | `createAgentSession` |
| prompt 如何变成模型请求 | `Agent.prompt`、`runAgentLoop` |
| 如何监听流式文本和工具 | `AgentSession.subscribe` |
| 如何控制工具、资源和扩展 | `AgentSession` 配置和 `DefaultResourceLoader` |
| 如何恢复、分支和替换会话 | `SessionManager`、`AgentSessionRuntime` |

## 学习约定

每一章都包含：

1. 一个具体问题，而不是 API 列表；
2. 一个最小可运行的 `code.ts`；
3. 一条从代码到 Pi 源码的调用链；
4. 可观察的实验结果；
5. 明确的验证命令和本章边界；
6. 一个小练习，要求你改变行为而不是复制代码。

章节代码默认使用真实模型。只有明确标记为结构实验的章节才不发送模型请求。运行会调用你当前 Pi 配置中的 provider，并可能产生费用；涉及工具的章节请在临时目录中运行。

## 前置条件

- Node.js `>=22.19.0`
- 一个已经配置好的 Pi 模型和认证，默认读取 `~/.pi/agent`
- PowerShell、macOS/Linux shell 均可，下面命令使用 PowerShell 语法

安装依赖：

```powershell
npm install --ignore-scripts
```

检查所有章节的类型和结构：

```powershell
npm run check
```

运行第一章：

```powershell
npm run start:s01
```

也可以直接运行任意章节：

```powershell
npx --no-install tsx .\s03_tools\code.ts
```

## 章节路线

| 章节 | 主题 | 你会掌握的对象 | 是否调用模型 |
| --- | --- | --- | --- |
| [s01](./s01_create_session/) | 创建会话 | `createAgentSession`、`prompt`、`dispose` | 是 |
| [s02](./s02_prompt_events/) | Prompt 与事件 | `subscribe`、`AgentState`、事件顺序 | 是 |
| [s03](./s03_tools/) | 工具选择 | 内置工具 allowlist、工具事件 | 是 |
| [s04](./s04_model_runtime/) | 模型运行时 | `ModelRuntime`、可用模型、thinking level | 否 |
| [s05](./s05_resources/) | 上下文资源 | `DefaultResourceLoader`、系统提示、AGENTS 文件 | 否 |
| [s06](./s06_extensions/) | 扩展与自定义工具 | `extensionFactories`、`registerTool`、hooks | 可选 |
| [s07](./s07_sessions/) | 会话持久化 | `SessionManager`、open、continue | 否 |
| [s08](./s08_runtime/) | 会话运行时 | `AgentSessionRuntime`、new/switch | 否 |

## 项目结构

```text
pi-sdk-learn/
  s01_create_session/
    README.md
    code.ts
  s02_prompt_events/
  ...
  s08_runtime/
  src/01-minimal.ts       # 早期入口，保留用于对照
  scripts/check-chapters.mjs
  package.json
  tsconfig.json
```

章节之间的关系不是“复制上一章再改几行”。每章会说明自己依赖的上一层，以及哪些能力仍然由 Pi 内部负责。你应该先读 README，再运行代码，最后打开源文件核对调用链。

## 与 Pi 源码的对照入口

当前版本的主要源码位置：

- `packages/coding-agent/src/core/sdk.ts`：`createAgentSession` 装配入口
- `packages/coding-agent/src/core/agent-session.ts`：应用层会话 façade
- `packages/agent/src/agent.ts`：底层 `Agent` 状态和 prompt 生命周期
- `packages/agent/src/agent-loop.ts`：模型响应、工具调用和继续回合的循环
- `packages/coding-agent/src/core/session-manager.ts`：JSONL 会话树和持久化
- `packages/coding-agent/src/core/agent-session-runtime.ts`：会话替换和运行时重建

本教程只依赖发布包的公开导出，不从这些源码路径导入。源码链接用于解释，不是运行时依赖。

## 完成标准

完成第一期后，你应该能够回答并验证这些问题：

- `createAgentSession` 创建了哪些对象，为什么要把它们组合起来？
- `session.prompt()` 和 `session.agent.prompt()` 的职责有什么不同？
- 一个工具调用从 `tool_execution_start` 到 `tool_execution_end` 经过什么状态？
- 为什么 `tools: []` 是工具策略，而不是删除 `Agent` 的工具执行逻辑？
- 哪些状态在 `AgentSession` 中，哪些状态在 `SessionManager` 中？
- 为什么切换会话后必须重新订阅新的 `runtime.session`？

后续章节会在这 8 章之上继续增加 compaction、subagent、skills、MCP、workflow 和 goal loop；这些能力会以新的章节加入，而不是把第一章变成一个巨型脚本。
