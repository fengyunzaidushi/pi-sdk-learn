import {
  createAgentSession,
  DefaultResourceLoader,
  getAgentDir,
  SessionManager,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";

const cwd = process.cwd();
const settingsManager = SettingsManager.inMemory({
  compaction: { enabled: true },
  retry: { enabled: false },
});

console.log("before:", {
  compaction: settingsManager.getCompactionSettings(),
  retry: settingsManager.getRetrySettings(),
});

settingsManager.setDefaultThinkingLevel("low");
await settingsManager.flush();

const resourceLoader = new DefaultResourceLoader({
  cwd,
  agentDir: getAgentDir(),
  settingsManager,
  noExtensions: true,
  noSkills: true,
  noPromptTemplates: true,
  noThemes: true,
  noContextFiles: true,
});
await resourceLoader.reload();
// reload() refreshes SettingsManager from its storage; transient overrides belong after it.
settingsManager.applyOverrides({
  compaction: { enabled: false },
  retry: { enabled: true, maxRetries: 2, baseDelayMs: 1000 },
});

const { session } = await createAgentSession({
  cwd,
  settingsManager,
  resourceLoader,
  sessionManager: SessionManager.inMemory(cwd),
  tools: [],
});

try {
  console.log("after:", {
    compaction: settingsManager.getCompactionSettings(),
    retry: settingsManager.getRetrySettings(),
    defaultThinking: settingsManager.getDefaultThinkingLevel(),
  });
  console.log("same settings manager:", session.settingsManager === settingsManager);
  console.log("effective thinking level:", session.thinkingLevel);
  const errors = settingsManager.drainErrors();
  if (errors.length > 0) throw new Error(`Unexpected settings errors: ${errors.length}`);
} finally {
  session.dispose();
}
