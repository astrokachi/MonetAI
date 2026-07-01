"use client";

import type { WllamaLogger } from "@wllama/wllama/esm/index.js";

const LOG_PREFIX = "[monetai:model]";

type NavigatorWithGpu = Navigator & {
  gpu?: {
    requestAdapter: () => Promise<{
      limits: Record<string, number>;
      requestAdapterInfo?: () => Promise<{
        vendor?: string;
        architecture?: string;
        device?: string;
        description?: string;
      }>;
    } | null>;
  };
  deviceMemory?: number;
};

function getNavigator(): NavigatorWithGpu {
  return navigator as NavigatorWithGpu;
}

export type ModelLogPhase =
  | "runtime-diagnostics"
  | "cache-read"
  | "init-start"
  | "init-wllama-create"
  | "init-load-model"
  | "init-complete"
  | "init-failed"
  | "inference-start"
  | "inference-complete"
  | "inference-failed"
  | "model-reset"
  | "init-retry-cpu-only"
  | "init-failed-retry"
  | "gpu-warmup-failed"
  | "hook-error"
  | "webllm-init-start"
  | "webllm-init-progress"
  | "webllm-init-complete"
  | "webllm-init-failed"
  | "webllm-inference-start"
  | "webllm-inference-complete"
  | "webllm-inference-failed"
  | "engine-switch";

export interface ModelErrorContext {
  phase: ModelLogPhase;
  modelUrl?: string;
  promptLength?: number;
  promptTokenEstimate?: number;
  inferenceOptions?: Record<string, unknown>;
  modelBlobSize?: number;
  gpuProbeReason?: string;
  willRetryWithoutGpu?: boolean;
  loadParams?: Record<string, unknown>;
}

export interface RuntimeDiagnostics {
  timestamp: string;
  userAgent: string;
  platform: string;
  language: string;
  hardwareConcurrency: number;
  deviceMemoryGb: number | null;
  maxTouchPoints: number;
  wasm: {
    jspi: boolean;
    mem64: boolean;
    needCompatMode: boolean;
  };
  webgpu: {
    apiAvailable: boolean;
    adapterAvailable: boolean | null;
    adapterInfo: Record<string, string> | null;
    adapterLimits: Record<string, number> | null;
    requestError: string | null;
  };
  storage: {
    quotaBytes: number | null;
    usageBytes: number | null;
  };
}

export interface SerializedModelError {
  phase: ModelLogPhase;
  message: string;
  name: string;
  errorClass:
    | "WllamaRuntimeError"
    | "WllamaError"
    | "WllamaAbortError"
    | "Error"
    | "unknown";
  wllamaErrorType?: string;
  wasmStack?: string;
  jsStack?: string;
  likelyCause?: string;
  context?: ModelErrorContext;
  runtimeDiagnostics?: RuntimeDiagnostics;
}

let cachedDiagnostics: RuntimeDiagnostics | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function detectLikelyCause(
  message: string,
  wasmStack?: string,
): string | undefined {
  const haystack = `${message}\n${wasmStack ?? ""}`.toLowerCase();

  if (haystack.includes("ggml_backend_webgpu")) {
    return "WebGPU backend failure during graph compute or queue synchronization. Common on Safari/macOS when GPU layers are enabled or WebGPU support is partial.";
  }
  if (haystack.includes("update_slots")) {
    return "Inference slot update failed inside llama.cpp server context, often during token generation or result polling.";
  }
  if (haystack.includes("cannot allocate webassembly.memory")) {
    return "WebAssembly memory allocation failed, often on mobile Safari or low-memory devices.";
  }
  if (message.includes("(ABORT)")) {
    return "Native WASM abort (ggml_abort). Check the WASM stack trace above for the failing C++ function.";
  }
  if (haystack.includes("kv_cache") || haystack.includes("context")) {
    return "Context or KV cache limit may have been exceeded for the prompt size.";
  }

  return undefined;
}

function classifyError(err: unknown): SerializedModelError["errorClass"] {
  if (!isRecord(err)) return "unknown";

  if (err.name === "RuntimeError") return "WllamaRuntimeError";
  if (err.name === "AbortError") return "WllamaAbortError";
  if (typeof err.type === "string" && err instanceof Error)
    return "WllamaError";

  if (err instanceof Error) return "Error";
  return "unknown";
}

export function logModelPhase(
  phase: ModelLogPhase,
  details?: Record<string, unknown>,
): void {
  if (details) {
    console.log(`${LOG_PREFIX} [${phase}]`, details);
    return;
  }
  console.log(`${LOG_PREFIX} [${phase}]`);
}

export function logModelWarning(
  message: string,
  details?: Record<string, unknown>,
): void {
  if (details) {
    console.warn(`${LOG_PREFIX} ${message}`, details);
    return;
  }
  console.warn(`${LOG_PREFIX} ${message}`);
}

function isSupportMem64(): boolean {
  try {
    new WebAssembly.Memory({
      address: "i64",
      initial: 1,
    } as unknown as WebAssembly.MemoryDescriptor);
    return true;
  } catch {
    return false;
  }
}

async function getWebGpuDiagnostics(): Promise<RuntimeDiagnostics["webgpu"]> {
  const nav = getNavigator();
  const base = {
    apiAvailable: !!nav.gpu,
    adapterAvailable: null as boolean | null,
    adapterInfo: null as Record<string, string> | null,
    adapterLimits: null as Record<string, number> | null,
    requestError: null as string | null,
  };

  if (!nav.gpu) {
    return base;
  }

  try {
    const adapter = await nav.gpu.requestAdapter();
    if (!adapter) {
      return { ...base, adapterAvailable: false };
    }

    const limits: Record<string, number> = {};
    for (const [key, value] of Object.entries(adapter.limits)) {
      if (typeof value === "number") {
        limits[key] = value;
      }
    }

    let adapterInfo: Record<string, string> | null = null;
    if (
      "requestAdapterInfo" in adapter &&
      typeof adapter.requestAdapterInfo === "function"
    ) {
      try {
        const info = await adapter.requestAdapterInfo();
        adapterInfo = {
          vendor: info.vendor ?? "unknown",
          architecture: info.architecture ?? "unknown",
          device: info.device ?? "unknown",
          description: info.description ?? "unknown",
        };
      } catch (infoErr) {
        adapterInfo = {
          infoError:
            infoErr instanceof Error ? infoErr.message : String(infoErr),
        };
      }
    }

    return {
      ...base,
      adapterAvailable: true,
      adapterInfo,
      adapterLimits: limits,
    };
  } catch (err) {
    return {
      ...base,
      adapterAvailable: false,
      requestError: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function collectRuntimeDiagnostics(
  forceRefresh = false,
): Promise<RuntimeDiagnostics> {
  if (cachedDiagnostics && !forceRefresh) {
    return cachedDiagnostics;
  }

  const jspi = !!(WebAssembly as { Suspending?: unknown }).Suspending;
  const mem64 = isSupportMem64();

  let quotaBytes: number | null = null;
  let usageBytes: number | null = null;
  if (navigator.storage?.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      quotaBytes = estimate.quota ?? null;
      usageBytes = estimate.usage ?? null;
    } catch {
      // ignore storage estimate failures
    }
  }

  cachedDiagnostics = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemoryGb: getNavigator().deviceMemory ?? null,
    maxTouchPoints: navigator.maxTouchPoints,
    wasm: {
      jspi,
      mem64,
      needCompatMode: !jspi || !mem64,
    },
    webgpu: await getWebGpuDiagnostics(),
    storage: {
      quotaBytes,
      usageBytes,
    },
  };

  return cachedDiagnostics;
}

export async function logRuntimeDiagnostics(
  phase: ModelLogPhase = "runtime-diagnostics",
): Promise<RuntimeDiagnostics> {
  const diagnostics = await collectRuntimeDiagnostics(true);
  logModelPhase(phase, diagnostics as unknown as Record<string, unknown>);
  return diagnostics;
}

export function serializeModelError(
  err: unknown,
  context: ModelErrorContext,
  runtimeDiagnostics?: RuntimeDiagnostics,
): SerializedModelError {
  const errorClass = classifyError(err);
  const message = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : "UnknownError";
  const jsStack = err instanceof Error ? err.stack : undefined;

  let wasmStack: string | undefined;
  let wllamaErrorType: string | undefined;

  if (isRecord(err)) {
    if (typeof err.stack === "string" && errorClass === "WllamaRuntimeError") {
      wasmStack = err.stack;
    }
    if (typeof err.type === "string") {
      wllamaErrorType = err.type;
    }
  }

  return {
    phase: context.phase,
    message,
    name,
    errorClass,
    wllamaErrorType,
    wasmStack,
    jsStack,
    likelyCause: detectLikelyCause(message, wasmStack ?? jsStack),
    context,
    runtimeDiagnostics,
  };
}

export function logModelError(
  err: unknown,
  context: ModelErrorContext,
  runtimeDiagnostics?: RuntimeDiagnostics,
): SerializedModelError {
  const serialized = serializeModelError(err, context, runtimeDiagnostics);

  console.group(`${LOG_PREFIX} ERROR [${context.phase}] ${serialized.message}`);
  console.error("Summary:", {
    errorClass: serialized.errorClass,
    name: serialized.name,
    wllamaErrorType: serialized.wllamaErrorType,
    likelyCause: serialized.likelyCause,
  });

  if (serialized.context) {
    console.error("Context:", serialized.context);
  }

  if (serialized.wasmStack) {
    console.error("WASM stack trace:\n" + serialized.wasmStack);
  }

  if (serialized.jsStack) {
    console.error("JS stack trace:\n" + serialized.jsStack);
  }

  if (serialized.runtimeDiagnostics) {
    console.error("Runtime diagnostics:", serialized.runtimeDiagnostics);
  }

  console.error("Raw error object:", err);
  console.groupEnd();

  return serialized;
}

export function createWllamaLogger(): WllamaLogger {
  return {
    debug: (...args: unknown[]) =>
      console.debug(`${LOG_PREFIX} [wllama:debug]`, ...args),
    log: (...args: unknown[]) => console.log(`${LOG_PREFIX} [wllama]`, ...args),
    warn: (...args: unknown[]) =>
      console.warn(`${LOG_PREFIX} [wllama:warn]`, ...args),
    error: (...args: unknown[]) =>
      console.error(`${LOG_PREFIX} [wllama:error]`, ...args),
  };
}

export function estimateTokensFromText(text: string): number {
  // Rough heuristic for logging only (≈4 chars per token for English text).
  return Math.ceil(text.length / 4);
}

export function formatModelErrorForUi(
  serialized: SerializedModelError,
): string {
  const parts = [serialized.message];

  if (serialized.likelyCause) {
    parts.push(serialized.likelyCause);
  }

  if (serialized.wasmStack) {
    const firstMeaningfulLine = serialized.wasmStack
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0);

    if (firstMeaningfulLine) {
      parts.push(`WASM: ${firstMeaningfulLine}`);
    }
  }

  return parts.join(" — ");
}
