// 导入 TypeBox 的类型构造器，用于声明自定义工具的参数结构。
import { Type } from "typebox";
// 导入创建会话、加载资源和管理会话所需的 Pi API。
import {
  // 导入创建 Agent 会话的函数。
  createAgentSession,
  // 导入默认资源加载器，用于装载扩展。
  DefaultResourceLoader,
  // 导入 Pi Agent 的默认配置目录。
  getAgentDir,
  // 导入会话管理器，以便使用内存会话。
  SessionManager,
  // 导入内联扩展的类型定义，约束扩展工厂的签名。
  type InlineExtension,
} from "@earendil-works/pi-coding-agent";

// 定义一个内联扩展工厂，Pi 会把扩展 API 传入参数 pi。
const lessonExtension: InlineExtension = (pi) => {
  // 监听 Agent 开始执行的生命周期事件。
  pi.on("agent_start", () => {
    // 在 Agent 回合开始时输出一条调试日志。
    console.log("[hook] agent_start");
  });

  // 监听工具调用事件，以便观察模型发起的工具调用。
  pi.on("tool_call", (event) => {
    // 输出被调用工具的名称。
    console.log(`[hook] tool_call ${event.toolName}`);
  });

  // 向扩展注册一个名为 uppercase 的自定义工具。
  pi.registerTool({
    // 设置工具的机器可识别名称，需与会话的 allowlist 对应。
    name: "uppercase",
    // 设置面向用户界面的显示名称。
    label: "Uppercase",
    // 向模型说明工具的用途和输入输出行为。
    description: "Convert a short piece of text to uppercase.",
    // 使用 TypeBox 声明工具必须接收一个字符串字段 text。
    parameters: Type.Object({ text: Type.String() }),
    // 定义工具被调用后的异步执行函数。
    execute: async (_toolCallId, params) => ({
      // 返回符合 Pi 工具结果协议的文本内容。
      content: [{ type: "text", text: params.text.toUpperCase() }],
      // 返回工具执行的附加元数据，这里记录原文本长度。
      details: { length: params.text.length },
    }),
  });
};

// 创建资源加载器，并把内联扩展工厂交给它管理。
const resourceLoader = new DefaultResourceLoader({
  // 使用当前进程工作目录作为项目资源根目录。
  cwd: process.cwd(),
  // 使用用户级 Pi Agent 配置目录发现其他资源。
  agentDir: getAgentDir(),
  // 注册本章定义的内联扩展工厂。
  extensionFactories: [lessonExtension],
});
// 显式刷新资源，使扩展完成加载和注册。
await resourceLoader.reload();

// 创建使用该资源加载器的 Agent 会话。
const { session } = await createAgentSession({
  // 复用已经加载扩展的资源加载器。
  resourceLoader,
  // 使用内存会话管理器，避免写入持久化会话文件。
  sessionManager: SessionManager.inMemory(),
  // 只把 uppercase 工具暴露给当前会话中的模型。
  tools: ["uppercase"],
});

// 确保会话在正常结束或发生异常时都能被释放。
try {
  // 打印当前会话实际启用并暴露给模型的工具名称。
  console.log("active tools:", session.getActiveToolNames());
  // 打印扩展注册表中的全部工具名称。
  console.log("registered tools:", session.getAllTools().map((tool) => tool.name));

  // 仅在命令行包含 --run 时才执行真实模型回合。
  if (process.argv.includes("--run")) {
    // 订阅会话事件，以便实时输出助手生成的文本增量。
    session.subscribe((event) => {
      // 只处理消息更新中的文本增量事件。
      if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
        // 将当前增量直接写入标准输出，形成流式显示效果。
        process.stdout.write(event.assistantMessageEvent.delta);
      }
    });
    // 向模型发送提示，要求它调用 uppercase 工具并展示结果。
    await session.prompt("Use the uppercase tool with the text 'pi sdk', then show the result.");
    // 在流式输出结束后补一个换行，保持终端格式整洁。
    process.stdout.write("\n");
  } else {
    // 未指定 --run 时只提示用户如何触发真实模型调用。
    console.log("Pass --run to ask a model to call the custom tool.");
  }
} finally {
  // 释放会话及其订阅、扩展相关资源。
  session.dispose();
}
