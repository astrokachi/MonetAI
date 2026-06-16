'use client';

import { createContext, ReactNode, useState, useCallback } from 'react';
import { initModel, getModelFromCache } from '@/app/utils/model_init';
import { MODELS } from '@/app/utils/models';
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
      console.log("Getting model from cache...");
      const modelBlob = await getModelFromCache(modelUrl);

      if (!modelBlob) {
        throw new Error("Model not found in cache. Please download it first.");
      }

      console.log("Initializing wllama with cached model...");
      const instance = await initModel(modelBlob);

      setWllama(instance);
      setModelReady(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to initialize model';
      setError(errorMsg);
      console.error("Model initialization failed:", errorMsg);
      throw err;
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
      console.log("hook model readiness: ", modelReady);
      if (!modelReady || !wllama) {
        throw new Error("Model is not ready. Call initializeModel() first.");
      }

      setIsRunning(true);
      setError(null);

      try {
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
          temperature: options?.temperature ?? 0.7,
          top_p: options?.topP ?? 0.9,
          max_tokens: options?.maxTokens ?? 512,
        });

        console.log("Inference finsihed. Output: ", response);
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Inference failed';
        setError(errorMsg);
        throw err;
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
      console.error("Error unloading model:", err);
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
