"use client";

import { CreateMLCEngine } from "@mlc-ai/web-llm";
import type { MLCEngineInterface, ChatCompletionMessageParam } from "@mlc-ai/web-llm";

export interface InitProgress {
  text: string;
  progress: number;
}

export class WebLLMEngine {
  private engine: MLCEngineInterface | null = null;
  private _modelId = "";

  get modelId(): string {
    return this._modelId;
  }

  get isReady(): boolean {
    return this.engine !== null;
  }

  async initialize(
    modelId: string,
    onProgress?: (progress: InitProgress) => void,
  ): Promise<void> {
    this._modelId = modelId;
    this.engine = await CreateMLCEngine(modelId, {
      initProgressCallback: (report) => {
        onProgress?.({ text: report.text, progress: report.progress });
      },
    });
  }

  async chat(
    messages: ChatCompletionMessageParam[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
      signal?: AbortSignal;
    },
  ) {
    if (!this.engine) throw new Error("Engine not initialized");
    return await this.engine.chat.completions.create({
      messages,
      temperature: options?.temperature ?? 1.0,
      max_tokens: options?.maxTokens ?? 4096,
      top_p: options?.topP ?? 1.0,
      ...(options?.signal ? { abortSignal: options.signal } : {}),
    });
  }

  async streamChat(
    messages: ChatCompletionMessageParam[],
    onToken: (token: string) => void,
    options?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
      signal?: AbortSignal;
    },
  ): Promise<string> {
    if (!this.engine) throw new Error("Engine not initialized");
    const response = await this.engine.chat.completions.create({
      messages,
      temperature: options?.temperature ?? 1.0,
      max_tokens: options?.maxTokens ?? 4096,
      top_p: options?.topP ?? 1.0,
      stream: true,
      ...(options?.signal ? { abortSignal: options.signal } : {}),
    });
    let fullContent = "";
    for await (const chunk of response) {
      const token = chunk.choices?.[0]?.delta?.content || "";
      if (token) {
        fullContent += token;
        onToken(token);
      }
    }
    return fullContent;
  }

  reset(): void {
    this.engine = null;
    this._modelId = "";
  }
}
