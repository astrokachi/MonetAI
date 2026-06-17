'use client';

import { useState, useEffect } from 'react';
import DocumentProcessor from './components/document-processor';
import Download from './components/download';
import { MODELS } from './utils/models';
import { ModelType } from './utils/types';

export default function Home() {
  const [modelCached, setModelCached] = useState<boolean | null>(null);

  useEffect(() => {
    const checkCache = async () => {
      try {
        const cache = await caches.open('ai-models');
        const cachedModel = await cache.match(MODELS.llama);
        setModelCached(!!cachedModel);
      } catch (error) {
        console.error('Error checking cache:', error);
        setModelCached(false);
      }
    };

    checkCache();
  }, []);

  const onDownloadComplete = () => {
    setModelCached(true);
  };

  if (modelCached === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-stone-50 to-stone-100">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-400 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  if (modelCached) {
    return <DocumentProcessor />;
  }

  const model: ModelType = {
    name: 'llama',
    url: MODELS.llama,
  };

  return <Download model={model} onDownloadComplete={onDownloadComplete} />;
}
