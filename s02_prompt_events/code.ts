import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";

const eventNames: string[] = [];
const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  tools: [],
});

try {
  session.subscribe((event) => {
    eventNames.push(event.type);
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
      process.stdout.write(event.assistantMessageEvent.delta);
    }
  });

  await session.prompt("Reply with exactly one short sentence about event-driven programs. Do not call tools.");
  process.stdout.write("\n\n");

  const counts = Object.fromEntries(
    [...new Set(eventNames)].map((name) => [name, eventNames.filter((item) => item === name).length]),
  );
  console.log("event counts:", counts);
  console.log("message roles:", session.messages.map((message) => message.role));
  console.log("is idle:", session.isIdle);
} finally {
  session.dispose();
}
