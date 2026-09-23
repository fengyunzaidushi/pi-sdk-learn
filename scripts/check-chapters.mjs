import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const chapters = readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^s\d{2}_/.test(entry.name))
  .map((entry) => entry.name)
  .sort();

const expectedChapters = [
  "s01_create_session",
  "s02_prompt_events",
  "s03_tools",
  "s04_model_runtime",
  "s05_resources",
  "s06_extensions",
  "s07_sessions",
  "s08_runtime",
  "s09_skills",
  "s10_prompt_templates",
  "s11_auth",
  "s12_settings",
  "s13_full_control",
];

if (chapters.join(",") !== expectedChapters.join(",")) {
  throw new Error(`Expected ${expectedChapters.join(", ")}; found ${chapters.join(", ")}`);
}

for (const chapter of chapters) {
  const readme = join(root, chapter, "README.md");
  const code = join(root, chapter, "code.ts");
  if (!existsSync(readme) || !existsSync(code)) {
    throw new Error(`${chapter} must contain README.md and code.ts`);
  }

  const text = readFileSync(readme, "utf8");
  for (const heading of ["## 目标", "## 运行", "## 观察", "## 边界"]) {
    if (!text.includes(heading)) {
      throw new Error(`${chapter}/README.md is missing ${heading}`);
    }
  }
}

for (const asset of ["s09_skills/lesson-summary/SKILL.md", "s10_prompt_templates/prompts/lesson-brief.md"]) {
  if (!existsSync(join(root, asset))) {
    throw new Error(`Missing lesson asset: ${asset}`);
  }
}

console.log(`Validated ${chapters.length} chapters.`);
