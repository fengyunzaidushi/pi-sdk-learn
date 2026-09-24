// 导入创建和删除临时目录所需的异步文件系统函数。
import { mkdtemp, rm } from "node:fs/promises";
// 导入系统临时目录查询函数。
import { tmpdir } from "node:os";
// 导入路径拼接和删除前安全校验所需的函数。
import { basename, dirname, join, resolve } from "node:path";
// 导入显式装配 AgentSession 所需的全部公共组件。
import {
  // 导入 Agent 会话装配入口。
  createAgentSession,
  // 导入创建空扩展运行时的辅助函数。
  createExtensionRuntime,
  // 导入模型目录与认证运行时。
  ModelRuntime,
  // 导入自定义资源加载器必须实现的接口类型。
  type ResourceLoader,
  // 导入会话存储管理器。
  SessionManager,
  // 导入设置管理器。
  SettingsManager,
} from "@earendil-works/pi-coding-agent";

// 获取当前项目工作目录。
const cwd = process.cwd();
// 创建本章专用临时 Agent 目录，隔离认证和模型存储路径。
const agentDir = await mkdtemp(join(tmpdir(), "pi-sdk-learn-s13-"));

// 确保完成全量装配实验后安全删除临时目录。
try {
  // 创建不读取真实用户认证且不联网刷新的模型运行时。
  const modelRuntime = await ModelRuntime.create({
    // 把认证文件指向本章临时目录。
    authPath: join(agentDir, "auth.json"),
    // 不加载自定义 models.json，仅使用内置模型元数据。
    modelsPath: null,
    // 把可刷新模型目录的存储文件隔离到临时目录。
    modelsStorePath: join(agentDir, "models-store.json"),
    // 禁止模型目录访问网络。
    allowModelNetwork: false,
    // 创建运行时时不执行在线刷新。
    refreshOnCreate: false,
  });
  // 从内置目录选取一个模型对象，仅用于显式装配元数据。
  const model = modelRuntime.getModels()[0];
  // 如果包内没有任何模型元数据，则无法继续演示显式 model 注入。
  if (!model) throw new Error("No built-in model metadata available");

  // 创建完全位于内存中的设置管理器。
  const settingsManager = SettingsManager.inMemory({
    // 关闭上下文压缩，保持本章配置最小化。
    compaction: { enabled: false },
    // 关闭模型请求重试；本章本来也不会发送 prompt。
    retry: { enabled: false },
  });
  // 实现固定资源集合的 ResourceLoader，完全跳过默认文件发现。
  const resourceLoader: ResourceLoader = {
    // 返回空扩展列表、空错误列表和一个可用的空扩展运行时。
    getExtensions: () => ({ extensions: [], errors: [], runtime: createExtensionRuntime() }),
    // 返回没有技能和诊断的资源快照。
    getSkills: () => ({ skills: [], diagnostics: [] }),
    // 返回没有 prompt template 和诊断的资源快照。
    getPrompts: () => ({ prompts: [], diagnostics: [] }),
    // 返回没有主题和诊断的资源快照。
    getThemes: () => ({ themes: [], diagnostics: [] }),
    // 返回空 AGENTS 上下文文件列表。
    getAgentsFiles: () => ({ agentsFiles: [] }),
    // 提供固定的只读教学 system prompt。
    getSystemPrompt: () => "You are a read-only Pi SDK lesson assistant. Answer briefly.",
    // 没有对应磁盘来源，因此 system prompt source 为 undefined。
    getSystemPromptSource: () => undefined,
    // 不在主 system prompt 后追加任何文本片段。
    getAppendSystemPrompt: () => [],
    // 没有追加文本，自然也没有追加来源。
    getAppendSystemPromptSources: () => [],
    // 本章拒绝动态扩展资源，因此实现为空操作。
    extendResources: () => {},
    // 固定内存资源无需重新扫描，异步 reload 直接完成。
    reload: async () => {},
  };

  // 将模型、设置、资源、会话存储和工具策略显式组合成 AgentSession。
  const { session } = await createAgentSession({
    // 指定 Agent 运行时的项目目录。
    cwd,
    // 指定隔离的 Agent 配置目录。
    agentDir,
    // 注入选定的模型元数据对象。
    model,
    // 注入提供该模型目录和认证边界的运行时。
    modelRuntime,
    // 关闭思考模式，避免模型能力差异影响结构实验。
    thinkingLevel: "off",
    // 注入内存设置管理器。
    settingsManager,
    // 注入固定资源集合的自定义加载器。
    resourceLoader,
    // 使用内存会话，不写 JSONL 文件。
    sessionManager: SessionManager.inMemory(cwd),
    // 只开放 read 工具，形成显式只读能力边界。
    tools: ["read"],
  });

  // 确保观察装配结果后释放会话。
  try {
    // 打印会话持有的模型元数据；这不代表认证已通过。
    console.log("model metadata:", `${session.model?.provider}/${session.model?.id}`);
    // 打印自定义 ResourceLoader 提供的固定 system prompt。
    console.log("system prompt:", session.systemPrompt);
    // 打印注册表解析后真正启用的工具列表。
    console.log("active tools:", session.getActiveToolNames());
    // 打印资源加载器返回的技能数量，应为零。
    console.log("skills:", session.resourceLoader.getSkills().skills.length);
    // 打印会话最终采用的思考级别。
    console.log("thinking level:", session.thinkingLevel);
    // 内存会话没有文件路径，因此用说明文本替代 nullish 值。
    console.log("session file:", session.sessionFile ?? "(in memory)");
    // 验证会话复用了显式提供的 ModelRuntime 实例。
    console.log("same model runtime:", session.modelRuntime === modelRuntime);
  } finally {
    // 释放会话及其工具和扩展运行资源。
    session.dispose();
  }
} finally {
  // 递归删除前验证目标位于系统临时目录且名称属于本章。
  if (dirname(agentDir) !== resolve(tmpdir()) || !basename(agentDir).startsWith("pi-sdk-learn-s13-")) {
    // 安全条件任一不满足时拒绝删除目录。
    throw new Error("Refusing to remove a directory outside this lesson's temporary area");
  }
  // 删除已经通过路径校验的临时 Agent 目录。
  await rm(agentDir, { recursive: true });
}
