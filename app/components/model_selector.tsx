"use client";

import { useState, useMemo } from "react";
import { SUPPORTED_MODELS, ModelFamily } from "@/app/utils/models";
import { SparkleIcon, CaretDown, CaretUp, Cpu, ArrowLeftIcon } from "@phosphor-icons/react";

interface ModelSelectorProps {
  onSelect: (modelId: string) => void;
  onBack: () => void;
  selectedId?: string | null;
}

const familyLabels: Record<string, string> = {
  [ModelFamily.LLAMA]: "Llama",
  [ModelFamily.QWEN]: "Qwen",
  [ModelFamily.PHI]: "Phi",
  [ModelFamily.MISTRAL]: "Mistral",
  [ModelFamily.GEMMA]: "Gemma",
  [ModelFamily.SMOL_LM]: "SmolLM",
  [ModelFamily.DEEPSEEK]: "DeepSeek",
};

function getShortName(name: string): string {
  return name.replace(/-(Instruct|Chat)-?.*/, "").replace(/-MLC$/, "");
}

function getQuantLabel(name: string): string {
  const m = name.match(/-(q[0-9]f[0-9]+(?:_[0-9])?)-/);
  return m ? m[1] : "";
}

export default function ModelSelector({ onSelect, onBack, selectedId }: ModelSelectorProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const map = new Map<ModelFamily, typeof SUPPORTED_MODELS>();
    for (const m of SUPPORTED_MODELS) {
      const list = map.get(m.family) ?? [];
      list.push(m);
      map.set(m.family, list);
    }
    return Array.from(map.entries());
  }, []);

  const toggle = (fam: ModelFamily) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(fam)) next.delete(fam);
      else next.add(fam);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 mb-4 transition-colors"
        >
          <ArrowLeftIcon size={12} weight="bold" />
          Back
        </button>
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <SparkleIcon size={28} weight="light" className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1.5">Choose Your Model</h1>
          <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
            Select an AI model to process your documents. Models run entirely in your browser.
          </p>
        </div>

        <div className="space-y-3">
          {groups.map(([family, models]) => {
            const isOpen = expanded.has(family);
            return (
              <div key={family} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggle(family)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Cpu size={16} className="text-gray-500" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {familyLabels[family] ?? family}
                    </span>
                    <span className="text-xs text-gray-400">
                      {models.length} model{models.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  {isOpen ? (
                    <CaretUp size={14} className="text-gray-400" />
                  ) : (
                    <CaretDown size={14} className="text-gray-400" />
                  )}
                </button>
                {isOpen && (
                  <div className="border-t border-gray-100">
                    {models.map((model) => {
                      const isSelected = selectedId === model.name;
                      return (
                        <button
                          key={model.name}
                          onClick={() => onSelect(model.name)}
                          className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors ${
                            isSelected
                              ? "bg-emerald-50/50 border-l-2 border-emerald-600"
                              : "hover:bg-gray-50 border-l-2 border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                isSelected ? "border-emerald-600" : "border-gray-300"
                              }`}
                            >
                              {isSelected && (
                                <div className="w-2 h-2 rounded-full bg-emerald-600" />
                              )}
                            </div>
                            <span className="text-sm text-gray-700">{getShortName(model.name)}</span>
                            <span className="text-xs text-gray-400">{model.size ?? ""}</span>
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {getQuantLabel(model.name)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          Models are downloaded and cached locally. No data leaves your device.
        </p>
      </div>
    </div>
  );
}
