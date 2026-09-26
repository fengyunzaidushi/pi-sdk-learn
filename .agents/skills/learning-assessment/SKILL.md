---
name: learning-assessment
description: Create source-grounded quizzes or exams with an interactive answer card, then grade the submission and identify weak knowledge areas. Use when the user asks to test mastery of specified chapters, lessons, documents, code, or other study material.
---

# Learning Assessment

Create an assessment from the material the user actually studied, collect answers without exposing the key, and provide evidence-based feedback after submission.

## Establish the scope

- Prefer the chapters, files, links, or pasted material named by the user. Inspect the actual material before writing questions.
- Reuse authoritative material already established in the current conversation when it is still current.
- If the scope could refer to materially different courses or versions, ask one concise question. Do not invent a syllabus.
- In a repository, follow its discovery instructions. For code lessons, read both the teaching text and runnable example; verify types or source for questions about exact API behavior.

## Build the exam

Unless the user specifies otherwise, use these defaults:

- 20 single-choice questions, four options each, one correct answer, 5 points per question.
- Distribute questions across the requested chapters in proportion to their substance; give every chapter meaningful coverage.
- Mix roughly 25% direct concepts, 50% behavior or boundary questions, and 25% short scenarios or cross-concept reasoning.
- Keep the answer key in working context for later grading. Never put correct answers in the displayed paper, answer-card HTML, widget state, or submission prompt.

Every question must have one defensible answer from the inspected material. Use plausible distractors based on nearby concepts or common misunderstandings. Avoid trivia, trick wording, answer-length clues, and facts outside the stated scope. If a question becomes ambiguous, rewrite it before presenting the paper.

Present the paper before the answer card. State the scope, question count, scoring, and whether each question has one answer. Do not include teaching hints that reveal the correct option.

## Generate the answer card

For an in-conversation answer card, use `scripts/generate-answer-card.mjs`. It creates a visualization fragment with single-choice controls, progress, persisted selections, and a submit action. It intentionally contains no answer key.

```powershell
node scripts/generate-answer-card.mjs `
  --output <absolute-visualization-path> `
  --title "<exam title>" `
  --questions 20 `
  --options A,B,C,D
```

Choose a new file in the current thread's writable visualization directory. Then return the generated fragment through the conversation's visualization mechanism. Use `--force` only when intentionally updating that exact answer card. Run with `--help` for all options.

If inline visualization is unavailable, provide a compact numbered answer sheet and ask the user to reply in the form `1B 2C ...`. Do not turn the fallback into a separate app unless requested.

## Grade the submission

Compare every submitted option with the retained key. Report:

1. Score, correct count, and total count.
2. Each wrong question with the user's answer, correct answer, source concept, and a short explanation.
3. A concise summary of weak chapters or concepts supported by the mistakes.

Do not infer broad weakness from one isolated error. If review shows a question was ambiguous or unsupported, exclude it from scoring instead of penalizing the user. When the user requests another round, vary the scenarios and concentrate additional questions on demonstrated gaps without repeating the same wording.
