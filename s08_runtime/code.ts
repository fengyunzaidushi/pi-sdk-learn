// 导入创建和删除临时目录的异步文件系统函数。
import { mkdtemp, rm } from "node:fs/promises";
// 导入系统临时目录查询函数。
import { tmpdir } from "node:os";
// 导入跨平台路径拼接函数。
import { join } from "node:path";
// 导入组装可替换会话运行时所需的 Pi API。
import {
  // 使用已创建服务和指定 SessionManager 构造 AgentSession。
  createAgentSessionFromServices,
  // 创建负责 new、switch 等会话替换操作的运行时。
  createAgentSessionRuntime,
  // 创建可在多次会话装配间复用的服务集合。
  createAgentSessionServices,
  // 获取当前用户的默认 Pi Agent 配置目录。
  getAgentDir,
  // 导入运行时工厂的类型约束。
  type CreateAgentSessionRuntimeFactory,
  // 导入会话持久化管理器。
  SessionManager,
} from "@earendil-works/pi-coding-agent";

// 保存当前项目目录，作为会话归属和服务工作目录。
const cwd = process.cwd();
// 获取默认 Agent 配置目录，供服务装配读取配置。
const agentDir = getAgentDir();
// 创建隔离的临时会话目录，避免写入真实会话历史。
const sessionDir = await mkdtemp(join(tmpdir(), "pi-sdk-learn-s08-"));
// 从 appendMessage 签名推导可持久化消息类型。
type PersistedMessage = Parameters<SessionManager["appendMessage"]>[0];

// 构造离线 assistant fixture 需要的零用量统计。
const usage = {
  // 本例没有真实模型输入 token。
  input: 0,
  // 本例没有真实模型输出 token。
  output: 0,
  // 本例没有缓存读取 token。
  cacheRead: 0,
  // 本例没有缓存写入 token。
  cacheWrite: 0,
  // 总 token 数保持为零。
  totalTokens: 0,
  // 所有费用维度也保持为零。
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};

// 定义 AgentSessionRuntime 每次创建或替换会话时调用的工厂。
const createRuntime: CreateAgentSessionRuntimeFactory = async ({ cwd: targetCwd, sessionManager, sessionStartEvent }) => {
  // 为目标工作目录创建模型、设置、资源等共享服务。
  const services = await createAgentSessionServices({ cwd: targetCwd, agentDir });
  // 返回运行时要求的会话装配结果、服务引用和诊断信息。
  return {
    // 用本次 SessionManager 和起始事件创建具体 AgentSession。
    ...(await createAgentSessionFromServices({
      // 注入刚创建的共享服务集合。
      services,
      // 注入由 runtime 为当前操作选择的会话管理器。
      sessionManager,
      // 传递 new、switch 等操作对应的会话开始事件。
      sessionStartEvent,
      // 禁用工具，使本章只观察会话替换。
      tools: [],
    })),
    // 暴露服务集合，供运行时在会话生命周期中管理。
    services,
    // 将服务创建阶段产生的诊断信息交给运行时。
    diagnostics: services.diagnostics,
  };
};

// 确保最外层临时目录最终被清理。
try {
  // 用自定义工厂和初始持久会话创建 AgentSessionRuntime。
  const runtime = await createAgentSessionRuntime(createRuntime, {
    // 指定运行时管理的项目目录。
    cwd,
    // 指定用户级 Agent 配置目录。
    agentDir,
    // 初始会话写入本章专用临时目录。
    sessionManager: SessionManager.create(cwd, sessionDir),
  });

  // 无论会话替换是否成功都要释放整个运行时。
  try {
    // 保存初始会话 ID，用于切回后比较。
    const firstSessionId = runtime.session.sessionId;
    // 保存初始 JSONL 路径，供 switchSession() 使用。
    const firstSessionFile = runtime.session.sessionFile;
    // 生成离线消息对的基础时间戳。
    const timestamp = Date.now();
    // 定义始终写入“当前 runtime.session”的消息追加函数。
    const appendMessage = (message: PersistedMessage): void => {
      // 通过当前会话的 SessionManager 追加消息。
      runtime.session.sessionManager.appendMessage(message);
    };
    // 写入合成用户消息，建立确定性的会话内容。
    appendMessage({ role: "user", content: "Synthetic runtime fixture.", timestamp });
    // 写入合成 assistant 消息，使初始会话文件具备可恢复记录。
    appendMessage({
      // 标记消息角色为 assistant。
      role: "assistant",
      // 使用标准文本内容块保存教学回复。
      content: [{ type: "text", text: "Synthetic runtime response." }],
      // 填写消息协议要求的 API 类型。
      api: "openai-responses",
      // 用 tutorial 标识离线数据来源。
      provider: "tutorial",
      // 明确模型名只是离线 fixture。
      model: "offline-fixture",
      // 附加零 token、零费用用量。
      usage,
      // 使用正常停止原因完成合成响应。
      stopReason: "stop",
      // 让回复时间位于用户消息之后。
      timestamp: timestamp + 1,
    });
    // 打印运行时最初管理的会话 ID。
    console.log("initial:", firstSessionId);

    // 请求运行时新建并替换当前 AgentSession。
    await runtime.newSession();
    // 打印替换后的会话 ID，观察 runtime.session 已改变。
    console.log("after newSession:", runtime.session.sessionId);

    // 只有初始会话确实有持久化文件时才能切换回来。
    if (firstSessionFile) {
      // 用原 JSONL 路径替换当前会话。
      await runtime.switchSession(firstSessionFile);
      // 验证切回后的 ID 与最初保存的 ID 相同。
      console.log("after switchSession:", runtime.session.sessionId === firstSessionId);
    }
  } finally {
    // 异步释放运行时及其当前会话和共享服务。
    await runtime.dispose();
  }
} finally {
  // 删除本章创建的临时持久化目录。
  await rm(sessionDir, { recursive: true, force: true });
}
