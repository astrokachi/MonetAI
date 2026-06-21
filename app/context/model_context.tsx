'use client';

import { createContext, ReactNode, useState, useCallback } from 'react';
import { initModel, getModelFromCache } from '@/app/utils/model_init';
import {
  collectRuntimeDiagnostics,
  estimateTokensFromText,
  formatModelErrorForUi,
  logModelError,
  logModelPhase,
} from '@/app/utils/model_logging';
import { Wllama } from '@wllama/wllama/esm/index.js';

export interface ModelContextType {
  // model state
  isInitializing: boolean;
  isRunning: boolean;
  modelReady: boolean;
  error: string | null;

  // model instance
  wllama: Wllama | null;

  // actions
  initializeModel: (modelUrl: string) => Promise<void>;
  runInference: (prompt: string, options?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  }) => Promise<any>;
  clearError: () => void;
  resetModel: () => void;
}

export const ModelContext = createContext<ModelContextType | undefined>(undefined);

interface ModelProviderProps {
  children: ReactNode;
}

export function ModelProvider({ children }: ModelProviderProps) {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wllama, setWllama] = useState<Wllama | null>(null);

  const initializeModel = useCallback(async (modelUrl: string) => {
    if (!modelUrl) throw new Error("Please provide a model.")

    if (modelReady) {
      console.log("Model already initialized");
      return;
    }

    setIsInitializing(true);
    setError(null);

    try {
      logModelPhase('cache-read', { modelUrl });
      const modelBlob = await getModelFromCache(modelUrl);

      if (!modelBlob) {
        throw new Error("Model not found in cache. Please download it first.");
      }

      logModelPhase('init-start', {
        modelUrl,
        cachedModelSizeBytes: modelBlob.size,
      });

      const instance = await initModel(modelBlob);

      setWllama(instance);
      setModelReady(true);
    } catch (err) {
      const runtimeDiagnostics = await collectRuntimeDiagnostics(true);
      const serialized = logModelError(err, {
        phase: 'init-failed',
        modelUrl,
      }, runtimeDiagnostics);
      const errorMsg = formatModelErrorForUi(serialized);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsInitializing(false);
    }
  }, [modelReady]);

  const runInference = useCallback(
    async (
      prompt: string,
      options?: {
        temperature?: number;
        maxTokens?: number;
        topP?: number;
      }
    ) => {
      if (!modelReady || !wllama) {
        throw new Error("Model is not ready. Call initializeModel() first.");
      }

      setIsRunning(true);
      setError(null);

      const inferenceOptions = {
        temperature: options?.temperature ?? 0.7,
        top_p: options?.topP ?? 0.9,
        max_tokens: options?.maxTokens ?? 512,
      };
      const promptTokenEstimate = estimateTokensFromText(prompt);

      try {
        logModelPhase('inference-start', {
          promptLength: prompt.length,
          promptTokenEstimate,
          inferenceOptions,
          modelLoaded: wllama.isModelLoaded(),
        });

        console.time("generate");
        const response = await wllama.createChatCompletion({
          messages: [
            {
              role: "system",
              content: `You are a helpful assistant that processes and analyzes document content. \n 
                        The user will send a text (extracted from a bank statement) you are to properly parse the text to human readable format. \n
                        Return the complete parsed text.`
            },
            {
              role: "user",
              content: prompt
            }
          ],
          ...inferenceOptions,
        });
        console.timeEnd("generate");

        logModelPhase('inference-complete', {
          finishReason: response.choices?.[0]?.finish_reason ?? null,
          outputLength: response.choices?.[0]?.message?.content?.length ?? 0,
        });

        return response;
      } catch (err) {
        console.timeEnd("generate");

        const runtimeDiagnostics = await collectRuntimeDiagnostics(true);
        let debugInfo: unknown = null;
        try {
          debugInfo = await wllama._getDebugInfo();
          logModelPhase('inference-failed', { debugInfo });
        } catch (debugErr) {
          logModelPhase('inference-failed', {
            debugInfoError: debugErr instanceof Error ? debugErr.message : String(debugErr),
          });
        }

        const serialized = logModelError(err, {
          phase: 'inference-failed',
          promptLength: prompt.length,
          promptTokenEstimate,
          inferenceOptions,
        }, runtimeDiagnostics);

        setError(formatModelErrorForUi(serialized));
        throw new Error(formatModelErrorForUi(serialized));
      } finally {
        setIsRunning(false);
      }
    },
    [modelReady, wllama]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetModel = useCallback(async () => {
    try {
      if (wllama) {
        await wllama.exit();
      }
    } catch (err) {
      logModelError(err, { phase: 'model-reset' });
    } finally {
      setWllama(null);
      setModelReady(false);
      setError(null);
      setIsRunning(false);
      setIsInitializing(false);
    }
  }, [wllama]);

  const value: ModelContextType = {
    isInitializing,
    isRunning,
    modelReady,
    error,
    wllama,
    initializeModel,
    runInference,
    clearError,
    resetModel,
  };

  return (
    <ModelContext.Provider value={value}>
      {children}
    </ModelContext.Provider>
  );
}
