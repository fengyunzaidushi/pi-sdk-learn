import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";

const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  tools: ["read", "grep", "find", "ls"],
});

try {
  console.log("active tools:", session.getActiveToolNames());

  session.subscribe((event) => {
    if (event.type === "tool_execution_start") {
      console.log(`\n[tool:start] ${event.toolName}`);
    }
    if (event.type === "tool_execution_end") {
      console.log(`[tool:end] ${event.toolName} error=${event.isError}`);
    }
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
      process.stdout.write(event.assistantMessageEvent.delta);
    }
  });

  await session.prompt("Use the ls tool once to list this directory, then summarize the result in one sentence.");
  process.stdout.write("\n");
} finally {
  session.dispose();
}
