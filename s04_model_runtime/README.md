# s04: ModelRuntime 负责什么

前三章把模型当成默认配置。本章把它显式拿出来，回答“模型从哪里来、认证在哪里检查、thinking level 为什么可能变化”。

## 目标

你将掌握：

- `ModelRuntime` 是模型目录和认证运行时，而不是单个模型对象；
- `getAvailable()` 只返回当前认证可用的模型；
- `createAgentSession({ model })` 可以固定本次会话的模型；
- `thinkingLevel` 会根据模型能力被约束，传入值不一定是最终值。

## 问题

把 provider、模型 ID 和 API key 写死在每个脚本里，会导致配置重复和泄露风险。Pi 把这些职责收进 `ModelRuntime`：

```text
auth.json / models.json
        |
        v
ModelRuntime
  - 模型注册和查找
  - provider 认证
  - 可用模型筛选
        |
        v
createAgentSession({ modelRuntime, model })
```

模型对象描述“调用哪个模型”；`ModelRuntime` 负责“这个模型是否被注册、如何认证和如何发请求”。

## 代码拆解

### 列出可用模型

```ts
const modelRuntime = await ModelRuntime.create();
const availableModels = await modelRuntime.getAvailable();
```

`getAvailable()` 是异步的，因为认证状态可能需要读取文件或刷新凭证。空数组不是 SDK 崩溃，表示当前没有可用的已认证模型。

### 固定本次会话模型

```ts
const { session } = await createAgentSession({
  modelRuntime,
  model: selectedModel,
  thinkingLevel: "high",
});
```

显式传 `model` 后，初始化不会再根据默认设置猜测模型。这样测试和产品请求都更容易复现。

### thinking level 是有效值，不是回显值

模型可能不支持所有思考级别。`createAgentSession` 会根据模型能力 clamp，应该读取 `session.thinkingLevel` 判断最终值。

## 运行

这一章只创建会话，不发送模型 prompt，因此没有可用认证时也能完成结构实验：

```powershell
npm run typecheck
npm run start:s04
```

如果你已经配置认证，输出会列出可用模型和最终 thinking level。

## 观察

比较两种情况：

1. 没有认证：`availableModels` 为空，脚本正常结束，但不能运行 prompt；
2. 有多个 provider：列表中可能有多个模型，但本章明确选择第一个，只用于演示，不代表生产排序策略。

把 `thinkingLevel` 从 `high` 改为 `off`，再比较输出。不要用 provider 名称推断模型是否支持 reasoning，使用返回的模型字段和会话最终状态。

## 练习

1. 根据 `provider` 过滤模型，而不是总是选择第一个。
2. 把模型选择结果保存到一段 JSON 日志中，隐藏 API key。
3. 给 `createAgentSession` 传一个不存在的模型，观察恢复和错误边界。

## 边界

本章不自定义 provider，也不直接调用 `streamSimple`。provider 协议属于 `pi-ai`；应用通常通过 `ModelRuntime` 和 `createAgentSession` 组合它。下一章讨论资源加载和 system prompt，而不是把所有上下文硬编码在 prompt 字符串里。
