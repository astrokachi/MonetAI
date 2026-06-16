'use client';

import { Wllama } from '@wllama/wllama/esm/index.js';

const CONFIG_PATHS = {
  default: '/wllama/wasm/wllama.wasm',
}

/**
 * Initializes the wllama instance with a model blob
 * This service is independent and only reads from cache
 * The download/caching is handled separately by downloadModel()
 */
export async function initModel(modelBlob: Blob): Promise<Wllama> {
  try {
    console.log("Creating Wllama instance...");
    const wllama = new Wllama(CONFIG_PATHS);

    console.log("Loading model into wllama...");
    await wllama.loadModel([modelBlob], {
      n_threads: Math.max(1, navigator.hardwareConcurrency - 1),
      n_ctx: 2048,
      n_gpu_layers: 2,
    });

    console.log("Model loaded successfully");
    return wllama;
  } catch (error) {
    console.error("Failed to load model:", error);
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
      console.log("Model not found in cache");
      return null;
    }

    const blob = await cachedResponse.blob();
    return blob;
  } catch (error) {
    console.error("Failed to get model from cache:", error);
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
