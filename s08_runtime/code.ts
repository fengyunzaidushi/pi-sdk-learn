import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  createAgentSessionServices,
  getAgentDir,
  type CreateAgentSessionRuntimeFactory,
  SessionManager,
} from "@earendil-works/pi-coding-agent";

const cwd = process.cwd();
const agentDir = getAgentDir();
const sessionDir = await mkdtemp(join(tmpdir(), "pi-sdk-learn-s08-"));
type PersistedMessage = Parameters<SessionManager["appendMessage"]>[0];

const usage = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};

const createRuntime: CreateAgentSessionRuntimeFactory = async ({ cwd: targetCwd, sessionManager, sessionStartEvent }) => {
  const services = await createAgentSessionServices({ cwd: targetCwd, agentDir });
  return {
    ...(await createAgentSessionFromServices({
      services,
      sessionManager,
      sessionStartEvent,
      tools: [],
    })),
    services,
    diagnostics: services.diagnostics,
  };
};

try {
  const runtime = await createAgentSessionRuntime(createRuntime, {
    cwd,
    agentDir,
    sessionManager: SessionManager.create(cwd, sessionDir),
  });

  try {
    const firstSessionId = runtime.session.sessionId;
    const firstSessionFile = runtime.session.sessionFile;
    const timestamp = Date.now();
    const appendMessage = (message: PersistedMessage): void => {
      runtime.session.sessionManager.appendMessage(message);
    };
    appendMessage({ role: "user", content: "Synthetic runtime fixture.", timestamp });
    appendMessage({
      role: "assistant",
      content: [{ type: "text", text: "Synthetic runtime response." }],
      api: "openai-responses",
      provider: "tutorial",
      model: "offline-fixture",
      usage,
      stopReason: "stop",
      timestamp: timestamp + 1,
    });
    console.log("initial:", firstSessionId);

    await runtime.newSession();
    console.log("after newSession:", runtime.session.sessionId);

    if (firstSessionFile) {
      await runtime.switchSession(firstSessionFile);
      console.log("after switchSession:", runtime.session.sessionId === firstSessionId);
    }
  } finally {
    await runtime.dispose();
  }
} finally {
  await rm(sessionDir, { recursive: true, force: true });
}
