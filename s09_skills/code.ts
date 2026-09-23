import { fileURLToPath } from "node:url";
import {
  createAgentSession,
  DefaultResourceLoader,
  getAgentDir,
  SessionManager,
} from "@earendil-works/pi-coding-agent";

const cwd = process.cwd();
const skillPath = fileURLToPath(new URL("./lesson-summary/SKILL.md", import.meta.url));
const loader = new DefaultResourceLoader({
  cwd,
  agentDir: getAgentDir(),
  additionalSkillPaths: [skillPath],
  noExtensions: true,
  noPromptTemplates: true,
  noContextFiles: true,
  skillsOverride: (current) => ({
    skills: current.skills.filter((skill) => skill.filePath === skillPath),
    diagnostics: current.diagnostics,
  }),
});
await loader.reload();

const { skills, diagnostics } = loader.getSkills();
if (diagnostics.length > 0) console.warn("skill diagnostics:", diagnostics);
if (skills.length !== 1 || skills[0].name !== "lesson-summary") {
  throw new Error("Expected exactly one lesson-summary skill");
}

const { session } = await createAgentSession({
  cwd,
  resourceLoader: loader,
  sessionManager: SessionManager.inMemory(cwd),
  tools: ["read"],
});

try {
  console.log("loaded skill:", skills[0].name);
  console.log("skill path:", skills[0].filePath);
  console.log("advertised in system prompt:", session.systemPrompt.includes("lesson-summary"));
  if (process.argv.includes("--run")) {
    session.subscribe((event) => {
      if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
        process.stdout.write(event.assistantMessageEvent.delta);
      }
    });
    await session.prompt("/skill:lesson-summary Summarize the Pi session lifecycle from s01 in three lines.");
    process.stdout.write("\n");
  }
} finally {
  session.dispose();
}
