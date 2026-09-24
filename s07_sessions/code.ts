// 导入创建和删除临时目录所需的异步文件系统函数。
import { mkdtemp, rm } from "node:fs/promises";
// 导入当前操作系统的临时目录查询函数。
import { tmpdir } from "node:os";
// 导入跨平台拼接文件路径的函数。
import { join } from "node:path";
// 导入会话装配函数和负责 JSONL 持久化的 SessionManager。
import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";

// 记录当前工作目录，作为这些会话所属的项目路径。
const cwd = process.cwd();
// 在系统临时目录创建独立会话目录，避免污染真实 Pi 会话。
const sessionDir = await mkdtemp(join(tmpdir(), "pi-sdk-learn-s07-"));
// 从 appendMessage 的第一个参数推导合法持久化消息类型。
type PersistedMessage = Parameters<SessionManager["appendMessage"]>[0];

// 构造离线 assistant fixture 所需的零消耗 token 统计。
const usage = {
  // 记录输入 token 数，本例没有真实模型输入。
  input: 0,
  // 记录输出 token 数，本例没有真实模型输出。
  output: 0,
  // 记录从缓存读取的 token 数。
  cacheRead: 0,
  // 记录写入缓存的 token 数。
  cacheWrite: 0,
  // 记录本条 fixture 的总 token 数。
  totalTokens: 0,
  // 提供与持久化 assistant 消息协议一致的零成本明细。
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};

// 确保实验结束后始终删除临时会话目录。
try {
  // 创建一个把 JSONL 文件写入临时目录的新会话。
  const first = await createAgentSession({
    // 使用 create() 建立新的持久会话，而不是内存会话。
    sessionManager: SessionManager.create(cwd, sessionDir),
    // 关闭工具，因为本章只验证会话持久化。
    tools: [],
  });
  // 保存新会话的 JSONL 文件路径，供稍后重新打开。
  const firstFile = first.session.sessionFile;
  // 输出实际创建的会话文件位置。
  console.log("created:", firstFile);

  // 生成同一 fixture 消息对共用的基础时间戳。
  const timestamp = Date.now();
  // 定义类型安全的辅助函数，把消息追加到第一个会话的 JSONL 树。
  const appendMessage = (message: PersistedMessage): void => {
    // 直接调用 SessionManager 写入确定性消息，不发起模型请求。
    first.session.sessionManager.appendMessage(message);
  };
  // 追加一条合成用户消息，为持久化会话提供首条对话内容。
  appendMessage({ role: "user", content: "Synthetic persistence fixture.", timestamp });
  // 追加一条协议完整的合成 assistant 消息，触发 JSONL 落盘。
  appendMessage({
    // 标记该消息来自 assistant。
    role: "assistant",
    // 以内容块数组表示确定性的文本回复。
    content: [{ type: "text", text: "Synthetic lesson response." }],
    // 提供持久化格式要求的 API 协议名称。
    api: "openai-responses",
    // 使用教学 provider 标识，明确这不是实际服务商响应。
    provider: "tutorial",
    // 使用离线 fixture 模型名，避免伪装成真实模型调用。
    model: "offline-fixture",
    // 附上前面构造的零 token、零费用统计。
    usage,
    // 表明该合成回复以正常停止原因结束。
    stopReason: "stop",
    // 让 assistant 消息时间晚于配对的用户消息。
    timestamp: timestamp + 1,
  });
  // 关闭第一个会话，结束它持有的运行时资源。
  first.session.dispose();

  // 持久会话理应返回文件路径；缺失时立即终止验证。
  if (!firstFile) {
    // 抛出明确错误，避免把 undefined 传给 open()。
    throw new Error("Expected a persistent session file");
  }

  // 从同一项目和临时目录列出可恢复的会话元数据。
  const listed = await SessionManager.list(cwd, sessionDir);
  // 打印扫描到的会话 ID，验证新会话已进入索引结果。
  console.log("listed session ids:", listed.map((item) => item.id));

  // 使用保存的 JSONL 路径重新装配指定会话。
  const reopened = await createAgentSession({
    // open() 精确选择刚才创建的会话文件。
    sessionManager: SessionManager.open(firstFile, sessionDir),
    // 恢复实验仍然不启用工具。
    tools: [],
  });
  // 比较重新打开的会话 ID 与列表中的首个会话 ID。
  console.log("reopened:", reopened.session.sessionId === listed[0]?.id);
  // 释放重新打开的会话。
  reopened.session.dispose();

  // 再按“最近使用”策略创建会话，验证 continueRecent() 的选择行为。
  const continued = await createAgentSession({
    // 从当前项目的临时会话目录继续最近会话。
    sessionManager: SessionManager.continueRecent(cwd, sessionDir),
    // 不为恢复后的会话开放工具。
    tools: [],
  });
  // 打印 continueRecent() 最终选中的会话 ID。
  console.log("continued:", continued.session.sessionId);
  // 释放最近会话实例。
  continued.session.dispose();
} finally {
  // 递归并容错删除本章创建的临时会话目录。
  await rm(sessionDir, { recursive: true, force: true });
}
