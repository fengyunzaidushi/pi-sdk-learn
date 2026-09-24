// 导入把 file: URL 转换为本地文件路径的 Node.js 工具。
import { fileURLToPath } from "node:url";
// 导入会话、资源加载器和会话存储相关 API。
import {
  // 导入 Agent 会话装配函数。
  createAgentSession,
  // 导入负责发现和合并 skill 等资源的默认加载器。
  DefaultResourceLoader,
  // 导入默认 Pi Agent 配置目录查询函数。
  getAgentDir,
  // 导入会话管理器，以便使用内存会话。
  SessionManager,
} from "@earendil-works/pi-coding-agent";

// 获取当前进程工作目录，作为资源发现的项目根目录。
const cwd = process.cwd();
// 基于当前模块位置解析本章真实 SKILL.md 的绝对路径。
const skillPath = fileURLToPath(new URL("./lesson-summary/SKILL.md", import.meta.url));
// 创建仅保留本章技能的默认资源加载器。
const loader = new DefaultResourceLoader({
  // 指定项目级资源发现的根目录。
  cwd,
  // 指定用户级资源目录；稍后会用 override 过滤非本章技能。
  agentDir: getAgentDir(),
  // 把本章 SKILL.md 加入额外技能搜索路径。
  additionalSkillPaths: [skillPath],
  // 禁止加载扩展，让实验只聚焦 skill。
  noExtensions: true,
  // 禁止加载 prompt template，避免资源列表混入其他类型。
  noPromptTemplates: true,
  // 禁止加载 AGENTS 上下文文件，减少 system prompt 干扰项。
  noContextFiles: true,
  // 在技能发现完成后过滤结果，只保留本章文件。
  skillsOverride: (current) => ({
    // 用绝对文件路径精确筛选 lesson-summary 技能。
    skills: current.skills.filter((skill) => skill.filePath === skillPath),
    // 原样保留资源发现阶段的诊断信息。
    diagnostics: current.diagnostics,
  }),
});
// 执行一次资源刷新，让技能发现和 override 真正生效。
await loader.reload();

// 从加载器快照中读取最终技能列表及诊断。
const { skills, diagnostics } = loader.getSkills();
// 发现资源警告时打印出来，但不静默吞掉诊断。
if (diagnostics.length > 0) console.warn("skill diagnostics:", diagnostics);
// 断言过滤结果只有一个且名称与本章预期一致。
if (skills.length !== 1 || skills[0].name !== "lesson-summary") {
  // 资源集合不确定时立即失败，避免后续演示基于错误 skill。
  throw new Error("Expected exactly one lesson-summary skill");
}

// 使用已加载技能的 ResourceLoader 创建内存会话。
const { session } = await createAgentSession({
  // 让会话与资源加载器使用同一项目目录。
  cwd,
  // 注入已完成刷新和过滤的资源加载器。
  resourceLoader: loader,
  // 使用内存会话，避免本章写入真实会话历史。
  sessionManager: SessionManager.inMemory(cwd),
  // 只开放 read 工具，以满足该 skill 可能读取教程文件的需要。
  tools: ["read"],
});

// 确保可选真实模型回合结束后释放会话。
try {
  // 打印最终加载的技能名称。
  console.log("loaded skill:", skills[0].name);
  // 打印技能来源文件，验证实际加载的是本章 SKILL.md。
  console.log("skill path:", skills[0].filePath);
  // 检查会话 system prompt 是否向模型公开了该技能名称。
  console.log("advertised in system prompt:", session.systemPrompt.includes("lesson-summary"));
  // 只有用户显式传入 --run 时才发送可能产生费用的模型请求。
  if (process.argv.includes("--run")) {
    // 订阅会话事件以流式显示模型回复。
    session.subscribe((event) => {
      // 从 assistant 消息更新中筛选文本增量。
      if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
        // 将每段文本增量直接写到标准输出。
        process.stdout.write(event.assistantMessageEvent.delta);
      }
    });
    // 通过 /skill:name 语法显式调用 lesson-summary 技能。
    await session.prompt("/skill:lesson-summary Summarize the Pi session lifecycle from s01 in three lines.");
    // 在流式回复结束后补一个换行。
    process.stdout.write("\n");
  }
} finally {
  // 清理会话及其订阅和工具资源。
  session.dispose();
}
