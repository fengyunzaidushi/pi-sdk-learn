import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import {
  createAgentSession,
  DefaultResourceLoader,
  ModelRuntime,
  SessionManager,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";

const cwd = process.cwd();
const agentDir = await mkdtemp(join(tmpdir(), "pi-sdk-learn-s11-"));
const providerId = process.env.PI_SDK_LEARN_PROVIDER || "anthropic";

try {
  const modelRuntime = await ModelRuntime.create({
    authPath: join(agentDir, "auth.json"),
    modelsPath: null,
    modelsStorePath: join(agentDir, "models-store.json"),
    allowModelNetwork: false,
    refreshOnCreate: false,
  });
  console.log("provider:", providerId);
  console.log("auth configured before override:", modelRuntime.hasConfiguredAuth(providerId));

  const key = process.env.PI_SDK_LEARN_API_KEY;
  if (key) {
    await modelRuntime.setRuntimeApiKey(providerId, key);
    console.log("runtime override configured:", modelRuntime.hasConfiguredAuth(providerId));
  } else {
    console.log("runtime override skipped (PI_SDK_LEARN_API_KEY is unset)");
  }

  const settingsManager = SettingsManager.inMemory();
  const resourceLoader = new DefaultResourceLoader({
    cwd,
    agentDir,
    settingsManager,
    noExtensions: true,
    noSkills: true,
    noPromptTemplates: true,
    noThemes: true,
    noContextFiles: true,
  });
  await resourceLoader.reload();

  const { session } = await createAgentSession({
    cwd,
    agentDir,
    modelRuntime,
    settingsManager,
    resourceLoader,
    sessionManager: SessionManager.inMemory(cwd),
    tools: [],
  });
  try {
    console.log("same model runtime:", session.modelRuntime === modelRuntime);
    const selected = session.model;
    console.log(
      "selected model:",
      selected && modelRuntime.getModel(selected.provider, selected.id)
        ? `${selected.provider}/${selected.id}`
        : "(none; Agent holds an unknown placeholder)",
    );
  } finally {
    session.dispose();
  }
} finally {
  if (dirname(agentDir) !== resolve(tmpdir()) || !basename(agentDir).startsWith("pi-sdk-learn-s11-")) {
    throw new Error("Refusing to remove a directory outside this lesson's temporary area");
  }
  await rm(agentDir, { recursive: true });
}
