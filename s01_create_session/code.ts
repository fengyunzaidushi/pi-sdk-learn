import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";

// In-memory storage keeps this first experiment isolated from ~/.pi/agent/sessions.
const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  tools: [],
});

try {
  session.subscribe((event) => {
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
      process.stdout.write(event.assistantMessageEvent.delta);
    }
  });

  console.log(`session: ${session.sessionId}`);
  console.log(`model: ${session.model ? `${session.model.provider}/${session.model.id}` : "none"}`);
  await session.prompt("Explain in one sentence what an AgentSession is. Do not call tools.");
  process.stdout.write("\n");
} finally {
  session.dispose();
}
