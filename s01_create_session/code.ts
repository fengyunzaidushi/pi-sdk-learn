// 导入会话装配函数和会话存储管理器。
import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";

// 创建本章使用的最小 Agent 会话，并从装配结果中取出应用层 session。
const { session } = await createAgentSession({
  // 使用内存会话，避免第一章向 ~/.pi/agent/sessions 写入 JSONL 文件。
  sessionManager: SessionManager.inMemory(),
  // 显式关闭全部工具，让本章只观察纯文本模型回合。
  tools: [],
});

// 用 try/finally 包住会话操作，保证异常路径也会执行资源清理。
try {
  // 订阅会话事件，以便在模型生成时实时处理文本增量。
  session.subscribe((event) => {
    // 只接受 assistant 消息更新中的 text_delta，忽略其他生命周期事件。
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
      // 将本次文本增量直接写到标准输出，形成流式显示。
      process.stdout.write(event.assistantMessageEvent.delta);
    }
  });

  // 打印 SessionManager 为当前会话分配的唯一标识。
  console.log(`session: ${session.sessionId}`);
  // 打印最终选中的 provider/model；没有可用模型时显示 none。
  console.log(`model: ${session.model ? `${session.model.provider}/${session.model.id}` : "none"}`);
  // 提交一次真实 prompt，并等待整个 Agent 回合完成。
  await session.prompt("Explain in one sentence what an AgentSession is. Do not call tools.");
  // 在流式文本结束后补换行，保持终端输出整洁。
  process.stdout.write("\n");
} finally {
  // 释放会话持有的监听器、重试计时器和工具相关资源。
  session.dispose();
}
