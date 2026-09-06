import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const chapters = readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^s\d{2}_/.test(entry.name))
  .map((entry) => entry.name)
  .sort();

if (chapters.length !== 8) {
  throw new Error(`Expected 8 chapters, found ${chapters.length}`);
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

console.log(`Validated ${chapters.length} chapters.`);
