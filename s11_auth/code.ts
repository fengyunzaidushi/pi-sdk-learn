// 导入创建和删除临时目录所需的异步文件系统函数。
import { mkdtemp, rm } from "node:fs/promises";
// 导入系统临时目录查询函数。
import { tmpdir } from "node:os";
// 导入路径校验、拼接和规范化所需的 Node.js 函数。
import { basename, dirname, join, resolve } from "node:path";
// 导入认证隔离实验所需的 Pi 运行时组件。
import {
  // 导入 Agent 会话装配函数。
  createAgentSession,
  // 导入默认资源加载器，以便显式关闭本机资源发现。
  DefaultResourceLoader,
  // 导入负责模型目录和凭证来源的运行时。
  ModelRuntime,
  // 导入会话管理器，以便使用内存会话。
  SessionManager,
  // 导入设置管理器，以便隔离用户 settings.json。
  SettingsManager,
} from "@earendil-works/pi-coding-agent";

// 获取当前项目目录，作为会话和资源加载工作目录。
const cwd = process.cwd();
// 在系统临时目录创建本章专用 Agent 配置目录。
const agentDir = await mkdtemp(join(tmpdir(), "pi-sdk-learn-s11-"));
// 从环境变量读取目标 provider，未设置时使用 anthropic。
const providerId = process.env.PI_SDK_LEARN_PROVIDER || "anthropic";

// 确保认证实验结束后检查并删除临时 Agent 目录。
try {
  // 创建一个不读取真实用户认证文件的独立模型运行时。
  const modelRuntime = await ModelRuntime.create({
    // 将认证文件位置指向本章临时目录。
    authPath: join(agentDir, "auth.json"),
    // 禁止读取自定义 models.json，但仍保留内置模型元数据。
    modelsPath: null,
    // 将可刷新模型目录的存储文件也隔离到临时目录。
    modelsStorePath: join(agentDir, "models-store.json"),
    // 禁止联网获取模型目录，确保默认运行保持离线。
    allowModelNetwork: false,
    // 创建时不刷新远端模型信息。
    refreshOnCreate: false,
  });
  // 打印本次检查的 provider 标识，不包含任何密钥。
  console.log("provider:", providerId);
  // 检查运行时在覆盖前是否已有该 provider 的凭证来源。
  console.log("auth configured before override:", modelRuntime.hasConfiguredAuth(providerId));

  // 从进程环境读取可选的临时 API key，不写入源码或磁盘。
  const key = process.env.PI_SDK_LEARN_API_KEY;
  // 只有用户显式设置 key 时才配置运行时覆盖。
  if (key) {
    // 将 key 注入当前 ModelRuntime 实例，而不是持久认证文件。
    await modelRuntime.setRuntimeApiKey(providerId, key);
    // 仅打印“是否已配置”，避免泄露原始凭证内容。
    console.log("runtime override configured:", modelRuntime.hasConfiguredAuth(providerId));
  } else {
    // 说明本次没有设置运行时 key 覆盖。
    console.log("runtime override skipped (PI_SDK_LEARN_API_KEY is unset)");
  }

  // 创建内存设置管理器，防止读取或改写真实 settings.json。
  const settingsManager = SettingsManager.inMemory();
  // 创建使用临时 Agent 目录且关闭所有可选资源的加载器。
  const resourceLoader = new DefaultResourceLoader({
    // 指定当前项目工作目录。
    cwd,
    // 将用户级资源根目录替换成本章临时目录。
    agentDir,
    // 让资源加载器与会话共享同一个内存设置管理器。
    settingsManager,
    // 禁止加载扩展。
    noExtensions: true,
    // 禁止加载 skill。
    noSkills: true,
    // 禁止加载 prompt template。
    noPromptTemplates: true,
    // 禁止加载主题。
    noThemes: true,
    // 禁止加载 AGENTS 上下文文件。
    noContextFiles: true,
  });
  // 刷新资源快照，使上述隔离配置生效。
  await resourceLoader.reload();

  // 用同一个模型、设置和资源运行时装配内存会话。
  const { session } = await createAgentSession({
    // 指定会话的项目工作目录。
    cwd,
    // 指定隔离的 Agent 配置目录。
    agentDir,
    // 复用已配置认证边界的 ModelRuntime。
    modelRuntime,
    // 复用内存 SettingsManager。
    settingsManager,
    // 复用关闭本机资源发现的 ResourceLoader。
    resourceLoader,
    // 使用内存会话，避免生成 JSONL。
    sessionManager: SessionManager.inMemory(cwd),
    // 不开放工具，因为本章不执行模型回合。
    tools: [],
  });
  // 确保状态检查结束后释放会话。
  try {
    // 验证 AgentSession 持有的正是显式传入的 ModelRuntime 实例。
    console.log("same model runtime:", session.modelRuntime === modelRuntime);
    // 读取装配过程最终放入会话的模型元数据。
    const selected = session.model;
    // 打印已知模型标识，或说明 Agent 只持有未知占位模型。
    console.log(
      // 输出字段标签。
      "selected model:",
      // 只有运行时能按 provider/id 找到模型时才显示具体标识。
      selected && modelRuntime.getModel(selected.provider, selected.id)
        // 组合可识别模型的 provider 和 ID。
        ? `${selected.provider}/${selected.id}`
        // 无可用模型时明确标注占位状态，不暗示可发请求。
        : "(none; Agent holds an unknown placeholder)",
    );
  } finally {
    // 释放会话使用的监听器和运行资源。
    session.dispose();
  }
} finally {
  // 删除前验证路径确实位于系统临时目录且名称属于本章。
  if (dirname(agentDir) !== resolve(tmpdir()) || !basename(agentDir).startsWith("pi-sdk-learn-s11-")) {
    // 路径不符合双重约束时拒绝执行递归删除。
    throw new Error("Refusing to remove a directory outside this lesson's temporary area");
  }
  // 递归删除已确认安全的临时 Agent 配置目录。
  await rm(agentDir, { recursive: true });
}
