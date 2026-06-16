'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useModelInference } from '@/app/hooks/useModelInference';
import { formatText } from '@/app/utils/text_formatting';
import UploadArea from './upload';
import AnalysisView from './inference';
import { ArrowArcLeftIcon, CheckCircleIcon, FileTextIcon, SparkleIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { MODELS } from '../utils/models';

type Phase = 'idle' | 'uploading' | 'extracting' | 'initializing' | 'analyzing' | 'complete' | 'error';

interface DocumentResult {
  rawText: string;
  formattedText: string;
  analysis: string;
}

export default function DocumentProcessor() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<DocumentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attemptedInit, setAttemptedInit] = useState(false);
  const analysisRef = useRef<HTMLDivElement>(null);

  const { isInitializing, isRunning, modelReady, error, initializeModel, runInference, resetModel } = useModelInference({
    autoInitialize: false,
    onError: (err) => console.error('Model error:', err),
  });

  const handleFileSelected = useCallback(async (file: File, password?: string) => {
    setPhase('uploading');
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

      setPhase('extracting');
      const data = await response.json();
      const rawText = data.text;
      const cleaned = formatText(rawText);

      setResult({ rawText, formattedText: cleaned, analysis: '' });
      setAttemptedInit(false);

      setPhase('initializing');

    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed');
      setPhase('error');
    }
  }, []);

  // React to model readiness and trigger analysis
  useEffect(() => {
    if (phase !== 'initializing' && phase !== 'analyzing') return;
    if (!result?.formattedText) return;

    const runAnalysis = async () => {
      try {
        if (!modelReady && !isInitializing && !attemptedInit) {
          setAttemptedInit(true);
          await initializeModel(MODELS.llama);
          // modelReady becomes true, effect re-runs
          return;
        }

        if (!modelReady || isInitializing) return;

        setPhase('analyzing');

        const prompt = `Format the following bank statement text into a clean, human-readable layout. Group transactions by date, maintain proper columns, and add a summary section at the end with totals for deposits, withdrawals, and the net balance change:\n\n${result.formattedText}`;

        const response = await runInference(prompt, {
          temperature: 0.7,
          maxTokens: 1024,
        });

        const analysis = response.choices?.[0]?.message?.content || response.message || '';

        setResult(prev => prev ? { ...prev, analysis } : null);
        setPhase('complete');

        setTimeout(() => {
          analysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);

      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Analysis failed');
        setPhase('error');
      }
    };

    runAnalysis();
  }, [phase, modelReady, isInitializing, result?.formattedText, initializeModel, runInference, attemptedInit]);

  const handleReset = useCallback(async () => {
    setPhase('idle');
    setResult(null);
    setErrorMessage(null);
    setAttemptedInit(false);
  }, []);

  const handleRetry = useCallback(async () => {
    if (result?.formattedText) {
      setPhase('initializing');
      setAttemptedInit(false);
      setErrorMessage(null);
    } else {
      setPhase('idle');
      setErrorMessage(null);
    }
  }, [result]);

  const handleNewDocument = useCallback(async () => {
    await resetModel();
    setPhase('idle');
    setResult(null);
    setErrorMessage(null);
    setAttemptedInit(false);
  }, [resetModel]);


  const renderProgress = () => {
    const steps = [
      { label: 'Uploading document', active: phase === 'uploading' || phase === 'extracting' || phase === 'initializing' || phase === 'analyzing', done: phase !== 'uploading' && phase !== 'idle' && phase !== 'error' },
      { label: 'Extracting text', active: phase === 'extracting' || phase === 'initializing' || phase === 'analyzing', done: phase === 'initializing' || phase === 'analyzing' || phase === 'complete' },
      { label: 'Loading model', active: phase === 'initializing' || phase === 'analyzing', done: phase === 'analyzing' || phase === 'complete' },
      { label: 'Analyzing document', active: phase === 'analyzing', done: phase === 'complete' },
    ];

    return (
      <div className="w-full max-w-lg mx-auto mb-8">
        <div className="flex flex-col gap-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${step.done ? 'bg-emerald-500' : step.active ? 'bg-blue-500' : 'bg-gray-200'
                }`}>
                {step.done ? (
                  <CheckCircleIcon size={14} weight="fill" className="text-white" />
                ) : step.active ? (
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                ) : (
                  <span className="w-2 h-2 bg-gray-400 rounded-full" />
                )}
              </div>
              <span className={`text-sm transition-colors ${step.done ? 'text-emerald-700' : step.active ? 'text-blue-700 font-medium' : 'text-gray-400'
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
    if (phase === 'idle') {
      return (
        <UploadArea onFileSelected={handleFileSelected} />
      );
    }

    if (phase === 'uploading' || phase === 'extracting' || phase === 'initializing' || phase === 'analyzing') {
      return (
        <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-sm flex flex-col items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
              <FileTextIcon size={28} weight="light" className="text-blue-500" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-medium text-gray-800 mb-1">
                {phase === 'uploading' && 'Uploading document...'}
                {phase === 'extracting' && 'Extracting text from document...'}
                {phase === 'initializing' && 'Loading AI model...'}
                {phase === 'analyzing' && 'Analyzing your document...'}
              </h2>
              <p className="text-sm text-gray-500">
                {phase === 'uploading' && 'Sending your file to the server'}
                {phase === 'extracting' && 'Parsing the document content'}
                {phase === 'initializing' && 'This may take a moment for the first run'}
                {phase === 'analyzing' && 'The AI is processing your statement'}
              </p>
            </div>
            {renderProgress()}
          </div>
        </div>
      );
    }

    if (phase === 'complete' && result) {
      return (
        <div className="min-h-screen bg-stone-100 p-6">
          <div className="max-w-3xl mx-auto" ref={analysisRef}>
            {/* Header */}
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <SparkleIcon size={22} weight="fill" className="text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-gray-800">Analysis Complete</h2>
                  <p className="text-xs text-gray-400">Your statement has been processed</p>
                </div>
              </div>
              <button
                onClick={handleNewDocument}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <ArrowArcLeftIcon size={16} weight="bold" />
                New Document
              </button>
            </div>

            {/* Analysis Result */}
            <AnalysisView
              analysis={result.analysis}
              formattedText={result.formattedText}
              onReset={handleNewDocument}
            />
          </div>
        </div>
      );
    }

    if (phase === 'error') {
      return (
        <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-sm flex flex-col items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
              <WarningCircleIcon size={28} weight="fill" className="text-red-400" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-medium text-gray-800 mb-1">Something went wrong</h2>
              <p className="text-sm text-gray-500">{errorMessage || 'An unexpected error occurred'}</p>
              {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRetry}
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gray-800 text-white hover:bg-gray-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={handleReset}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
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
