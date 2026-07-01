"use client";

import { useContext } from "react";
import { ModelContext, ModelContextType } from "@/app/context/model_context";

export function useModelInference(): ModelContextType {
  const context = useContext(ModelContext);

  if (!context) {
    throw new Error("useModelInference must be used within ModelProvider");
  }

  return context;
}
