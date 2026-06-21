'use client';

import { Wllama } from '@wllama/wllama/esm/index.js';
import {
  collectRuntimeDiagnostics,
  createWllamaLogger,
  logModelError,
  logModelPhase,
  logRuntimeDiagnostics,
} from '@/app/utils/model_logging';

const CONFIG_PATHS = {
  default: '/wllama/wasm/wllama.wasm',
};

const LOAD_PARAMS = {
  n_threads: Math.max(1, navigator.hardwareConcurrency - 1),
  n_ctx: 2048,
  n_gpu_layers: 2,
};

/**
 * Initializes the wllama instance with a model blob
 * This service is independent and only reads from cache
 * The download/caching is handled separately by downloadModel()
 */
export async function initModel(modelBlob: Blob): Promise<Wllama> {
  let runtimeDiagnostics;

  try {
    runtimeDiagnostics = await logRuntimeDiagnostics('init-start');

    logModelPhase('init-wllama-create', {
      wasmPath: CONFIG_PATHS.default,
      modelBlobSizeBytes: modelBlob.size,
      modelBlobType: modelBlob.type,
      loadParams: LOAD_PARAMS,
      wllamaLibVersion: Wllama.getLibllamaVersion(),
    });

    const wllama = new Wllama(CONFIG_PATHS, {
      logger: createWllamaLogger(),
      suppressNativeLog: false,
    });

    logModelPhase('init-load-model', {
      ...LOAD_PARAMS,
      webgpuSupportedByApi: wllama.isSupportWebGPU(),
    });
    await wllama.loadModel([modelBlob], LOAD_PARAMS);

    logModelPhase('init-complete', {
      modelLoaded: wllama.isModelLoaded(),
      bosToken: wllama.getBOS(),
      eosToken: wllama.getEOS(),
    });

    return wllama;
  } catch (error) {
    if (!runtimeDiagnostics) {
      runtimeDiagnostics = await collectRuntimeDiagnostics(true);
    }

    logModelError(error, {
      phase: 'init-failed',
      modelBlobSize: modelBlob.size,
      loadParams: LOAD_PARAMS,
    }, runtimeDiagnostics);

    throw error;
  }
}

/**
 * Gets the model blob from cache
 * Returns null if model is not cached
 */
export async function getModelFromCache(modelUrl: string): Promise<Blob | null> {
  try {
    const cache = await caches.open('ai-models');
    const cachedResponse = await cache.match(modelUrl);

    if (!cachedResponse) {
      logModelPhase('cache-read', { modelUrl, cached: false });
      return null;
    }

    const blob = await cachedResponse.blob();
    logModelPhase('cache-read', {
      modelUrl,
      cached: true,
      sizeBytes: blob.size,
      type: blob.type,
    });
    return blob;
  } catch (error) {
    logModelError(error, { phase: 'cache-read', modelUrl });
    return null;
  }
}

/**
 * Checks if a model is already cached
 */
export async function isModelCached(modelUrl: string): Promise<boolean> {
  try {
    const cache = await caches.open('ai-models');
    const cachedResponse = await cache.match(modelUrl);
    return !!cachedResponse;
  } catch (error) {
    console.error("Failed to check cache:", error);
    return false;
  }
}
