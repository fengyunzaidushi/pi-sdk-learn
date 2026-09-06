import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";

const cwd = process.cwd();
const sessionDir = await mkdtemp(join(tmpdir(), "pi-sdk-learn-s07-"));
type PersistedMessage = Parameters<SessionManager["appendMessage"]>[0];

const usage = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};

try {
  const first = await createAgentSession({
    sessionManager: SessionManager.create(cwd, sessionDir),
    tools: [],
  });
  const firstFile = first.session.sessionFile;
  console.log("created:", firstFile);

  // Add a deterministic user/assistant pair so the JSONL file is flushed without an API call.
  const timestamp = Date.now();
  const appendMessage = (message: PersistedMessage): void => {
    first.session.sessionManager.appendMessage(message);
  };
  appendMessage({ role: "user", content: "Synthetic persistence fixture.", timestamp });
  appendMessage({
    role: "assistant",
    content: [{ type: "text", text: "Synthetic lesson response." }],
    api: "openai-responses",
    provider: "tutorial",
    model: "offline-fixture",
    usage,
    stopReason: "stop",
    timestamp: timestamp + 1,
  });
  first.session.dispose();

  if (!firstFile) {
    throw new Error("Expected a persistent session file");
  }

  const listed = await SessionManager.list(cwd, sessionDir);
  console.log("listed session ids:", listed.map((item) => item.id));

  const reopened = await createAgentSession({
    sessionManager: SessionManager.open(firstFile, sessionDir),
    tools: [],
  });
  console.log("reopened:", reopened.session.sessionId === listed[0]?.id);
  reopened.session.dispose();

  const continued = await createAgentSession({
    sessionManager: SessionManager.continueRecent(cwd, sessionDir),
    tools: [],
  });
  console.log("continued:", continued.session.sessionId);
  continued.session.dispose();
} finally {
  await rm(sessionDir, { recursive: true, force: true });
}
