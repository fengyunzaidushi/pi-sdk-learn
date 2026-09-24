// 导入会话装配函数和会话管理器。
import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";

// 创建一个只向模型开放四个只读工具的内存会话。
const { session } = await createAgentSession({
  // 使用内存存储，避免工具实验生成持久会话记录。
  sessionManager: SessionManager.inMemory(),
  // 以工具名 allowlist 限制模型只能读取、搜索和列目录。
  tools: ["read", "grep", "find", "ls"],
});

// 在任何执行结果下都保证会话被释放。
try {
  // 打印经过注册表解析后实际启用的工具名，验证 allowlist 生效。
  console.log("active tools:", session.getActiveToolNames());

  // 订阅会话事件，观察工具执行和模型文本输出。
  session.subscribe((event) => {
    // 工具开始执行时记录工具名称。
    if (event.type === "tool_execution_start") {
      // 在工具开始日志前加换行，与此前的模型流式输出分隔。
      console.log(`\n[tool:start] ${event.toolName}`);
    }
    // 工具执行结束时记录名称和错误标记。
    if (event.type === "tool_execution_end") {
      // isError 反映工具结果是否为失败状态。
      console.log(`[tool:end] ${event.toolName} error=${event.isError}`);
    }
    // 仅处理 assistant 消息的文本增量。
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
      // 把模型在工具调用前后生成的文本实时写到终端。
      process.stdout.write(event.assistantMessageEvent.delta);
    }
  });

  // 明确要求模型调用一次 ls，再根据工具结果生成一句总结。
  await session.prompt("Use the ls tool once to list this directory, then summarize the result in one sentence.");
  // 为本轮终端输出补上结尾换行。
  process.stdout.write("\n");
} finally {
  // 清理会话、事件订阅和工具运行相关资源。
  session.dispose();
}
