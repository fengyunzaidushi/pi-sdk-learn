// 导入会话装配、资源加载和设置管理所需的 Pi API。
import {
  // 导入 Agent 会话装配函数。
  createAgentSession,
  // 导入默认资源加载器，它会刷新设置快照。
  DefaultResourceLoader,
  // 导入默认 Pi Agent 配置目录查询函数。
  getAgentDir,
  // 导入会话管理器，以便使用内存会话。
  SessionManager,
  // 导入设置管理器，演示持久设置与临时覆盖。
  SettingsManager,
} from "@earendil-works/pi-coding-agent";

// 获取当前项目目录，供资源加载和会话装配使用。
const cwd = process.cwd();
// 创建只存在于内存中的设置存储，并提供初始配置。
const settingsManager = SettingsManager.inMemory({
  // 初始启用上下文压缩。
  compaction: { enabled: true },
  // 初始关闭失败重试。
  retry: { enabled: false },
});

// 输出应用覆盖前的压缩和重试设置快照。
console.log("before:", {
  // 读取当前有效的压缩设置。
  compaction: settingsManager.getCompactionSettings(),
  // 读取当前有效的重试设置。
  retry: settingsManager.getRetrySettings(),
});

// 将默认思考级别偏好更新为 low。
settingsManager.setDefaultThinkingLevel("low");
// 等待设置写入队列完成；内存后端不会写入磁盘。
await settingsManager.flush();

// 创建共享同一个 SettingsManager 的资源加载器。
const resourceLoader = new DefaultResourceLoader({
  // 指定资源发现的项目根目录。
  cwd,
  // 指定用户级 Pi Agent 目录。
  agentDir: getAgentDir(),
  // 注入刚才配置的内存设置管理器。
  settingsManager,
  // 禁止扩展加载，保持设置实验独立。
  noExtensions: true,
  // 禁止 skill 加载。
  noSkills: true,
  // 禁止 prompt template 加载。
  noPromptTemplates: true,
  // 禁止主题加载。
  noThemes: true,
  // 禁止上下文文件加载。
  noContextFiles: true,
});
// 刷新资源和设置存储快照，确保 setter 的值已被加载。
await resourceLoader.reload();
// 在 reload() 之后施加只作用于当前快照的临时覆盖，避免被刷新清除。
settingsManager.applyOverrides({
  // 对当前运行关闭上下文压缩。
  compaction: { enabled: false },
  // 对当前运行启用重试，并设置次数和基础延迟。
  retry: { enabled: true, maxRetries: 2, baseDelayMs: 1000 },
});

// 使用最终设置快照和资源加载器创建内存会话。
const { session } = await createAgentSession({
  // 指定会话工作目录。
  cwd,
  // 注入已施加临时覆盖的 SettingsManager。
  settingsManager,
  // 注入使用同一设置实例的 ResourceLoader。
  resourceLoader,
  // 不持久化本章会话。
  sessionManager: SessionManager.inMemory(cwd),
  // 不开放工具，因为本章只检查配置状态。
  tools: [],
});

// 确保状态观察结束后释放会话。
try {
  // 输出 reload 和 applyOverrides 之后的最终设置快照。
  console.log("after:", {
    // 读取当前被覆盖为关闭的压缩设置。
    compaction: settingsManager.getCompactionSettings(),
    // 读取当前被覆盖为启用的重试设置。
    retry: settingsManager.getRetrySettings(),
    // 读取存储中的默认思考级别偏好。
    defaultThinking: settingsManager.getDefaultThinkingLevel(),
  });
  // 验证会话复用了显式传入的设置管理器实例。
  console.log("same settings manager:", session.settingsManager === settingsManager);
  // 输出结合模型能力约束后的会话实际思考级别。
  console.log("effective thinking level:", session.thinkingLevel);
  // 取出并清空设置读写过程中积累的错误队列。
  const errors = settingsManager.drainErrors();
  // 内存实验不应有设置 I/O 错误，出现时立即失败。
  if (errors.length > 0) throw new Error(`Unexpected settings errors: ${errors.length}`);
} finally {
  // 释放会话占用的资源。
  session.dispose();
}
