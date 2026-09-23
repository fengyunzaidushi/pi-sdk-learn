# s11: ModelRuntime 的认证边界

## 目标

了解 SDK 如何定位认证文件、注入仅当前运行时可见的 API key，并把同一个 `ModelRuntime` 传入 `createAgentSession()`；全程不提交或打印密钥。

## 问题

把 `"sk-..."` 写进教程会泄露凭证，也容易把“已设置 key”和“key 被服务端接受”混为一谈。Pi 的模型运行时负责凭证来源，应用只在边界处决定从哪里加载。

## 调用链

```text
临时 agentDir/auth.json（本例为空）或可选环境变量
  -> ModelRuntime.create({ authPath, modelsPath: null })
  -> 可选 setRuntimeApiKey(provider, key)
  -> createAgentSession({ modelRuntime })
```

## 代码拆解

本章使用临时 `agentDir`，明确给出 `authPath` 和 `modelsStorePath`，不读取 `~/.pi/agent/auth.json`。`modelsPath: null` 关闭自定义模型配置文件读取，不等于禁用内置模型。`refreshOnCreate: false` 和 `allowModelNetwork: false` 避免启动时刷新在线模型目录。

如果环境变量 `PI_SDK_LEARN_API_KEY` 存在，`setRuntimeApiKey()` 会把它交给指定 provider 的运行时；示例只打印布尔值。`hasConfiguredAuth()` 表示有凭证来源，不证明凭证有效，也不代表模型调用已成功。某些 provider 还可能从自己的环境变量读取凭证，因此隔离 auth 文件不等于清空进程环境。

创建的临时目录在 `finally` 中核对位置后删除；示例不发送 prompt，不把密钥写到项目文件或输出日志。

## 运行

```powershell
npm run start:s11
```

可选：只在当前 PowerShell 会话中提供你自己的 key，示例不会发送模型 prompt：

```powershell
$env:PI_SDK_LEARN_PROVIDER = "anthropic"
$env:PI_SDK_LEARN_API_KEY = "你的真实密钥"
npm run start:s11
Remove-Item Env:PI_SDK_LEARN_API_KEY
```

不要把真实密钥填进源码、提交记录或聊天消息。凭证缺失时默认实验仍可运行。

## 观察

- 不设置自定义环境变量时，看到 `runtime override skipped`；
- `same model runtime` 应为 `true`；
- `selected model: (none; Agent holds an unknown placeholder)` 可能正常：无可用模型时底层状态仍有占位模型，但不能发 prompt；
- 设置 key 后的布尔值仅表示配置，不做联网有效性验证。

## 练习

将 `authPath` 改为另一临时目录，比较当前实例和新实例的凭证来源；不要打印原始 key。查阅 `ModelRuntime.checkAuth()` 的返回类型，解释为什么它与 `hasConfiguredAuth()` 不同。

## 边界

本章不演示 OAuth 浏览器登录或实际 API 请求：它们需要用户选择 provider、账户授权与可能的费用，不能用假的密钥代替。对照 Pi 源码：`packages/coding-agent/src/core/model-runtime.ts`、`sdk.ts`。
