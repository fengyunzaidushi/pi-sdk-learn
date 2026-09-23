import { fileURLToPath } from "node:url";
import {
  createAgentSession,
  DefaultResourceLoader,
  getAgentDir,
  SessionManager,
} from "@earendil-works/pi-coding-agent";

const cwd = process.cwd();
const templatePath = fileURLToPath(new URL("./prompts/lesson-brief.md", import.meta.url));
const loader = new DefaultResourceLoader({
  cwd,
  agentDir: getAgentDir(),
  additionalPromptTemplatePaths: [templatePath],
  noExtensions: true,
  noSkills: true,
  noContextFiles: true,
  promptsOverride: (current) => ({
    prompts: current.prompts.filter((template) => template.filePath === templatePath),
    diagnostics: current.diagnostics,
  }),
});
await loader.reload();

const { session } = await createAgentSession({
  cwd,
  resourceLoader: loader,
  sessionManager: SessionManager.inMemory(cwd),
  tools: [],
});

try {
  const templates = session.promptTemplates;
  if (templates.length !== 1 || templates[0].name !== "lesson-brief") {
    throw new Error("Expected exactly one lesson-brief template");
  }
  console.log("command:", `/${templates[0].name}`);
  console.log("argument hint:", templates[0].argumentHint);
  console.log("template body:", templates[0].content.trim());

  if (process.argv.includes("--run")) {
    session.subscribe((event) => {
      if (event.type === "message_end" && event.message.role === "user") {
        console.log("expanded user message:", event.message.content);
      }
      if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
        process.stdout.write(event.assistantMessageEvent.delta);
      }
    });
    await session.prompt('/lesson-brief "AgentSession" developer');
    process.stdout.write("\n");
  }
} finally {
  session.dispose();
}
