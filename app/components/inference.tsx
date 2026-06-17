'use client';

import { useState } from 'react';
import { FileTextIcon, SparkleIcon, CopySimpleIcon, CheckIcon } from '@phosphor-icons/react';

interface AnalysisViewProps {
  analysis: string;
  formattedText: string;
  onReset: () => void;
}

export default function AnalysisView({ analysis, formattedText, onReset }: AnalysisViewProps) {
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
      {/* Formatted Statement Card */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <SparkleIcon size={18} weight="fill" className="text-emerald-500" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-800">Formatted Statement</h3>
              <p className="text-xs text-gray-400">AI-generated structured view</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              {copied ? (
                <><CheckIcon size={14} weight="bold" className="text-emerald-500" />Copied</>
              ) : (
                <><CopySimpleIcon size={14} />Copy</>
              )}
            </button>
          </div>
        </div>
        <div className="px-6 py-5">
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-mono">
            {sections.length > 1 ? (
              sections.map((section, i) => {
                const isHeading = section.startsWith('##');
                if (isHeading) {
                  const [, heading, ...body] = section.split('\n');
                  return (
                    <div key={i} className="mb-4">
                      <h4 className="text-base font-semibold text-gray-800 mb-2">
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
          </div>
        </div>
      </div>

      {/* Raw Extracted Text (collapsible) */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <FileTextIcon size={18} weight="light" className="text-gray-500" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-medium text-gray-700">Raw Extracted Text</h3>
              <p className="text-xs text-gray-400">
                {showRaw ? 'Click to hide' : `${formattedText.length.toLocaleString()} characters`}
              </p>
            </div>
          </div>
          <span className={`text-gray-400 transition-transform ${showRaw ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
        {showRaw && (
          <div className="px-6 pb-5 border-t border-gray-100">
            <pre className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap font-mono mt-4 max-h-96 overflow-y-auto">
              {formattedText}
            </pre>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-3 pt-2">
        <button
          onClick={onReset}
          className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition-colors"
        >
          Process Another Document
        </button>
      </div>
    </div>
  );
}
