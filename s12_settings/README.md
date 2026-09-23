# s12: SettingsManager 的配置层

## 目标

在不改动 `~/.pi/agent/settings.json` 的情况下调整压缩、重试和默认思考级别，并区分“设置中的默认值”和“当前会话最终生效值”。

## 问题

在示例里直接调用 `SettingsManager.create(cwd)` 再 `setDefaultThinkingLevel()` 可能写入真实用户配置。本章使用 `inMemory()`，把可验证行为和文件持久化分开。

## 调用链

```text
SettingsManager.inMemory(initial)
  -> setDefaultThinkingLevel(...) / flush()
  -> DefaultResourceLoader.reload()（刷新存储快照）
  -> applyOverrides(...)（最后施加本次运行的覆盖值）
  -> createAgentSession({ settingsManager, resourceLoader })
  -> AgentSession 读取当前设置
```

## 代码拆解

`applyOverrides()` 给当前配置快照叠加局部值，不写入存储。先调用 setter 和 `flush()`，再 `resourceLoader.reload()`，最后应用 override：setter 或 loader 的 reload 都会重新计算设置快照，之前施加的覆盖值会丢失。`getCompactionSettings()`、`getRetrySettings()` 输出最后的配置快照。本章使用内存后端，因此 `flush()` 不会写磁盘。`drainErrors()` 用于让应用处理写入异常。

`session.thinkingLevel` 不必等于 `getDefaultThinkingLevel()`：创建会话时，Pi 会结合模型能力约束思考级别，甚至在没有模型时将其设为 `off`。因此一个值表示偏好，另一个表示当前有效状态。

## 运行

```powershell
npm run start:s12
```

本章只创建会话，不发送模型请求。

## 观察

- `before` 与 `after` 的压缩和重试设置不同；
- `same settings manager` 应为 `true`；
- `defaultThinking` 是设置偏好，`effective thinking level` 是会话生效值；
- 运行后用户的 `settings.json` 不应被本章修改。

## 练习

改动 `maxRetries` 并再次运行；把 `applyOverrides()` 移到 `resourceLoader.reload()` 前面，比较 reload 后覆盖值是否仍在。这说明 override 是当前快照，而不是持久配置。

## 边界

设置本身不会触发模型回合；本章不测试自动重试或压缩执行。文件存储需要单独处理并发写入与错误，不应拿真实用户配置做教程实验。对照 Pi 源码：`packages/coding-agent/src/core/settings-manager.ts`、`sdk.ts`。
