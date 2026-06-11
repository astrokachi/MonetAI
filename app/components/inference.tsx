'use client';

import { useState } from 'react';
import { useModelInference } from '@/app/hooks/useModelInference';
import { SparkleIcon } from '@phosphor-icons/react';

interface InferenceComponentProps {
  extractedText: string;
}

export default function InferenceComponent({ extractedText }: InferenceComponentProps) {
  const [prompt, setPrompt] = useState('');
  const [inference, setInference] = useState<string | null>(null);
  const { isInitializing, isRunning, modelReady, error, runInference } = useModelInference({
    autoInitialize: false,
    onError: (err) => console.error('Model error:', err),
  });

  const handleInference = async () => {
    if (!prompt.trim() || !modelReady) return;

    try {
      // Combine extracted text context with user prompt
      const fullPrompt = `Document content:\n\n${extractedText}\n\nQuestion: ${prompt}`;

      const response = await runInference(fullPrompt, {
        temperature: 0.7,
        maxTokens: 512,
      });

      // Extract the message content from response
      const responseText = response.choices?.[0]?.message?.content || response.message || '';
      setInference(responseText);
      setPrompt('');
    } catch (err) {
      console.error('Inference error:', err);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Model Status */}
      <div className={`rounded-lg border px-4 py-3 text-xs ${error
          ? 'bg-red-50 border-red-200'
          : modelReady
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-blue-50 border-blue-200'
        }`}>
        <p className={`font-medium ${error
            ? 'text-red-700'
            : modelReady
              ? 'text-emerald-700'
              : 'text-blue-700'
          }`}>
          {error ? `Error: ${error}` : isInitializing ? 'Initializing model...' : modelReady ? 'Model Ready' : 'Loading...'}
        </p>
      </div>

      {/* Inference Input */}
      {modelReady && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask a question about the document..."
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-gray-400 resize-none"
              rows={3}
              disabled={isRunning}
            />
          </div>

          <button
            onClick={handleInference}
            disabled={!prompt.trim() || isRunning}
            className={`
              flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${!prompt.trim() || isRunning
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700'
              }
            `}
          >
            {isRunning ? (
              <>
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                Processing...
              </>
            ) : (
              <>
                <SparkleIcon size={16} weight="fill" />
                Analyze
              </>
            )}
          </button>
        </div>
      )}

      {/* Inference Result */}
      {inference && (
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
          <h3 className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wider">Response</h3>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {inference}
          </p>
        </div>
      )}
    </div>
  );
}
