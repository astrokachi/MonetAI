'use client';

import { useContext, useEffect, useCallback } from 'react';
import { ModelContext, ModelContextType } from '@/app/context/model_context';

interface UseModelInferenceOptions {
  autoInitialize?: boolean;
  onError?: (error: Error) => void;
}

export function useModelInference(options?: UseModelInferenceOptions): ModelContextType {
  const context = useContext(ModelContext);

  if (!context) {
    throw new Error('useModelInference must be used within ModelProvider');
  }

  const { isInitializing, modelReady, initializeModel } = context;
  const shouldAutoInit = options?.autoInitialize ?? true;

  // auto initialize model on mount if requested
  useEffect(() => {
    if (shouldAutoInit && !modelReady && !isInitializing) {
      initializeModel().catch(err => {
        options?.onError?.(err);
      });
    }
  }, [shouldAutoInit, modelReady, isInitializing, initializeModel, options]);

  // Handle errors
  useEffect(() => {
    if (context.error && options?.onError) {
      options.onError(new Error(context.error));
    }
  }, [context.error, options]);

  return context;
}
