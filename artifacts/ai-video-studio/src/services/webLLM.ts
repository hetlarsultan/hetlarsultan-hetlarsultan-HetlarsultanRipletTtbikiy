import type {
  MLCEngineInterface,
  InitProgressReport,
} from "@mlc-ai/web-llm";

export const WEBLLM_MODELS: { id: string; label: string; sizeMB: number }[] = [
  {
    id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    label: "Llama 3.2 1B (سريع)",
    sizeMB: 880,
  },
  {
    id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    label: "Qwen 2.5 1.5B (عربي ممتاز)",
    sizeMB: 1100,
  },
  {
    id: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
    label: "Llama 3.2 3B (جودة أعلى)",
    sizeMB: 2100,
  },
];

const STORAGE_MODEL = "studio_webllm_model";
export const DEFAULT_WEBLLM_MODEL = WEBLLM_MODELS[0].id;

type ProgressListener = (report: InitProgressReport) => void;

let engine: MLCEngineInterface | null = null;
let initPromise: Promise<MLCEngineInterface> | null = null;
let currentModel: string | null = null;
const listeners = new Set<ProgressListener>();

export function getSelectedWebLLMModel(): string {
  if (typeof window === "undefined") return DEFAULT_WEBLLM_MODEL;
  try {
    return localStorage.getItem(STORAGE_MODEL) || DEFAULT_WEBLLM_MODEL;
  } catch {
    return DEFAULT_WEBLLM_MODEL;
  }
}

export function setSelectedWebLLMModel(modelId: string) {
  try {
    localStorage.setItem(STORAGE_MODEL, modelId);
  } catch {
    /* ignore */
  }
  // Reset engine if model changed
  if (currentModel && currentModel !== modelId) {
    engine = null;
    initPromise = null;
    currentModel = null;
  }
}

export function onWebLLMProgress(listener: ProgressListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isWebLLMSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  return "gpu" in navigator;
}

export function isWebLLMReady(): boolean {
  return engine !== null;
}

export function getCurrentModelId(): string | null {
  return currentModel;
}

export async function ensureWebLLM(
  modelId?: string,
): Promise<MLCEngineInterface> {
  const target = modelId || getSelectedWebLLMModel();
  if (engine && currentModel === target) return engine;
  if (initPromise) return initPromise;

  if (!isWebLLMSupported()) {
    throw new Error("WEBGPU_UNSUPPORTED");
  }

  initPromise = (async () => {
    const mod = await import("@mlc-ai/web-llm");
    const e = await mod.CreateMLCEngine(target, {
      initProgressCallback: (report: InitProgressReport) => {
        listeners.forEach((l) => l(report));
      },
    });
    engine = e;
    currentModel = target;
    return e;
  })().catch((err) => {
    initPromise = null;
    throw err;
  });

  return initPromise;
}

export async function* generateWebLLMStream(
  prompt: string,
): AsyncGenerator<string> {
  const e = await ensureWebLLM();
  const completion = await e.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    stream: true,
  });
  for await (const chunk of completion) {
    const piece = chunk.choices?.[0]?.delta?.content;
    if (piece) yield piece;
  }
}

export async function generateWebLLMOnce(prompt: string): Promise<string> {
  const e = await ensureWebLLM();
  const reply = await e.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    stream: false,
  });
  return reply.choices?.[0]?.message?.content || "";
}
