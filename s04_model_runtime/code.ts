// 导入会话装配函数、模型运行时和会话管理器。
import { createAgentSession, ModelRuntime, SessionManager } from "@earendil-works/pi-coding-agent";

// 根据默认 Pi 配置创建模型目录与认证运行时。
const modelRuntime = await ModelRuntime.create();
// 异步筛选当前具有可用认证来源的模型。
const availableModels = await modelRuntime.getAvailable();

// 输出可用模型列表的标题。
console.log("available models:");
// 逐个遍历当前认证可用的模型元数据。
for (const model of availableModels) {
  // 打印 provider、模型 ID 和模型声明的 reasoning 能力。
  console.log(`- ${model.provider}/${model.id} reasoning=${model.reasoning}`);
}

// 为本次教学示例选择列表中的第一个可用模型。
const selectedModel = availableModels[0];
// 没有已认证模型时只给出说明，不尝试创建可调用的模型回合。
if (!selectedModel) {
  // 告知用户需要先配置 provider 才能发送 prompt。
  console.log("No authenticated model is available. Configure a provider before running a prompt.");
  // 显式保持成功退出，因为“没有认证”是本章允许观察的状态。
  process.exitCode = 0;
} else {
  // 使用选定模型和既有 ModelRuntime 装配一个内存会话。
  const { session } = await createAgentSession({
    // 复用刚才完成模型发现与认证检查的运行时。
    modelRuntime,
    // 固定本会话模型，避免装配过程再次按默认设置选择。
    model: selectedModel,
    // 请求 high 思考级别；最终值仍会受模型能力约束。
    thinkingLevel: "high",
    // 不持久化这次只读结构实验的会话。
    sessionManager: SessionManager.inMemory(),
    // 不注册工具，因为本章只检查模型选择和思考级别。
    tools: [],
  });

  // 确保完成状态打印后释放会话。
  try {
    // 打印会话最终采用的 provider 和模型 ID。
    console.log(`selected model: ${session.model?.provider}/${session.model?.id}`);
    // 读取经过模型能力约束后的实际 thinking level。
    console.log(`effective thinking level: ${session.thinkingLevel}`);
  } finally {
    // 释放会话运行资源。
    session.dispose();
  }
}
