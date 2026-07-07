"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useModelInference } from "@/app/hooks/useModelInference";
import { formatText } from "@/app/utils/text_formatting";
import UploadArea from "./upload";
import AnalysisView from "./inference";
import {
  ArrowLeftIcon,
  CheckIcon,
  FileTextIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import { logModelError } from "@/app/utils/model_logging";

type LocalPhase =
  | "idle"
  | "uploading"
  | "extracting"
  | "initializing"
  | "analyzing"
  | "complete"
  | "error";

interface DocumentResult {
  rawText: string;
  formattedText: string;
  compactData: string;
  analysis: string;
}

const LOCAL_SYSTEM_PROMPT = `You are a financial analyst. Given a bank statement summary with structured transaction data, identify spending patterns, unusual activity, and give 2-3 practical financial recommendations. Be concise.`;

export default function DocumentProcessor() {
  const [localPhase, setLocalPhase] = useState<LocalPhase>("idle");
  const [result, setResult] = useState<DocumentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const analysisRef = useRef<HTMLDivElement>(null);

  const {
    phase: contextPhase,
    runInference,
    resetModel,
    abortInference,
    mode,
    setMode,
    runCloudAnalysis,
  } = useModelInference();

  const analyzingRef = useRef(false);

  const handleCloudAnalysis = useCallback(
    async (text: string) => {
      setLocalPhase("analyzing");
      analyzingRef.current = true;

      try {
        let fullAnalysis = "";
        await runCloudAnalysis(text, (token: string) => {
          fullAnalysis += token;
          setResult((prev) =>
            prev ? { ...prev, analysis: fullAnalysis } : null,
          );
        });

        setLocalPhase("complete");
        setTimeout(() => {
          analysisRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 100);
      } catch (err) {
        logModelError(err, { phase: "cloud-analysis-failed" });
        setErrorMessage(
          err instanceof Error ? err.message : "Cloud analysis failed",
        );
        setLocalPhase("error");
      } finally {
        analyzingRef.current = false;
      }
    },
    [runCloudAnalysis],
  );

  const handleFileSelected = useCallback(
    async (file: File, password?: string) => {
      setLocalPhase("uploading");
      setErrorMessage(null);
      setResult(null);

      try {
        const formData = new FormData();
        formData.append("file", file);
        const headers: Record<string, string> = {};
        if (password) headers["x-pdf-password"] = password;

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
          headers,
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Failed to extract text");
        }

        setLocalPhase("extracting");
        const data = await response.json();
        const rawText = data.text;
        const cleaned = formatText(rawText);

        setResult({
          rawText,
          formattedText: cleaned,
          compactData: cleaned,
          analysis: "",
        });

        if (mode === "cloud") {
          await handleCloudAnalysis(cleaned);
        } else {
          setLocalPhase("initializing");
        }
      } catch (err) {
        logModelError(err, { phase: "hook-error" });
        setErrorMessage(err instanceof Error ? err.message : "Upload failed");
        setLocalPhase("error");
      }
    },
    [mode, handleCloudAnalysis],
  );

  useEffect(() => {
    if (mode !== "local") return;
    if (localPhase !== "initializing") return;
    if (!result?.compactData) return;
    if (contextPhase !== "ready") return;
    if (analyzingRef.current) return;

    const runAnalysis = async () => {
      analyzingRef.current = true;
      setLocalPhase("analyzing");

      const prompt = `Analyze this statement:\n\n${result.compactData}`;

      try {
        let fullAnalysis = "";
        await runInference(prompt, LOCAL_SYSTEM_PROMPT, {
          maxTokens: 2048,
          onToken: (token: string) => {
            fullAnalysis += token;
            setResult((prev) =>
              prev ? { ...prev, analysis: fullAnalysis } : null,
            );
          },
        });

        setLocalPhase("complete");
        setTimeout(() => {
          analysisRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 100);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setLocalPhase("complete");
          return;
        }
        logModelError(err, {
          phase: "inference-failed",
          promptLength: result?.compactData?.length,
        });
        setErrorMessage(err instanceof Error ? err.message : "Analysis failed");
        setLocalPhase("error");
      } finally {
        analyzingRef.current = false;
      }
    };

    runAnalysis();
  }, [localPhase, contextPhase, result?.compactData, runInference, mode]);

  const handleReset = useCallback(async () => {
    resetModel();
    setLocalPhase("idle");
    setResult(null);
    setErrorMessage(null);
  }, [resetModel]);

  const handleRetry = useCallback(async () => {
    if (result?.formattedText) {
      if (mode === "cloud") {
        await handleCloudAnalysis(result.formattedText);
      } else {
        setLocalPhase("initializing");
      }
      setErrorMessage(null);
    } else {
      setLocalPhase("idle");
      setErrorMessage(null);
    }
  }, [result, mode, handleCloudAnalysis]);

  const renderProgress = () => {
    const steps = [
      {
        label: "Uploading document",
        active:
          localPhase === "uploading" ||
          localPhase === "extracting" ||
          localPhase === "initializing" ||
          localPhase === "analyzing",
        done:
          localPhase !== "uploading" &&
          localPhase !== "idle" &&
          localPhase !== "error",
      },
      {
        label: "Extracting text",
        active:
          localPhase === "extracting" ||
          localPhase === "initializing" ||
          localPhase === "analyzing",
        done:
          localPhase === "initializing" ||
          localPhase === "analyzing" ||
          localPhase === "complete",
      },
      {
        label: "Analyzing document",
        active: localPhase === "initializing" || localPhase === "analyzing",
        done: localPhase === "analyzing" || localPhase === "complete",
      },
    ];

    return (
      <div className="w-full max-w-sm mx-auto mb-8">
        <div className="flex flex-col gap-2.5">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  step.done
                    ? "bg-emerald-500"
                    : step.active
                      ? "bg-emerald-500"
                      : "bg-gray-200"
                }`}
              >
                {step.done ? (
                  <CheckIcon size={11} weight="bold" className="text-white" />
                ) : step.active ? (
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                ) : (
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                )}
              </div>
              <span
                className={`text-sm transition-colors ${
                  step.done
                    ? "text-gray-700"
                    : step.active
                      ? "text-gray-900 font-medium"
                      : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderState = () => {
    if (localPhase === "idle") {
      return (
        <UploadArea onFileSelected={handleFileSelected} onBack={() => setMode(null)} />
      );
    }

    if (
      localPhase === "uploading" ||
      localPhase === "extracting" ||
      localPhase === "initializing"
    ) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-sm border border-gray-200 flex flex-col items-center gap-5">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
              <FileTextIcon
                size={24}
                weight="light"
                className="text-emerald-600"
              />
            </div>
            <div className="text-center">
              <h2 className="text-base font-medium text-gray-900 mb-0.5">
                {localPhase === "uploading" && "Uploading document..."}
                {localPhase === "extracting" &&
                  "Extracting text from document..."}
                {localPhase === "initializing" && "Preparing to analyze..."}
              </h2>
              <p className="text-xs text-gray-500">
                {localPhase === "uploading" &&
                  "Sending your file to the server"}
                {localPhase === "extracting" && "Parsing the document content"}
                {localPhase === "initializing" && "Starting analysis..."}
              </p>
            </div>
            {renderProgress()}
          </div>
        </div>
      );
    }

    if (localPhase === "analyzing" && result) {
      return (
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-3xl mx-auto" ref={analysisRef}>
            <div className="mb-3">
              <button
                onClick={() => setMode(null)}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeftIcon size={12} weight="bold" />
                Back
              </button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center">
                  <SparkleIcon
                    size={18}
                    weight="light"
                    className="text-emerald-600"
                  />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-gray-900">
                    Analyzing
                  </h2>
                  <p className="text-xs text-gray-400">
                    Streaming results as they&rsquo;re generated
                  </p>
                </div>
              </div>
              <button
                onClick={abortInference}
                className="text-xs font-medium text-gray-400 bg-gray-100 hover:bg-gray-200 hover:text-gray-600 px-3 py-1.5 rounded-lg transition-colors"
              >
                Stop
              </button>
            </div>

            <AnalysisView
              analysis={result.analysis}
              compactData={result.compactData}
              onReset={handleReset}
              isStreaming
            />
          </div>
        </div>
      );
    }

    if (localPhase === "complete" && result) {
      return (
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-3xl mx-auto" ref={analysisRef}>
            <div className="mb-3">
              <button
                onClick={() => setMode(null)}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeftIcon size={12} weight="bold" />
                Back
              </button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center">
                  <SparkleIcon
                    size={18}
                    weight="light"
                    className="text-emerald-600"
                  />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-gray-900">
                    Analysis Complete
                  </h2>
                  <p className="text-xs text-gray-400">
                    Your statement has been processed
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                <ArrowLeftIcon size={14} weight="bold" />
                New Document
              </button>
            </div>

            <AnalysisView
              analysis={result.analysis}
              compactData={result.compactData}
              onReset={handleReset}
            />
          </div>
        </div>
      );
    }

    if (localPhase === "error") {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-sm border border-gray-200 flex flex-col items-center gap-5">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
              <FileTextIcon
                size={24}
                weight="light"
                className="text-rose-500"
              />
            </div>
            <div className="text-center">
              <h2 className="text-base font-medium text-gray-900 mb-0.5">
                Something went wrong
              </h2>
              <p className="text-xs text-gray-500">
                {errorMessage || "An unexpected error occurred"}
              </p>
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={handleRetry}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return renderState();
}
