'use client';

import { useState } from 'react';
import { FileTextIcon, SparkleIcon, CopySimpleIcon, CheckIcon } from '@phosphor-icons/react';

interface AnalysisViewProps {
  analysis: string;
  formattedText: string;
  onReset: () => void;
  isStreaming?: boolean;
}

export default function AnalysisView({ analysis, formattedText, onReset, isStreaming }: AnalysisViewProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(analysis);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const sections = analysis.split(/(?=## )/).filter(Boolean);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
              <SparkleIcon size={16} weight="light" className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">Formatted Statement</h3>
              <p className="text-xs text-gray-400">AI-generated structured view</p>
            </div>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            {copied ? (
              <><CheckIcon size={13} weight="bold" className="text-gray-700" />Copied</>
            ) : (
              <><CopySimpleIcon size={13} />Copy</>
            )}
          </button>
        </div>
        <div className="px-5 py-4">
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-mono">
            {sections.length > 0 ? (
              sections.map((section, i) => {
                const isHeading = section.startsWith('##');
                if (isHeading) {
                  const [, heading, ...body] = section.split('\n');
                  return (
                    <div key={i} className="mb-4">
                      <h4 className="text-base font-semibold text-gray-900 mb-1.5">
                        {heading.replace(/^##\s*/, '')}
                      </h4>
                      <p>{body.join('\n').trim()}</p>
                    </div>
                  );
                }
                return <p key={i} className="mb-3">{section.trim()}</p>;
              })
            ) : (
              <p>{analysis}</p>
            )}
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-emerald-500 animate-pulse ml-0.5" />
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <FileTextIcon size={16} weight="light" className="text-gray-500" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-medium text-gray-900">Raw Extracted Text</h3>
              <p className="text-xs text-gray-400">
                {showRaw ? 'Click to hide' : `${formattedText.length.toLocaleString()} characters`}
              </p>
            </div>
          </div>
          <span className={`text-gray-400 text-xs transition-transform ${showRaw ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
        {showRaw && (
          <div className="px-5 pb-4 border-t border-gray-100">
            <pre className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap font-mono mt-4 max-h-96 overflow-y-auto">
              {formattedText}
            </pre>
          </div>
        )}
      </div>

      <div className="flex justify-center pt-1">
        <button
          onClick={onReset}
          className="text-xs font-medium text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors"
        >
          Process Another Document
        </button>
      </div>
    </div>
  );
}
