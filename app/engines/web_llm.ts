"use client";

import { CreateWebWorkerMLCEngine } from "@mlc-ai/web-llm";
import type {
  MLCEngineInterface,
  ChatCompletionMessageParam,
} from "@mlc-ai/web-llm";

export interface InitProgress {
  text: string;
  progress: number;
}

export class WebLLMEngine {
  private engine: MLCEngineInterface | null = null;
  private _modelId = "";
  private initializing = false;
  private busy = false;

  get modelId(): string {
    return this._modelId;
  }

  get isReady(): boolean {
    return this.engine !== null;
  }

  get isBusy(): boolean {
    return this.busy;
  }

  async initialize(
    modelId: string,
    onProgress?: (progress: InitProgress) => void,
  ): Promise<void> {
    if (this.initializing) return;
    if (this.engine) return;
    this.initializing = true;
    this._modelId = modelId;
    try {
      this.engine = await CreateWebWorkerMLCEngine(
        new Worker(new URL("./worker.ts", import.meta.url), {
          type: "module",
        }),
        modelId,
        {
          initProgressCallback: (report) => {
            onProgress?.({ text: report.text, progress: report.progress });
          },
        },
      );
    } finally {
      this.initializing = false;
    }
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
    if (this.busy) throw new Error("Generation already in progress");
    this.busy = true;
    try {
      return await this.engine.chat.completions.create({
        messages,
        temperature: options?.temperature ?? 1.0,
        max_tokens: options?.maxTokens ?? 4096,
        top_p: options?.topP ?? 1.0,
        ...(options?.signal ? { abortSignal: options.signal } : {}),
      });
    } finally {
      this.busy = false;
    }
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
    if (this.busy) throw new Error("Generation already in progress");
    this.busy = true;
    try {
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
    } finally {
      this.busy = false;
    }
  }

  reset(): void {
    this.engine = null;
    this._modelId = "";
    this.initializing = false;
    this.busy = false;
  }
}
