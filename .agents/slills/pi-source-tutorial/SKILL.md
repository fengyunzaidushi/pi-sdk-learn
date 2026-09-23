---
name: pi-source-tutorial
description: Manage the current Pi SDK tutorial project context and produce mature, runnable, source-grounded Pi tutorials. Use when the user asks to inspect Pi source code, trace Pi runtime behavior, explain an SDK/API, add or revise a lesson, compare published Pi behavior with source, or create implementation-ready examples under this repository.
---

# Pi Source Tutorial

## Mission

Maintain a reliable working context for this repository and turn verified Pi source behavior into practical tutorials that can be run, inspected, and extended. The tutorial must teach the actual runtime path, not merely restate API names or README claims.

The project root is the current working directory. The requested project skill directory is `.agents/slills/`; preserve this spelling unless the user explicitly asks to rename it.

The authoritative Pi source checkout is F:\\code\\github\\05\\pi. The user has already run git pull there, so treat that checkout as the current source baseline for future investigations. Important Pi SDK examples are in F:\\code\\github\\05\\pi\\packages\\coding-agent\\examples; inspect those examples before designing a lesson that overlaps with SDK usage. The Pi repository also has codebase-memory MCP installed; use its graph/index tools for code discovery and source tracing whenever available, with direct source reads only as a fallback or for verification.

## Operating Context

Before substantial work:

1. Read the repository `README.md`, the relevant chapter `README.md`, and `package.json`.
2. Inspect `git status --short` and do not overwrite or revert unrelated user changes.
3. Use `F:\code\github\05\pi` as the default and authoritative Pi source checkout. Confirm its current branch, commit, and working-tree status before making version-sensitive claims; do not run `git pull` automatically.
4. Inspect `F:\code\github\05\pi\packages\coding-agent\examples` for the closest official/example implementation before writing a new tutorial.
5. Use the codebase-memory MCP installed in the Pi repository for graph-first discovery: confirm the indexed project/generation, search symbols, trace call paths, read exact snippets, and check coverage before negative or exhaustive claims.
6. Record the source revision, package/version, relevant source paths, and example paths in the tutorial notes when they affect behavior.
7. Treat the current project as a standalone learning project: runtime imports should use its declared dependencies unless the user explicitly requests a source-linked experiment.

When the user gives a new Pi source path, use it as the authoritative implementation reference for that task. If the path is missing, ask for it only when source inspection is essential; otherwise proceed with the repository's existing source references and label the limitation.

## Evidence Rules

Separate these claims:

- **Observed in this project**: verified by running a local example or project check.
- **Verified in Pi source**: supported by a specific source file, symbol, and call path.
- **Public API behavior**: supported by exported types, package documentation, or a working import.
- **Inference**: a reasoned explanation that is not directly proven by the current source/runtime.

Never present an inference as source fact. When source versions differ, state the exact revision or package version and explain which behavior may drift.

For each material runtime explanation, trace:

`user input -> public entry point -> orchestration/session layer -> Agent/runtime loop -> provider/model or tool -> emitted event/state -> persistence/output`

Prefer concrete symbol names and file paths. Explain composition roots, runtime loops, adapters, and auxiliary features separately. Do not claim exhaustive coverage from a single file or example.

## Source Investigation Workflow

Use this order:

1. Locate the public entry point and its exported type.
2. Find the implementation symbol in the supplied Pi source checkout.
3. Trace inbound callers and outbound calls until the behavior is explained.
4. Read the smallest complete source slices needed for the claim.
5. Compare source behavior with the current project's installed package and example code.
6. Check edge cases: empty input, repeated calls, errors, disposal, cancellation, persistence, and version-dependent branches.
7. Capture exact paths and symbols in the chapter README or a source-notes section.

For code discovery, prefer the codebase-memory graph belonging to `F:\code\github\05\pi`. At the start of a source task, verify the nearest graph project and generation. Use the graph in this order: project/index status, symbol search, inbound/outbound trace, exact source snippet, then coverage check. If the MCP reports partial, stale, skipped, excluded, pending, or unknown coverage, read the reported source ranges directly before relying on a negative or exhaustive claim. Use targeted `rg`/file reads for literals, configs, non-code files, and graph gaps.

## Tutorial Design Standard

A mature lesson must contain:

1. **Problem**: one concrete engineering question.
2. **Outcome**: what the learner can build or verify afterward.
3. **Minimal runnable example**: focused `code.ts` with explicit lifecycle and error handling.
4. **Source trace**: a concise call chain with exact symbols and paths.
5. **Observable behavior**: what output/events/state the learner should see.
6. **Verification**: copy-pasteable commands, normally `npm run check` or a focused `tsx` command plus any safe runtime check.
7. **Boundaries**: what the example does not prove, especially authentication, provider availability, network calls, persistence, and source-version drift.
8. **Exercise**: one small behavior change that requires understanding the flow.

Use existing repository conventions. Keep lessons independent where practical; do not copy a previous chapter and silently change unrelated behavior. Prefer offline-safe structural experiments for runtime internals and clearly mark examples that can incur model/API costs.

## Implementation Rules

- Use TypeScript and the repository's existing package scripts unless a different language is required by the task.
- Keep public APIs and internal source paths visibly distinct.
- Dispose sessions, subscriptions, temporary files, and runtimes in all relevant paths.
- Make event ordering and state transitions explicit when teaching streaming or tools.
- Avoid fake output that looks like a successful model run. If a mock/faux provider is used, label it as a test double and explain what remains unverified.
- Do not introduce a dependency only to make a small lesson shorter.
- Keep comments short and explain only non-obvious runtime decisions.
- Preserve ASCII by default, matching the existing project files.

## Validation Checklist

Before finishing a lesson or source-based explanation:

- `git diff --check`
- `npm run typecheck` or the narrowest equivalent
- `npm run check:chapters` when chapter structure changes
- Run the lesson in its safe/default mode when possible
- Verify every referenced file and symbol exists in the supplied Pi source checkout
- Confirm no unrelated files were changed
- Report what was statically verified, what was executed, and what remains unverified

If a command cannot run because credentials, network, provider configuration, or an unavailable source checkout is missing, say so explicitly rather than weakening the claim.

## Output Format

For a new or revised lesson, return:

- Changed files with absolute paths.
- The learner-facing problem and outcome.
- The verified Pi call chain.
- Commands run and their results.
- Known limits or follow-up source questions.

For a source investigation without code changes, return the same call chain and evidence classification, then propose the smallest lesson that would demonstrate it.

## Current Project Map

The existing tutorial is organized as `s01_...` through `s13_...`. Its current conceptual anchors include:

- `createAgentSession` for SDK assembly.
- `AgentSession` for the application-facing session façade.
- `Agent` and `runAgentLoop` for prompt/response/tool turn execution.
- `DefaultResourceLoader` for resources, prompts, skills, and context files.
- `SessionManager` and `AgentSessionRuntime` for persistence and session replacement.

Treat these as starting points, not permanent truth. Re-check the supplied Pi source whenever the user asks about a newer revision or a behavior not covered by the current project.
