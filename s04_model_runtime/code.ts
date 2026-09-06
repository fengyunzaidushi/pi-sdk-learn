import { createAgentSession, ModelRuntime, SessionManager } from "@earendil-works/pi-coding-agent";

const modelRuntime = await ModelRuntime.create();
const availableModels = await modelRuntime.getAvailable();

console.log("available models:");
for (const model of availableModels) {
  console.log(`- ${model.provider}/${model.id} reasoning=${model.reasoning}`);
}

const selectedModel = availableModels[0];
if (!selectedModel) {
  console.log("No authenticated model is available. Configure a provider before running a prompt.");
  process.exitCode = 0;
} else {
  const { session } = await createAgentSession({
    modelRuntime,
    model: selectedModel,
    thinkingLevel: "high",
    sessionManager: SessionManager.inMemory(),
    tools: [],
  });

  try {
    console.log(`selected model: ${session.model?.provider}/${session.model?.id}`);
    console.log(`effective thinking level: ${session.thinkingLevel}`);
  } finally {
    session.dispose();
  }
}
