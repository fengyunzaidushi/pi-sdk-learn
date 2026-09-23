# s10: Prompt template 展开输入

## 目标

加载真实 Markdown 模板，理解 `/lesson-brief ...` 如何在 `session.prompt()` 中展开为普通用户消息。

## 问题

重复任务常带相同输入结构。把提示词放进 Markdown，可以让命令入口复用；模板本身不调用模型、不提供新工具，也不是扩展 hook。

## 调用链

```text
prompts/lesson-brief.md
  -> DefaultResourceLoader.reload()
  -> session.promptTemplates
  -> session.prompt('/lesson-brief "AgentSession" developer')
  -> 替换 $1、${2:-a beginner} -> Agent.prompt(展开后的用户消息)
```

## 代码拆解

模板名来自 `lesson-brief.md` 文件名，frontmatter 的 `description` 和 `argument-hint` 提供命令说明。正文中的 `$1` 是第一个位置参数，`${2:-a beginner}` 在缺少第二个参数时使用默认值。`promptsOverride` 把本机其他模板排除，便于重复验证。

代码在 `--run` 时打印 `message_end(user)`，让你看到送给模型的是展开后的文本，而不是斜杠命令本身。

## 运行

```powershell
npm run start:s10
npm run start:s10 -- --run
```

默认只显示模板元数据与正文，不发起模型请求；`--run` 会真实请求模型并可能产生费用。

## 观察

- 命令是 `/lesson-brief`；
- 不带 `--run` 时不会出现 user 消息；
- 带 `--run` 时 user 消息中的 `$1` 已变成 `AgentSession`；
- 改为只传一个参数，可观察默认受众被使用。

## 练习

把模板改为使用 `$@` 输出所有参数；再把第二个参数省略，比较模板的默认值行为。

## 边界

模板只转换输入文本，不负责 system prompt、工具权限或会话存储。对照 Pi 源码：`packages/coding-agent/src/core/prompt-templates.ts`、`agent-session.ts`。
