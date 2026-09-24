// 导入创建 Agent 会话所需的 API。
import {
  // 导入创建并初始化 Agent 会话的函数。
  createAgentSession,
  // 导入负责发现、加载和合并资源的默认加载器。
  DefaultResourceLoader,
  // 导入 Pi Agent 的默认配置目录路径。
  getAgentDir,
  // 导入会话管理器，用于选择会话的持久化策略。
  SessionManager,
} from "@earendil-works/pi-coding-agent";

// 获取当前进程的工作目录，作为资源加载和会话创建的项目根目录。
const cwd = process.cwd();
// 构造一份只存在于内存中的教学上下文文件。
const lessonContext = {
  // 指定该上下文文件在资源列表中的虚拟路径。
  path: "<lesson>/AGENTS.md",
  // 提供教学场景需要注入的 AGENTS.md 文本内容。
  content: "# Lesson Context\nPrefer short answers and show the concrete command before explaining it.",
};

// 创建默认资源加载器，并配置本次示例使用的资源来源。
const resourceLoader = new DefaultResourceLoader({
  // 告诉加载器从当前项目工作目录发现资源。
  cwd,
  // 指定用户级 Pi Agent 配置目录，供加载器读取全局资源。
  agentDir: getAgentDir(),
  // 用固定文本替换默认 system prompt，确保示例行为可预测。
  systemPromptOverride: () => "You are the Pi SDK Learn teaching assistant.",
  // 不额外追加其他 system prompt 片段。
  appendSystemPromptOverride: () => [],
  // 覆盖 AGENTS 文件列表，在内存中追加教学上下文文件。
  agentsFilesOverride: (current) => ({
    // 保留已发现的文件，并把教学上下文追加到文件列表末尾。
    agentsFiles: [...current.agentsFiles, lessonContext],
  }),
});
// 显式刷新资源快照，使加载器完成资源发现和合并。
await resourceLoader.reload();

// 创建一个使用上述资源加载器的 Agent 会话。
const { session } = await createAgentSession({
  // 将当前工作目录传给会话，作为会话运行环境的根目录。
  cwd,
  // 让会话使用已经刷新过的资源加载器。
  resourceLoader,
  // 使用内存会话管理器，避免本示例写入持久化会话文件。
  sessionManager: SessionManager.inMemory(cwd),
  // 不为本示例注册任何工具，突出资源加载行为。
  tools: [],
});

// 使用 try/finally 确保示例结束时总能释放会话资源。
try {
  // 读取资源加载器当前快照中的 AGENTS 文件列表。
  const contextFiles = resourceLoader.getAgentsFiles().agentsFiles;
  // 打印所有上下文文件的路径，验证教学文件已经被注入。
  console.log("context files:", contextFiles.map((file) => file.path));
  // 检查最终 system prompt 是否包含教学助手身份文本。
  console.log("system prompt contains lesson context:", session.systemPrompt.includes("teaching assistant"));
  // 输出提示词预览的标题。
  console.log("system prompt preview:");
  // 只打印 system prompt 的前 500 个字符，避免终端输出过长。
  console.log(session.systemPrompt.slice(0, 500));
} finally {
  // 释放 Agent 会话占用的资源。
  session.dispose();
}
