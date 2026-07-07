"use client";

import {
  createContext,
  ReactNode,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  collectRuntimeDiagnostics,
  logModelError,
  logModelPhase,
} from "@/app/utils/model_logging";
import { Wllama } from "@wllama/wllama/esm/index.js";
import { WebLLMEngine, type InitProgress } from "@/app/engines/web_llm";
import type { EngineType, AppPhase, AppMode } from "@/app/utils/types";
import { getModelConfig } from "@/app/utils/models";


export interface ModelContextType {
  phase: AppPhase;
  modelId: string | null;
  error: string | null;
  initProgress: InitProgress | null;
  engineType: EngineType;
  mode: AppMode;

  selectModel: (modelId: string) => void;
  setMode: (mode: AppMode) => void;
  setCloudReady: () => void;
  abortDownload: () => void;
  abortInference: () => void;
  runInference: (
    prompt: string,
    systemPrompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
      onToken?: (token: string) => void;
    },
  ) => Promise<string>;
  runCloudAnalysis: (
    text: string,
    onToken?: (token: string) => void,
  ) => Promise<string>;
  clearError: () => void;
  resetModel: () => void;
}

export const ModelContext = createContext<ModelContextType | undefined>(
  undefined,
);

interface ModelProviderProps {
  children: ReactNode;
  defaultEngine?: EngineType;
}

export function ModelProvider({
  children,
  defaultEngine = "webllm",
}: ModelProviderProps) {
  const [phase, setPhase] = useState<AppPhase>("select");
  const [modelId, setModelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initProgress, setInitProgress] = useState<InitProgress | null>(null);
  const [mode, setModeState] = useState<AppMode>(null);

  const wllamaRef = useRef<Wllama | null>(null);
  const webllmEngineRef = useRef<WebLLMEngine | null>(null);
  const cancelledRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const modelConfigRef = useRef<Record<string, number | undefined>>({});
  const initStartedRef = useRef(false);

  const engineType = defaultEngine;

  useEffect(() => {
    if (mode !== "local") return;
    if (phase !== "downloading" || !modelId || engineType !== "webllm") return;
    if (initStartedRef.current) return;

    initStartedRef.current = true;
    cancelledRef.current = false;

    const initEngine = async () => {
      setInitProgress(null);
      setError(null);

      try {
        logModelPhase("webllm-init-start", { modelId });
        const engine = new WebLLMEngine();
        webllmEngineRef.current = engine;
        await engine.initialize(modelId, (progress) => {
          if (cancelledRef.current) return;
          setInitProgress(progress);
          logModelPhase("webllm-init-progress", {
            text: progress.text,
            progress: progress.progress,
          });
        });
        if (cancelledRef.current) return;
        logModelPhase("webllm-init-complete", { modelId });
        setPhase("ready");
      } catch (err) {
        if (cancelledRef.current) return;
        const runtimeDiagnostics = await collectRuntimeDiagnostics(true);
        logModelError(
          err,
          { phase: "webllm-init-failed", modelUrl: modelId },
          runtimeDiagnostics,
        );
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    initEngine();

    return () => {
      cancelledRef.current = true;
    };
  }, [phase, modelId, engineType, mode]);

  const setMode = useCallback((newMode: AppMode) => {
    webllmEngineRef.current?.reset();
    webllmEngineRef.current = null;
    wllamaRef.current = null;
    setModeState(newMode);
    if (newMode === "cloud") {
      setPhase("ready");
      setModelId("cloud");
      setError(null);
      setInitProgress(null);
    } else if (newMode === "local") {
      setPhase("select");
      setModelId(null);
      setError(null);
      setInitProgress(null);
    }
    initStartedRef.current = false;
  }, []);

  const setCloudReady = useCallback(() => {
    setPhase("ready");
    setModelId("cloud");
  }, []);

  const selectModel = useCallback((id: string) => {
    setModelId(id);
    setError(null);
    setInitProgress(null);
    setPhase("downloading");
    const rc = getModelConfig(id);
    modelConfigRef.current = {
      temperature: rc?.temperature,
      top_p: rc?.top_p,
      frequency_penalty: rc?.frequency_penalty,
      presence_penalty: rc?.presence_penalty,
    };
  }, []);

  const isGeneratingRef = useRef(false);

  const runInference = useCallback(
    async (
      prompt: string,
      systemPrompt: string,
      options?: {
        temperature?: number;
        maxTokens?: number;
        topP?: number;
        frequencyPenalty?: number;
        presencePenalty?: number;
        onToken?: (token: string) => void;
      },
    ): Promise<string> => {
      if (isGeneratingRef.current) {
        abortRef.current?.abort();
        await new Promise((r) => setTimeout(r, 0));
      }

      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;
      isGeneratingRef.current = true;

      const engine = webllmEngineRef.current;
      if (!engine || !engine.isReady)
        throw new Error("Model is not initialized.");

      try {
        const mc = modelConfigRef.current;
        if (options?.onToken) {
          return await engine.streamChat(
            [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt },
            ],
            options.onToken,
            {
              temperature: options.temperature ?? mc.temperature,
              maxTokens: options.maxTokens,
              topP: options.topP ?? mc.top_p,
              frequencyPenalty:
                options.frequencyPenalty ?? mc.frequency_penalty,
              presencePenalty: options.presencePenalty ?? mc.presence_penalty,
              signal,
            },
          );
        }

        const response = await engine.chat(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          {
            temperature: options?.temperature ?? mc.temperature,
            maxTokens: options?.maxTokens,
            topP: options?.topP ?? mc.top_p,
            frequencyPenalty: options?.frequencyPenalty ?? mc.frequency_penalty,
            presencePenalty: options?.presencePenalty ?? mc.presence_penalty,
            signal,
          },
        );

        return response.choices?.[0]?.message?.content ?? "";
      } finally {
        isGeneratingRef.current = false;
      }
    },
    [],
  );

  const runCloudAnalysis = useCallback(
    async (
      text: string,
      onToken?: (token: string) => void,
    ): Promise<string> => {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Cloud analysis failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.error) throw new Error(data.error);
            if (data.done) {
              full = data.full;
            } else if (data.token) {
              full += data.token;
              onToken?.(data.token);
            }
          } catch (err) {
            if (err instanceof Error && err.message !== "Unexpected end of JSON input") {
              throw err;
            }
          }
        }
      }

      return full;
    },
    [],
  );

  const abortDownload = useCallback(() => {
    cancelledRef.current = true;
    initStartedRef.current = false;
    webllmEngineRef.current?.reset();
    webllmEngineRef.current = null;
    setPhase("select");
    setModelId(null);
    setError(null);
    setInitProgress(null);
  }, []);

  const abortInference = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    isGeneratingRef.current = false;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetModel = useCallback(() => {
    initStartedRef.current = false;
    webllmEngineRef.current?.reset();
    webllmEngineRef.current = null;
    wllamaRef.current = null;
    setPhase(mode === "cloud" ? "ready" : "select");
    setModelId(mode === "cloud" ? "cloud" : null);
    setError(null);
    setInitProgress(null);
  }, [mode]);

  const value: ModelContextType = {
    phase,
    modelId,
    error,
    initProgress,
    engineType,
    mode,
    selectModel,
    setMode,
    setCloudReady,
    abortDownload,
    abortInference,
    runInference,
    runCloudAnalysis,
    clearError,
    resetModel,
  };

  return (
    <ModelContext.Provider value={value}>{children}</ModelContext.Provider>
  );
}
