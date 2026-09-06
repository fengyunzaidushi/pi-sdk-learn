import { Type } from "typebox";
import {
  createAgentSession,
  DefaultResourceLoader,
  getAgentDir,
  SessionManager,
  type InlineExtension,
} from "@earendil-works/pi-coding-agent";

const lessonExtension: InlineExtension = (pi) => {
  pi.on("agent_start", () => {
    console.log("[hook] agent_start");
  });

  pi.on("tool_call", (event) => {
    console.log(`[hook] tool_call ${event.toolName}`);
  });

  pi.registerTool({
    name: "uppercase",
    label: "Uppercase",
    description: "Convert a short piece of text to uppercase.",
    parameters: Type.Object({ text: Type.String() }),
    execute: async (_toolCallId, params) => ({
      content: [{ type: "text", text: params.text.toUpperCase() }],
      details: { length: params.text.length },
    }),
  });
};

const resourceLoader = new DefaultResourceLoader({
  cwd: process.cwd(),
  agentDir: getAgentDir(),
  extensionFactories: [lessonExtension],
});
await resourceLoader.reload();

const { session } = await createAgentSession({
  resourceLoader,
  sessionManager: SessionManager.inMemory(),
  tools: ["uppercase"],
});

try {
  console.log("active tools:", session.getActiveToolNames());
  console.log("registered tools:", session.getAllTools().map((tool) => tool.name));

  if (process.argv.includes("--run")) {
    session.subscribe((event) => {
      if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
        process.stdout.write(event.assistantMessageEvent.delta);
      }
    });
    await session.prompt("Use the uppercase tool with the text 'pi sdk', then show the result.");
    process.stdout.write("\n");
  } else {
    console.log("Pass --run to ask a model to call the custom tool.");
  }
} finally {
  session.dispose();
}
