// 导入把 file: URL 转成本地绝对路径的 Node.js 工具。
import { fileURLToPath } from "node:url";
// 导入会话和模板资源加载所需的 Pi API。
import {
  // 导入 Agent 会话装配函数。
  createAgentSession,
  // 导入能够发现 Markdown prompt template 的默认资源加载器。
  DefaultResourceLoader,
  // 导入默认 Pi Agent 配置目录查询函数。
  getAgentDir,
  // 导入会话管理器，以便使用内存存储。
  SessionManager,
} from "@earendil-works/pi-coding-agent";

// 获取当前工作目录，作为项目资源根目录。
const cwd = process.cwd();
// 根据当前模块 URL 解析本章 Markdown 模板的绝对路径。
const templatePath = fileURLToPath(new URL("./prompts/lesson-brief.md", import.meta.url));
// 创建只保留 lesson-brief 模板的资源加载器。
const loader = new DefaultResourceLoader({
  // 指定项目资源发现根目录。
  cwd,
  // 指定用户级 Pi Agent 资源目录。
  agentDir: getAgentDir(),
  // 将本章模板文件加入额外模板路径。
  additionalPromptTemplatePaths: [templatePath],
  // 禁止扩展加载，避免无关 hook 改变会话。
  noExtensions: true,
  // 禁止 skill 加载，让 system prompt 保持聚焦。
  noSkills: true,
  // 禁止上下文文件加载，避免本机 AGENTS 内容影响实验。
  noContextFiles: true,
  // 在模板发现完成后仅保留本章目标文件。
  promptsOverride: (current) => ({
    // 通过绝对路径精确筛选 lesson-brief 模板。
    prompts: current.prompts.filter((template) => template.filePath === templatePath),
    // 保留加载过程中产生的模板诊断信息。
    diagnostics: current.diagnostics,
  }),
});
// 刷新资源快照，完成模板读取、解析和过滤。
await loader.reload();

// 使用已经加载模板的 ResourceLoader 创建内存会话。
const { session } = await createAgentSession({
  // 保持会话与加载器使用同一工作目录。
  cwd,
  // 注入模板资源加载器。
  resourceLoader: loader,
  // 避免模板实验写入真实会话 JSONL。
  sessionManager: SessionManager.inMemory(cwd),
  // 不开放工具，让本章只观察输入文本展开。
  tools: [],
});

// 确保可选真实模型回合完成后清理会话。
try {
  // 从 AgentSession 读取最终可用的 prompt template 快照。
  const templates = session.promptTemplates;
  // 断言模板过滤结果唯一且名称来自 lesson-brief.md。
  if (templates.length !== 1 || templates[0].name !== "lesson-brief") {
    // 模板集合不符合预期时立即报错，防止观察错误对象。
    throw new Error("Expected exactly one lesson-brief template");
  }
  // 打印用户可输入的斜杠命令名称。
  console.log("command:", `/${templates[0].name}`);
  // 打印 frontmatter 中声明的参数提示。
  console.log("argument hint:", templates[0].argumentHint);
  // 打印去除首尾空白后的模板正文。
  console.log("template body:", templates[0].content.trim());

  // 仅在命令行显式传入 --run 时发起真实模型请求。
  if (process.argv.includes("--run")) {
    // 订阅会话事件，同时观察展开后的用户消息和模型文本。
    session.subscribe((event) => {
      // 用户消息结束时输出真正送入 transcript 的展开结果。
      if (event.type === "message_end" && event.message.role === "user") {
        // 打印替换位置参数后的消息内容。
        console.log("expanded user message:", event.message.content);
      }
      // 从 assistant 消息更新中筛选文本增量。
      if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
        // 将模型文本增量实时写入标准输出。
        process.stdout.write(event.assistantMessageEvent.delta);
      }
    });
    // 调用模板命令，并分别传入主题和受众两个位置参数。
    await session.prompt('/lesson-brief "AgentSession" developer');
    // 在流式输出完成后补换行。
    process.stdout.write("\n");
  }
} finally {
  // 释放会话及其订阅资源。
  session.dispose();
}
