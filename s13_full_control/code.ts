import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import {
  createAgentSession,
  createExtensionRuntime,
  ModelRuntime,
  type ResourceLoader,
  SessionManager,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";

const cwd = process.cwd();
const agentDir = await mkdtemp(join(tmpdir(), "pi-sdk-learn-s13-"));

try {
  const modelRuntime = await ModelRuntime.create({
    authPath: join(agentDir, "auth.json"),
    modelsPath: null,
    modelsStorePath: join(agentDir, "models-store.json"),
    allowModelNetwork: false,
    refreshOnCreate: false,
  });
  const model = modelRuntime.getModels()[0];
  if (!model) throw new Error("No built-in model metadata available");

  const settingsManager = SettingsManager.inMemory({
    compaction: { enabled: false },
    retry: { enabled: false },
  });
  const resourceLoader: ResourceLoader = {
    getExtensions: () => ({ extensions: [], errors: [], runtime: createExtensionRuntime() }),
    getSkills: () => ({ skills: [], diagnostics: [] }),
    getPrompts: () => ({ prompts: [], diagnostics: [] }),
    getThemes: () => ({ themes: [], diagnostics: [] }),
    getAgentsFiles: () => ({ agentsFiles: [] }),
    getSystemPrompt: () => "You are a read-only Pi SDK lesson assistant. Answer briefly.",
    getSystemPromptSource: () => undefined,
    getAppendSystemPrompt: () => [],
    getAppendSystemPromptSources: () => [],
    extendResources: () => {},
    reload: async () => {},
  };

  const { session } = await createAgentSession({
    cwd,
    agentDir,
    model,
    modelRuntime,
    thinkingLevel: "off",
    settingsManager,
    resourceLoader,
    sessionManager: SessionManager.inMemory(cwd),
    tools: ["read"],
  });

  try {
    console.log("model metadata:", `${session.model?.provider}/${session.model?.id}`);
    console.log("system prompt:", session.systemPrompt);
    console.log("active tools:", session.getActiveToolNames());
    console.log("skills:", session.resourceLoader.getSkills().skills.length);
    console.log("thinking level:", session.thinkingLevel);
    console.log("session file:", session.sessionFile ?? "(in memory)");
    console.log("same model runtime:", session.modelRuntime === modelRuntime);
  } finally {
    session.dispose();
  }
} finally {
  if (dirname(agentDir) !== resolve(tmpdir()) || !basename(agentDir).startsWith("pi-sdk-learn-s13-")) {
    throw new Error("Refusing to remove a directory outside this lesson's temporary area");
  }
  await rm(agentDir, { recursive: true });
}
