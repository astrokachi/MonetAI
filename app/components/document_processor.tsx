'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useModelInference } from '@/app/hooks/useModelInference';
import { formatText } from '@/app/utils/text_formatting';
import UploadArea from './upload';
import AnalysisView from './inference';
import { ArrowArcLeftIcon, CheckIcon, FileTextIcon, SparkleIcon } from '@phosphor-icons/react';
import { logModelError } from '@/app/utils/model_logging';

type LocalPhase = 'idle' | 'uploading' | 'extracting' | 'initializing' | 'analyzing' | 'complete' | 'error';

interface DocumentResult {
  rawText: string;
  formattedText: string;
  analysis: string;
}

const SYSTEM_PROMPT = `You are a precise document formatter. Your only task is to reorganize raw bank statement text into a clean table format. Rules:
- Return the COMPLETE output — never truncate, never skip any transaction
- Group all transactions in a single table sorted by date
- Each transaction is one row: Date | Type | Amount | Description | Balance
- Combine multi-line entries into single cells
- At the end, add a SUMMARY section with: total money in, total money out, opening balance, closing balance
- Remove page headers, footers, page numbers, and legal disclaimers
- Output plain text only — no markdown, no extra commentary`;

export default function DocumentProcessor() {
  const [localPhase, setLocalPhase] = useState<LocalPhase>('idle');
  const [result, setResult] = useState<DocumentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const analysisRef = useRef<HTMLDivElement>(null);

  const { phase: contextPhase, runInference, resetModel, abortInference } = useModelInference();

  const analyzingRef = useRef(false);

  const handleFileSelected = useCallback(async (file: File, password?: string) => {
    setLocalPhase('uploading');
    setErrorMessage(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const headers: Record<string, string> = {};
      if (password) headers['x-pdf-password'] = password;

      const response = await fetch('/api/upload', {
        method: 'POST', body: formData, headers,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to extract text');
      }

      setLocalPhase('extracting');
      const data = await response.json();
      const rawText = data.text;
      const cleaned = formatText(rawText);

      setResult({ rawText, formattedText: cleaned, analysis: '' });
      setLocalPhase('initializing');
    } catch (err) {
      logModelError(err, { phase: 'hook-error' });
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed');
      setLocalPhase('error');
    }
  }, []);

  useEffect(() => {
    if (localPhase !== 'initializing') return;
    if (!result?.formattedText) return;
    if (contextPhase !== 'ready') return;
    if (analyzingRef.current) return;

    const runAnalysis = async () => {
      analyzingRef.current = true;
      setLocalPhase('analyzing');

      const prompt = `Format the following bank statement text into a clean, human-readable layout. Group transactions by date, maintain proper columns, and add a summary section at the end with totals for deposits, withdrawals, and the net balance change:\n\n${result.formattedText}`;

      try {
        let fullAnalysis = '';
        await runInference(prompt, SYSTEM_PROMPT, {
          maxTokens: 8192,
          onToken: (token: string) => {
            fullAnalysis += token;
            setResult(prev => prev ? { ...prev, analysis: fullAnalysis } : null);
          },
        });

        setLocalPhase('complete');
        setTimeout(() => {
          analysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setLocalPhase('complete');
          return;
        }
        logModelError(err, {
          phase: 'inference-failed',
          promptLength: result?.formattedText?.length,
        });
        setErrorMessage(err instanceof Error ? err.message : 'Analysis failed');
        setLocalPhase('error');
      } finally {
        analyzingRef.current = false;
      }
    };

    runAnalysis();
  }, [localPhase, contextPhase, result?.formattedText, runInference]);

  const handleReset = useCallback(async () => {
    resetModel();
    setLocalPhase('idle');
    setResult(null);
    setErrorMessage(null);
  }, [resetModel]);

  const handleRetry = useCallback(async () => {
    if (result?.formattedText) {
      setLocalPhase('initializing');
      setErrorMessage(null);
    } else {
      setLocalPhase('idle');
      setErrorMessage(null);
    }
  }, [result]);

  const handleNewDocument = useCallback(async () => {
    resetModel();
    setLocalPhase('idle');
    setResult(null);
    setErrorMessage(null);
  }, [resetModel]);

  const renderProgress = () => {
    const steps = [
      { label: 'Uploading document', active: localPhase === 'uploading' || localPhase === 'extracting' || localPhase === 'initializing' || localPhase === 'analyzing', done: localPhase !== 'uploading' && localPhase !== 'idle' && localPhase !== 'error' },
      { label: 'Extracting text', active: localPhase === 'extracting' || localPhase === 'initializing' || localPhase === 'analyzing', done: localPhase === 'initializing' || localPhase === 'analyzing' || localPhase === 'complete' },
      {
        label: 'Analyzing document',
        active: localPhase === 'initializing' || localPhase === 'analyzing',
        done: localPhase === 'analyzing' || localPhase === 'complete',
      },
    ];

    return (
      <div className="w-full max-w-sm mx-auto mb-8">
        <div className="flex flex-col gap-2.5">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${step.done ? 'bg-emerald-500' : step.active ? 'bg-emerald-500' : 'bg-gray-200'
                }`}>
                {step.done ? (
                  <CheckIcon size={11} weight="bold" className="text-white" />
                ) : step.active ? (
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                ) : (
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                )}
              </div>
              <span className={`text-sm transition-colors ${step.done ? 'text-gray-700' : step.active ? 'text-gray-900 font-medium' : 'text-gray-400'
                }`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderState = () => {
    if (localPhase === 'idle') {
      return (
        <UploadArea onFileSelected={handleFileSelected} />
      );
    }

    if (localPhase === 'uploading' || localPhase === 'extracting' || localPhase === 'initializing') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-sm border border-gray-200 flex flex-col items-center gap-5">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
              <FileTextIcon size={24} weight="light" className="text-emerald-600" />
            </div>
            <div className="text-center">
              <h2 className="text-base font-medium text-gray-900 mb-0.5">
                {localPhase === 'uploading' && 'Uploading document...'}
                {localPhase === 'extracting' && 'Extracting text from document...'}
                {localPhase === 'initializing' && 'Preparing to analyze...'}
              </h2>
              <p className="text-xs text-gray-500">
                {localPhase === 'uploading' && 'Sending your file to the server'}
                {localPhase === 'extracting' && 'Parsing the document content'}
                {localPhase === 'initializing' && 'Starting analysis...'}
              </p>
            </div>
            {renderProgress()}
          </div>
        </div>
      );
    }

    if (localPhase === 'analyzing' && result) {
      return (
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-3xl mx-auto" ref={analysisRef}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center">
                  <SparkleIcon size={18} weight="light" className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-gray-900">Analyzing</h2>
                  <p className="text-xs text-gray-400">Streaming results as they&rsquo;re generated</p>
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
              formattedText={result.formattedText}
              onReset={handleNewDocument}
              isStreaming
            />
          </div>
        </div>
      );
    }

    if (localPhase === 'complete' && result) {
      return (
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-3xl mx-auto" ref={analysisRef}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center">
                  <SparkleIcon size={18} weight="light" className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-gray-900">Analysis Complete</h2>
                  <p className="text-xs text-gray-400">Your statement has been processed</p>
                </div>
              </div>
              <button
                onClick={handleNewDocument}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                <ArrowArcLeftIcon size={14} weight="bold" />
                New Document
              </button>
            </div>

            <AnalysisView
              analysis={result.analysis}
              formattedText={result.formattedText}
              onReset={handleNewDocument}
            />
          </div>
        </div>
      );
    }

    if (localPhase === 'error') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-sm border border-gray-200 flex flex-col items-center gap-5">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
              <FileTextIcon size={24} weight="light" className="text-rose-500" />
            </div>
            <div className="text-center">
              <h2 className="text-base font-medium text-gray-900 mb-0.5">Something went wrong</h2>
              <p className="text-xs text-gray-500">{errorMessage || 'An unexpected error occurred'}</p>
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
