import {
  createAgentSession,
  DefaultResourceLoader,
  getAgentDir,
  SessionManager,
} from "@earendil-works/pi-coding-agent";

const cwd = process.cwd();
const lessonContext = {
  path: "<lesson>/AGENTS.md",
  content: "# Lesson Context\nPrefer short answers and show the concrete command before explaining it.",
};

const resourceLoader = new DefaultResourceLoader({
  cwd,
  agentDir: getAgentDir(),
  systemPromptOverride: () => "You are the Pi SDK Learn teaching assistant.",
  appendSystemPromptOverride: () => [],
  agentsFilesOverride: (current) => ({
    agentsFiles: [...current.agentsFiles, lessonContext],
  }),
});
await resourceLoader.reload();

const { session } = await createAgentSession({
  cwd,
  resourceLoader,
  sessionManager: SessionManager.inMemory(cwd),
  tools: [],
});

try {
  const contextFiles = resourceLoader.getAgentsFiles().agentsFiles;
  console.log("context files:", contextFiles.map((file) => file.path));
  console.log("system prompt contains lesson context:", session.systemPrompt.includes("teaching assistant"));
  console.log("system prompt preview:");
  console.log(session.systemPrompt.slice(0, 500));
} finally {
  session.dispose();
}
