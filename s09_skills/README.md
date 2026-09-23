# s09: Skill 是按需加载的教学规则

## 目标

理解真实 `SKILL.md` 如何被发现、列入系统提示，以及何时读取完整正文；区分技能与每次都直接写进 system prompt 的规则。

## 问题

如果每个任务都塞入所有专项说明，模型上下文会膨胀。Pi 先让模型看到 skill 的名称、描述和路径；需要时可调用 `read`，或由用户显式输入 `/skill:name` 展开内容。本例提供一个实际存在的 [`SKILL.md`](./lesson-summary/SKILL.md)，不用不存在的虚拟路径。

## 调用链

```text
DefaultResourceLoader.reload()
  -> additionalSkillPaths -> SKILL.md 元数据
  -> skillsOverride 只保留本章 skill
createAgentSession({ resourceLoader })
  -> AgentSession.systemPrompt 的 skill 列表
session.prompt("/skill:lesson-summary ...")
  -> 读取 SKILL.md 正文 -> 形成用户消息 -> Agent 回合
```

## 代码拆解

`fileURLToPath(new URL(..., import.meta.url))` 使样例路径相对代码文件而非当前终端目录。`additionalSkillPaths` 加入真实文件；`skillsOverride` 只筛选本章内容，避免本机其他 skill 干扰观察。`tools: ["read"]` 允许模型自行读取技能文件，但不开放写文件或 shell。

技能的 frontmatter 提供 `name` 和 `description`；正文不会仅因为被发现就自动全部进入系统提示。显式 `/skill:lesson-summary` 由会话层展开，之后才发送给模型。

## 运行

```powershell
npm run start:s09
npm run start:s09 -- --run
```

默认命令只检查加载，不发送模型请求；`--run` 需要有效模型认证，可能产生费用。

## 观察

- `loaded skill` 应为 `lesson-summary`；
- `skill path` 指向本项目真实文件；
- `advertised in system prompt` 应为 `true`；
- 只有 `--run` 才会触发 prompt 和流式输出。

## 练习

把 `SKILL.md` 中的三行格式改为四行，再使用 `--run` 对比回复；删除 `additionalSkillPaths` 后观察加载断言如何失败。

## 边界

Skill 是指令资源，不是可执行代码或权限边界；本章不安装远端 skill，也不让 skill 自行修改文件。对照 Pi 源码：`packages/coding-agent/src/core/skills.ts`、`resource-loader.ts`、`agent-session.ts`。
