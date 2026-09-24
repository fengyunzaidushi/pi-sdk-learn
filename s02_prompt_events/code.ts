// 导入会话装配函数和内存会话所需的管理器。
import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";

// 保存本轮出现过的全部事件类型，供回合结束后统计。
const eventNames: string[] = [];
// 创建不启用工具的内存会话，使事件序列聚焦于纯文本回合。
const { session } = await createAgentSession({
  // 禁止写入持久化会话文件。
  sessionManager: SessionManager.inMemory(),
  // 不向模型暴露工具，避免工具事件干扰基础事件观察。
  tools: [],
});

// 确保无论 prompt 是否成功都能释放会话。
try {
  // 订阅本会话发出的所有公开事件。
  session.subscribe((event) => {
    // 按发生顺序记录事件类型，稍后可统计每类事件的次数。
    eventNames.push(event.type);
    // 从消息更新事件中筛选 assistant 的文本增量。
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
      // 立即显示增量，而不是等待最终消息组装完成。
      process.stdout.write(event.assistantMessageEvent.delta);
    }
  });

  // 发起一个不调用工具的真实模型回合，并等待 agent settled。
  await session.prompt("Reply with exactly one short sentence about event-driven programs. Do not call tools.");
  // 在模型文本后输出两个换行，把后续统计区隔开。
  process.stdout.write("\n\n");

  // 将事件类型列表归并为“事件名 -> 出现次数”的对象。
  const counts = Object.fromEntries(
    // 先去重得到事件名，再逐一计算它在原始事件序列中的次数。
    [...new Set(eventNames)].map((name) => [name, eventNames.filter((item) => item === name).length]),
  );
  // 打印各类生命周期事件的出现次数。
  console.log("event counts:", counts);
  // 打印当前 transcript 中每条消息的角色，观察用户和助手消息状态。
  console.log("message roles:", session.messages.map((message) => message.role));
  // 验证 prompt 返回后会话已经结束本轮处理并进入空闲状态。
  console.log("is idle:", session.isIdle);
} finally {
  // 清理会话及其事件订阅。
  session.dispose();
}
