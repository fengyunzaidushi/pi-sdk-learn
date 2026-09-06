# s06: 扩展挂在生命周期上

工具 allowlist 解决“哪些能力可用”，但应用还需要记录工具调用、注入事件处理和注册自己的能力。本章使用 Pi 的 extension API，不修改 agent loop。

## 目标

你将掌握：

- `extensionFactories` 如何把内联扩展装入 `ResourceLoader`；
- `pi.on()` 如何监听 agent 生命周期；
- `pi.registerTool()` 如何注册带 TypeBox schema 的自定义工具；
- `tools: ["uppercase"]` 如何只启用本章工具。

## 问题

如果把日志、指标和自定义工具直接写进业务 prompt 或 `Agent` 循环，每增加一个能力都要修改核心控制流。扩展的目的正是把这些行为挂在稳定事件上：

```text
agent_start -> hook
tool_call   -> hook
tool execute -> tool result
```

核心循环继续负责模型和工具结果的协议，扩展只订阅和注册。

## 自定义工具的四个部分

```ts
pi.registerTool({
  name,
  description,
  parameters: Type.Object(...),
  execute: async (...) => ({ content, details }),
});
```

`description` 给模型看，`parameters` 用于参数校验，`execute` 才是实际副作用边界。返回值必须是 Pi 的工具结果，而不是随意的字符串。

## 代码拆解

本章默认只做结构实验，不发送模型请求。启动后打印 active tools 和 registered tools，证明扩展已经完成加载和工具注册。

需要观察真实工具回合时，加上 `--run`：

```powershell
npm run start:s06 -- --run
```

这会发送真实 prompt，并要求模型调用 `uppercase`。若模型没有调用，先检查 prompt 和 active tool 列表，不要把工具执行硬编码进循环。

## 运行

```powershell
npm run typecheck
npm run start:s06
npm run start:s06 -- --run
```

不带 `--run` 的命令不调用模型；带 `--run` 的命令需要认证并可能产生费用。

## 观察

- `registered tools` 来自扩展注册表；
- `active tools` 是本会话实际暴露给模型的集合；
- 未使用 `--run` 时不会出现 `agent_start`，因为没有 agent 回合；
- 使用 `--run` 时，hook 事件和流式文本来自同一次会话。

## 练习

1. 添加一个 `length` 工具，返回输入字符数。
2. 在 `tool_call` hook 中记录工具名和时间戳，但不要修改工具实现。
3. 把 `tools` 改成空数组，确认工具仍注册但不再 active。

## 边界

extension hook 可以观察、修改或阻止部分行为，但它不是权限系统的替代品。危险命令、路径访问和项目可信度仍需要明确的安全策略。扩展上下文也属于会话生命周期，切换 session 后必须重新绑定。
