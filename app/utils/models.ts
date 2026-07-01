import { prebuiltAppConfig } from "@mlc-ai/web-llm";

export enum ModelFamily {
  LLAMA = "llama",
  PHI = "phi",
  MISTRAL = "mistral",
  GEMMA = "gemma",
  QWEN = "qwen",
  SMOL_LM = "smollm",
  DEEPSEEK = "deepseek",
}

export interface ModelRecord {
  name: string;
  display_name: string;
  provider?: string;
  size?: string;
  quantization?: string;
  family: ModelFamily;
  recommended_config?: {
    temperature?: number;
    top_p?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
  };
}

export function getSize(model_id: string): string | undefined {
  const sizeRegex = /-(\d+(\.\d+)?[BM])-?/;
  const match = model_id.match(sizeRegex);
  if (match) return match[1];
  return undefined;
}

export function getQuantization(model_id: string): string | undefined {
  const quantizationRegex = /-(q[0-9]f[0-9]+(?:_[0-9])?)-/;
  const match = model_id.match(quantizationRegex);
  if (match) return match[1];
  return undefined;
}

const qwen3_common_configs = {
  display_name: "Qwen",
  provider: "Alibaba",
  family: ModelFamily.QWEN,
  recommended_config: {
    temperature: 0.7,
    top_p: 0.8,
    presence_penalty: 0,
    frequency_penalty: 0,
  },
};

const MODEL_BASES: ModelRecord[] = [
  // Llama 3.2
  { name: "Llama-3.2-1B-Instruct-q4f32_1-MLC", display_name: "Llama", provider: "Meta", family: ModelFamily.LLAMA, recommended_config: { temperature: 0.6, top_p: 0.9, presence_penalty: 0, frequency_penalty: 0 } },
  { name: "Llama-3.2-1B-Instruct-q4f16_1-MLC", display_name: "Llama", provider: "Meta", family: ModelFamily.LLAMA, recommended_config: { temperature: 0.6, top_p: 0.9, presence_penalty: 0, frequency_penalty: 0 } },
  { name: "Llama-3.2-3B-Instruct-q4f32_1-MLC", display_name: "Llama", provider: "Meta", family: ModelFamily.LLAMA, recommended_config: { temperature: 0.6, top_p: 0.9, presence_penalty: 0, frequency_penalty: 0 } },
  { name: "Llama-3.2-3B-Instruct-q4f16_1-MLC", display_name: "Llama", provider: "Meta", family: ModelFamily.LLAMA, recommended_config: { temperature: 0.6, top_p: 0.9, presence_penalty: 0, frequency_penalty: 0 } },
  // Llama 3.1 8B
  { name: "Llama-3.1-8B-Instruct-q4f32_1-MLC", display_name: "Llama", provider: "Meta", family: ModelFamily.LLAMA, recommended_config: { temperature: 0.6, top_p: 0.9, presence_penalty: 0, frequency_penalty: 0 } },
  { name: "Llama-3.1-8B-Instruct-q4f16_1-MLC", display_name: "Llama", provider: "Meta", family: ModelFamily.LLAMA, recommended_config: { temperature: 0.6, top_p: 0.9, presence_penalty: 0, frequency_penalty: 0 } },
  // Qwen2.5
  { name: "Qwen2.5-0.5B-Instruct-q4f32_1-MLC", display_name: "Qwen", provider: "Alibaba", family: ModelFamily.QWEN, recommended_config: { temperature: 0.7, top_p: 0.8, presence_penalty: 0, frequency_penalty: 0 } },
  { name: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", display_name: "Qwen", provider: "Alibaba", family: ModelFamily.QWEN, recommended_config: { temperature: 0.7, top_p: 0.8, presence_penalty: 0, frequency_penalty: 0 } },
  { name: "Qwen2.5-1.5B-Instruct-q4f32_1-MLC", display_name: "Qwen", provider: "Alibaba", family: ModelFamily.QWEN, recommended_config: { temperature: 0.7, top_p: 0.8, presence_penalty: 0, frequency_penalty: 0 } },
  { name: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", display_name: "Qwen", provider: "Alibaba", family: ModelFamily.QWEN, recommended_config: { temperature: 0.7, top_p: 0.8, presence_penalty: 0, frequency_penalty: 0 } },
  { name: "Qwen2.5-3B-Instruct-q4f32_1-MLC", display_name: "Qwen", provider: "Alibaba", family: ModelFamily.QWEN, recommended_config: { temperature: 0.7, top_p: 0.8, presence_penalty: 0, frequency_penalty: 0 } },
  { name: "Qwen2.5-3B-Instruct-q4f16_1-MLC", display_name: "Qwen", provider: "Alibaba", family: ModelFamily.QWEN, recommended_config: { temperature: 0.7, top_p: 0.8, presence_penalty: 0, frequency_penalty: 0 } },
  { name: "Qwen2.5-7B-Instruct-q4f32_1-MLC", display_name: "Qwen", provider: "Alibaba", family: ModelFamily.QWEN, recommended_config: { temperature: 0.7, top_p: 0.8, presence_penalty: 0, frequency_penalty: 0 } },
  { name: "Qwen2.5-7B-Instruct-q4f16_1-MLC", display_name: "Qwen", provider: "Alibaba", family: ModelFamily.QWEN, recommended_config: { temperature: 0.7, top_p: 0.8, presence_penalty: 0, frequency_penalty: 0 } },
  // Qwen3
  { name: "Qwen3-0.6B-q4f32_1-MLC", ...qwen3_common_configs },
  { name: "Qwen3-0.6B-q4f16_1-MLC", ...qwen3_common_configs },
  { name: "Qwen3-1.7B-q4f32_1-MLC", ...qwen3_common_configs },
  { name: "Qwen3-1.7B-q4f16_1-MLC", ...qwen3_common_configs },
  { name: "Qwen3-4B-q4f32_1-MLC", ...qwen3_common_configs },
  { name: "Qwen3-4B-q4f16_1-MLC", ...qwen3_common_configs },
  { name: "Qwen3-8B-q4f32_1-MLC", ...qwen3_common_configs },
  { name: "Qwen3-8B-q4f16_1-MLC", ...qwen3_common_configs },
  // TinyLlama
  { name: "TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC", display_name: "TinyLlama", provider: "Zhang Peiyuan", family: ModelFamily.LLAMA, recommended_config: { temperature: 1.0, top_p: 1.0, presence_penalty: 0, frequency_penalty: 0 } },
  { name: "TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC", display_name: "TinyLlama", provider: "Zhang Peiyuan", family: ModelFamily.LLAMA, recommended_config: { temperature: 1.0, top_p: 1.0, presence_penalty: 0, frequency_penalty: 0 } },
  // SmolLM2
  { name: "SmolLM2-1.7B-Instruct-q4f32_1-MLC", display_name: "SmolLM", provider: "HuggingFaceTB", family: ModelFamily.SMOL_LM, recommended_config: { temperature: 1.0, top_p: 1.0, presence_penalty: 0, frequency_penalty: 0 } },
  { name: "SmolLM2-1.7B-Instruct-q4f16_1-MLC", display_name: "SmolLM", provider: "HuggingFaceTB", family: ModelFamily.SMOL_LM, recommended_config: { temperature: 1.0, top_p: 1.0, presence_penalty: 0, frequency_penalty: 0 } },
  { name: "SmolLM2-360M-Instruct-q4f32_1-MLC", display_name: "SmolLM", provider: "HuggingFaceTB", family: ModelFamily.SMOL_LM, recommended_config: { temperature: 1.0, top_p: 1.0, presence_penalty: 0, frequency_penalty: 0 } },
  { name: "SmolLM2-360M-Instruct-q4f16_1-MLC", display_name: "SmolLM", provider: "HuggingFaceTB", family: ModelFamily.SMOL_LM, recommended_config: { temperature: 1.0, top_p: 1.0, presence_penalty: 0, frequency_penalty: 0 } },
  { name: "SmolLM2-135M-Instruct-q0f32-MLC", display_name: "SmolLM", provider: "HuggingFaceTB", family: ModelFamily.SMOL_LM, recommended_config: { temperature: 1.0, top_p: 1.0, presence_penalty: 0, frequency_penalty: 0 } },
  // Phi-3.5
  { name: "Phi-3.5-mini-instruct-q4f32_1-MLC", display_name: "Phi", provider: "Microsoft", family: ModelFamily.PHI, recommended_config: { temperature: 1.0, top_p: 1.0, presence_penalty: 0, frequency_penalty: 0 } },
  { name: "Phi-3.5-mini-instruct-q4f16_1-MLC", display_name: "Phi", provider: "Microsoft", family: ModelFamily.PHI, recommended_config: { temperature: 1.0, top_p: 1.0, presence_penalty: 0, frequency_penalty: 0 } },
  // DeepSeek
  { name: "DeepSeek-R1-Distill-Qwen-7B-q4f32_1-MLC", display_name: "DeepSeek", provider: "DeepSeek", family: ModelFamily.DEEPSEEK, recommended_config: { temperature: 1.0, top_p: 1.0, presence_penalty: 0, frequency_penalty: 0 } },
  { name: "DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC", display_name: "DeepSeek", provider: "DeepSeek", family: ModelFamily.DEEPSEEK, recommended_config: { temperature: 1.0, top_p: 1.0, presence_penalty: 0, frequency_penalty: 0 } },
  { name: "DeepSeek-R1-Distill-Llama-8B-q4f32_1-MLC", display_name: "DeepSeek", provider: "DeepSeek", family: ModelFamily.DEEPSEEK, recommended_config: { temperature: 1.0, top_p: 1.0, presence_penalty: 0, frequency_penalty: 0 } },
  { name: "DeepSeek-R1-Distill-Llama-8B-q4f16_1-MLC", display_name: "DeepSeek", provider: "DeepSeek", family: ModelFamily.DEEPSEEK, recommended_config: { temperature: 1.0, top_p: 1.0, presence_penalty: 0, frequency_penalty: 0 } },
  // Hermes
  { name: "Hermes-3-Llama-3.2-3B-q4f32_1-MLC", display_name: "Hermes", provider: "NousResearch", family: ModelFamily.LLAMA, recommended_config: { temperature: 0.6, top_p: 0.9, presence_penalty: 0, frequency_penalty: 0 } },
  { name: "Hermes-3-Llama-3.2-3B-q4f16_1-MLC", display_name: "Hermes", provider: "NousResearch", family: ModelFamily.LLAMA, recommended_config: { temperature: 0.6, top_p: 0.9, presence_penalty: 0, frequency_penalty: 0 } },
  { name: "Hermes-3-Llama-3.1-8B-q4f32_1-MLC", display_name: "Hermes", provider: "NousResearch", family: ModelFamily.LLAMA, recommended_config: { temperature: 0.6, top_p: 0.9, presence_penalty: 0, frequency_penalty: 0 } },
  { name: "Hermes-3-Llama-3.1-8B-q4f16_1-MLC", display_name: "Hermes", provider: "NousResearch", family: ModelFamily.LLAMA, recommended_config: { temperature: 0.6, top_p: 0.9, presence_penalty: 0, frequency_penalty: 0 } },
  // Gemma 2
  { name: "gemma-2-2b-it-q4f32_1-MLC", display_name: "Gemma", provider: "Google", family: ModelFamily.GEMMA, recommended_config: { temperature: 0.7, top_p: 0.95, presence_penalty: 0, frequency_penalty: 1 } },
  { name: "gemma-2-2b-it-q4f16_1-MLC", display_name: "Gemma", provider: "Google", family: ModelFamily.GEMMA, recommended_config: { temperature: 0.7, top_p: 0.95, presence_penalty: 0, frequency_penalty: 1 } },
  { name: "gemma-2-9b-it-q4f32_1-MLC", display_name: "Gemma", provider: "Google", family: ModelFamily.GEMMA, recommended_config: { temperature: 0.7, top_p: 0.95, presence_penalty: 0, frequency_penalty: 1 } },
  { name: "gemma-2-9b-it-q4f16_1-MLC", display_name: "Gemma", provider: "Google", family: ModelFamily.GEMMA, recommended_config: { temperature: 0.7, top_p: 0.95, presence_penalty: 0, frequency_penalty: 1 } },
  // Mistral
  { name: "Mistral-7B-Instruct-v0.3-q4f32_1-MLC", display_name: "Mistral", provider: "Mistral AI", family: ModelFamily.MISTRAL, recommended_config: { temperature: 1.0, top_p: 1.0, presence_penalty: 0, frequency_penalty: 0 } },
  { name: "Mistral-7B-Instruct-v0.3-q4f16_1-MLC", display_name: "Mistral", provider: "Mistral AI", family: ModelFamily.MISTRAL, recommended_config: { temperature: 1.0, top_p: 1.0, presence_penalty: 0, frequency_penalty: 0 } },
  // phi-2
  { name: "phi-2-q4f32_1-MLC", display_name: "Phi", provider: "Microsoft", family: ModelFamily.PHI, recommended_config: { temperature: 0.7, top_p: 0.95, presence_penalty: 0, frequency_penalty: 0 } },
  // phi-1.5
  { name: "phi-1_5-q4f32_1-MLC", display_name: "Phi", provider: "Microsoft", family: ModelFamily.PHI, recommended_config: { temperature: 0.7, top_p: 0.95, presence_penalty: 0, frequency_penalty: 0 } },
];

export const SUPPORTED_MODELS: ModelRecord[] = MODEL_BASES.filter(
  (model) => {
    const available = prebuiltAppConfig.model_list
      .map((m) => m.model_id)
      .includes(model.name);
    if (!available) {
      console.warn(`Model ${model.name} not supported by current WebLLM version.`);
    }
    return available;
  },
).map((model) => ({
  ...model,
  size: getSize(model.name),
  quantization: getQuantization(model.name),
}));

export const DEFAULT_MODEL_ID = SUPPORTED_MODELS[0]?.name ?? "";

export function getModelConfig(modelId: string) {
  return SUPPORTED_MODELS.find((m) => m.name === modelId)?.recommended_config;
}

export const ENGINE_TYPE = "webllm" as const;
