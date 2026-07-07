'use client';

import { useState, useMemo } from 'react';
import { FileTextIcon, SparkleIcon, CopySimpleIcon, CheckIcon } from '@phosphor-icons/react';

interface AnalysisViewProps {
  analysis: string;
  compactData: string;
  onReset: () => void;
  isStreaming?: boolean;
}

function inlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let last = 0;
  const re = /\*\*(.+?)\*\*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<strong key={parts.length}>{m[1]}</strong>);
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : [text];
}

function renderBody(text: string) {
  const clean = text.replace(/^#+$/gm, '').trim();
  if (!clean) return null;

  const lines = clean.split('\n');
  type BlockType = 'p' | 'ul' | 'ol';
  const blocks: { type: BlockType; items: string[] }[] = [];
  let curType: BlockType | null = null;
  let curItems: string[] = [];

  const flush = () => {
    if (curType && curItems.length) {
      blocks.push({ type: curType, items: curItems });
      curItems = [];
      curType = null;
    }
  };

  for (const line of lines) {
    const t = line.trim();
    if (!t) { flush(); continue; }
    const ul = t.match(/^[-*]\s+(.+)/);
    const ol = t.match(/^\d+\.\s+(.+)/);
    if (ul) {
      if (curType !== 'ul') { flush(); curType = 'ul'; }
      curItems.push(ul[1]);
    } else if (ol) {
      if (curType !== 'ol') { flush(); curType = 'ol'; }
      curItems.push(ol[1]);
    } else {
      flush();
      blocks.push({ type: 'p', items: [t] });
    }
  }
  flush();

  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === 'p') {
          return <p key={i} className="text-sm text-gray-700 leading-relaxed mb-2 last:mb-0">{inlineMarkdown(b.items[0])}</p>;
        }
        const Tag = b.type === 'ul' ? 'ul' : 'ol';
        const cls = b.type === 'ul' ? 'list-disc' : 'list-decimal';
        return (
          <Tag key={i} className={`${cls} list-inside space-y-0.5 mb-2 last:mb-0`}>
            {b.items.map((item, j) => (
              <li key={j} className="text-sm text-gray-700 leading-relaxed">{inlineMarkdown(item)}</li>
            ))}
          </Tag>
        );
      })}
    </>
  );
}

export default function AnalysisView({ analysis, compactData, onReset, isStreaming }: AnalysisViewProps) {
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

  const sections = useMemo(() => analysis.split(/(?=## )/).filter(Boolean), [analysis]);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
              <SparkleIcon size={16} weight="light" className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">Financial Analysis</h3>
              <p className="text-xs text-gray-400">AI-generated report</p>
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
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {sections.length > 0 ? (
              sections.map((section, i) => {
                const isHeading = section.startsWith('##');
                if (isHeading) {
                  const [, heading, ...body] = section.split('\n');
                  return (
                    <div key={i} className="mb-5 last:mb-0">
                      {heading && (
                        <h4 className="text-base font-semibold text-gray-900 mb-2 pb-1.5 border-b border-gray-100">
                          {heading.replace(/^##\s*/, '')}
                        </h4>
                      )}
                      <div className="space-y-0.5">
                        {renderBody(body.join('\n').trim())}
                      </div>
                    </div>
                  );
                }
                return <div key={i} className="mb-3 last:mb-0">{renderBody(section.trim())}</div>;
              })
            ) : (
              <p className="text-sm text-gray-700">{analysis}</p>
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
              <h3 className="text-sm font-medium text-gray-900">Parsed Transactions</h3>
              <p className="text-xs text-gray-400">
                {showRaw ? 'Click to hide' : `${compactData.split('\n').length} lines`}
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
              {compactData}
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
