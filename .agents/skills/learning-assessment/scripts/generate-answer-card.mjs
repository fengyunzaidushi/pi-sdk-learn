#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const templatePath = path.resolve(scriptDir, "../assets/answer-card-template.html");

function parseArgs(argv) {
  const values = new Map();
  const flags = new Set();

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--force" || argument === "--help") {
      flags.add(argument);
      continue;
    }
    if (!argument.startsWith("--")) {
      throw new Error(`Unexpected argument: ${argument}`);
    }

    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for ${argument}`);
    }
    values.set(argument, value);
    index += 1;
  }

  return { values, flags };
}

function showHelp() {
  console.log(`Usage:
  node generate-answer-card.mjs --output <path> [options]

Options:
  --title <text>             Card title (default: 学习测验答题卡)
  --questions <number>       Number of questions, 1-100 (default: 20)
  --options <list>           Comma-separated option labels (default: A,B,C,D)
  --grading-prompt <text>    Instruction sent with the selected answers
  --force                    Replace the exact output file if it exists
  --help                     Show this help`);
}

function scriptJson(value) {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

const { values, flags } = parseArgs(process.argv.slice(2));
if (flags.has("--help")) {
  showHelp();
  process.exit(0);
}

const outputArgument = values.get("--output");
if (!outputArgument) {
  throw new Error("--output is required");
}

const questionCount = Number(values.get("--questions") ?? "20");
if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 100) {
  throw new Error("--questions must be an integer from 1 to 100");
}

const options = (values.get("--options") ?? "A,B,C,D")
  .split(",")
  .map((option) => option.trim())
  .filter(Boolean);
if (options.length < 2 || options.length > 6 || new Set(options).size !== options.length) {
  throw new Error("--options must contain 2-6 unique labels");
}

const title = values.get("--title") ?? "学习测验答题卡";
const gradingPrompt =
  values.get("--grading-prompt") ??
  "请按当前对话中刚生成的试卷批改，给出总分、错题、对应知识点和简短解析。";
const outputPath = path.resolve(outputArgument);

if ((await pathExists(outputPath)) && !flags.has("--force")) {
  throw new Error(`Output already exists: ${outputPath}. Pass --force to replace it.`);
}

const template = await readFile(templatePath, "utf8");
const fragment = template
  .replace("__TITLE_JSON__", scriptJson(title))
  .replace("__QUESTION_COUNT__", String(questionCount))
  .replace("__OPTIONS_JSON__", scriptJson(options))
  .replace("__GRADING_PROMPT_JSON__", scriptJson(gradingPrompt));

if (/__[A-Z_]+__/.test(fragment)) {
  throw new Error("The answer-card template contains an unresolved placeholder");
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, fragment, "utf8");
console.log(outputPath);
