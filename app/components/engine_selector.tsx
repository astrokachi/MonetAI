"use client";

import { SparkleIcon, CloudIcon, CpuIcon } from "@phosphor-icons/react";
import type { AppMode } from "@/app/utils/types";

interface EngineSelectorProps {
  onSelect: (mode: AppMode) => void;
}

const localCaveats = [
  "4K context window. Large documents may be truncated",
  "Rule-based parser may affect accuracy on non-standard statements",
  "Fully offline. No data leaves your device",
];

const cloudCaveats = [
  "Document text is sent to the configured API endpoint",
  "Supports larger context windows and more accurate analysis",
];

export default function EngineSelector({ onSelect }: EngineSelectorProps) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <SparkleIcon
              size={28}
              weight="light"
              className="text-emerald-600"
            />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1.5">
            Choose Your Engine
          </h1>
          <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
            Select how you want to process your documents
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => onSelect("cloud")}
            className="w-full text-left bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <CloudIcon size={20} weight="light" className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-medium text-gray-900 mb-1">
                  Cloud AI
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-3">
                  Connect to a cloud-hosted AI model for more accurate analysis
                  with a larger context window.
                </p>
                <ul className="space-y-1">
                  {cloudCaveats.map((caveat, i) => (
                    <li
                      key={i}
                      className="text-xs text-blue-600 pl-3.5 relative"
                    >
                      <span className="absolute left-0 top-[0.35em] w-1.5 h-1.5 rounded-full bg-blue-400" />
                      {caveat}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelect("local")}
            className="w-full text-left bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <CpuIcon
                  size={20}
                  weight="light"
                  className="text-emerald-600"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-medium text-gray-900 mb-1">
                  Local Model
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-3">
                  Run a model directly in your browser. No data leaves your
                  device.
                </p>
                <ul className="space-y-1">
                  {localCaveats.map((caveat, i) => (
                    <li
                      key={i}
                      className="text-xs text-amber-600 pl-3.5 relative"
                    >
                      <span className="absolute left-0 top-[0.35em] w-1.5 h-1.5 rounded-full bg-amber-400" />
                      {caveat}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
