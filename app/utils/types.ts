export interface ModelType {
  name: string;
  url: string;
}

export type EngineType = "webllm" | "wllama";

export type AppPhase = "select" | "downloading" | "ready";
