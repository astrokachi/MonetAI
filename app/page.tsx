"use client";

import { useContext } from "react";
import ModelSelector from "./components/model_selector";
import DocumentProcessor from "./components/document_processor";
import EngineSelector from "./components/engine_selector";
import { ModelContext } from "./context/model_context";
import { SparkleIcon } from "@phosphor-icons/react";

export default function Home() {
  const {
    phase,
    modelId,
    initProgress,
    error,
    selectModel,
    abortDownload,
    mode,
    setMode,
  } = useContext(ModelContext)!;

  if (mode === null) {
    return <EngineSelector onSelect={setMode} />;
  }

  if (mode === "local" && phase === "select") {
    return <ModelSelector onSelect={selectModel} onBack={() => setMode(null)} />;
  }

  if (mode === "local" && phase === "downloading") {
    const progressPct = Math.round((initProgress?.progress ?? 0) * 100);
    const isCached =
      initProgress?.text?.toLowerCase().includes("cache") ?? false;

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
              <SparkleIcon
                size={28}
                weight="light"
                className="text-emerald-600"
              />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">
              {isCached ? "Loading Model" : "Downloading Model"}
            </h1>
            <p className="text-sm text-gray-500 truncate max-w-xs mx-auto">
              {modelId}
            </p>
          </div>

          {error ? (
            <div className="bg-rose-50 rounded-xl p-5 text-center">
              <p className="text-rose-700 font-medium text-sm mb-1">
                Download Failed
              </p>
              <p className="text-xs text-rose-500">{error}</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="mb-5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Progress
                  </span>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">
                    {progressPct}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              <p className="text-xs text-gray-400 text-center leading-relaxed">
                {initProgress?.text ?? "Initializing..."}
              </p>

              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-center gap-2 text-gray-400">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs">
                  {isCached ? "Loading into memory..." : "Downloading..."}
                </span>
              </div>
            </div>
          )}

          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              onClick={() => setMode(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-700 transition-colors"
            >
              Back
            </button>
            <button
              onClick={abortDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 bg-white border border-gray-200 hover:bg-rose-50 hover:text-rose-700 transition-colors"
            >
              Cancel
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-5">
            Your AI model is being securely downloaded and cached locally in
            your browser.
          </p>
        </div>
      </div>
    );
  }

  return <DocumentProcessor />;
}
