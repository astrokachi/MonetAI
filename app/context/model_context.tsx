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
import type { EngineType, AppPhase } from "@/app/utils/types";
import { getModelConfig } from "@/app/utils/models";

export interface ModelContextType {
  phase: AppPhase;
  modelId: string | null;
  error: string | null;
  initProgress: InitProgress | null;
  engineType: EngineType;

  selectModel: (modelId: string) => void;
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

  const wllamaRef = useRef<Wllama | null>(null);
  const webllmEngineRef = useRef<WebLLMEngine | null>(null);
  const cancelledRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const modelConfigRef = useRef<Record<string, number | undefined>>({});

  const engineType = defaultEngine;

  useEffect(() => {
    if (phase !== "downloading" || !modelId || engineType !== "webllm") return;

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
  }, [phase, modelId, engineType]);

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
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;

      if (engineType === "wllama") {
        if (!wllamaRef.current) throw new Error("Model is not initialized.");

        const response = await (wllamaRef.current as any).createChatCompletion({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: options?.temperature ?? 0.5,
          top_p: options?.topP ?? 0.3,
          max_tokens: options?.maxTokens ?? 512,
          cache_prompt: true,
          n_keep: -1,
        });

        return response.choices?.[0]?.message?.content ?? "";
      }

      const engine = webllmEngineRef.current;
      if (!engine || !engine.isReady)
        throw new Error("Model is not initialized.");

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
            frequencyPenalty: options.frequencyPenalty ?? mc.frequency_penalty,
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
    },
    [engineType],
  );

  const abortDownload = useCallback(() => {
    cancelledRef.current = true;
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
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetModel = useCallback(() => {
    webllmEngineRef.current?.reset();
    webllmEngineRef.current = null;
    wllamaRef.current = null;
    setPhase("select");
    setModelId(null);
    setError(null);
    setInitProgress(null);
  }, []);

  const value: ModelContextType = {
    phase,
    modelId,
    error,
    initProgress,
    engineType,
    selectModel,
    abortDownload,
    abortInference,
    runInference,
    clearError,
    resetModel,
  };

  return (
    <ModelContext.Provider value={value}>{children}</ModelContext.Provider>
  );
}
