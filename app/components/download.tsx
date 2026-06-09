'use client';

import { useState, useEffect } from 'react';
import { ModelType } from '@/app/utils/types';

interface DownloadProps {
  model: ModelType;
  onDownloadComplete?: () => void;
}

export interface ProgressState {
  progress: number;
  loaded: number;
  info: string;
  total: number;
  isComplete: boolean;
}

export default function Download({ model }: DownloadProps) {
  const [progressState, setProgressState] = useState<ProgressState>({
    progress: 0,
    loaded: 0,
    info: '-- --',
    total: 0,
    isComplete: false,
  });

  // onProgress callback that consumes args from downloadModel
  const handleProgress = (progress: number, loaded: number, info: string, total: number) => {
    setProgressState({
      progress,
      loaded,
      info,
      total,
      isComplete: progress === 100,
    });
  };

  useEffect(() => {
    const initializeDownload = async () => {
      try {
        const { downloadModel } = await import('@/app/utils/model_download');
        await downloadModel(model.url, model.name, handleProgress);
      } catch (error) {
        console.error('Download failed:', error);
      }
    };

    initializeDownload();
  }, [model]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-stone-50 to-stone-100">
      <div className="w-full max-w-md px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Downloading Model</h1>
          <p className="text-gray-600">{model.name}</p>
        </div>

        {/* Progress Container */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm font-semibold text-emerald-600">{progressState.progress}%</span>
            </div>

            {/* Bar Background */}
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              {/* Bar Fill */}
              <div
                className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressState.progress}%` }}
              />
            </div>
          </div>

          {/* Progress Info */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Downloaded</span>
              <span className="font-medium text-gray-800">{progressState.info}</span>
            </div>

            {progressState.total > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Speed</span>
                <span className="font-medium text-gray-800">
                  {calculateSpeed(progressState.loaded)}
                </span>
              </div>
            )}

            {!progressState.isComplete && progressState.total > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">ETA</span>
                <span className="font-medium text-gray-800">
                  {calculateETA(progressState.progress, progressState.total, progressState.loaded)}
                </span>
              </div>
            )}
          </div>

          {/* Status Message */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            {progressState.isComplete ? (
              <div className="flex items-center justify-center space-x-2 text-emerald-600">
                <CheckIcon />
                <span className="font-medium">Download Complete</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2 text-gray-500">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                <span className="text-sm">Downloading...</span>
              </div>
            )}
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Your AI model is being securely downloaded and cached locally.</p>
        </div>
      </div>
    </div>
  );
}

const speedTracker = { lastTime: 0, lastLoaded: 0 };

function calculateSpeed(bytesLoaded: number): string {
  const now = Date.now();
  if (speedTracker.lastTime === 0) {
    speedTracker.lastTime = now;
    speedTracker.lastLoaded = bytesLoaded;
    return '0 MB/s';
  }

  const timeDiff = (now - speedTracker.lastTime) / 1000; // seconds
  if (timeDiff < 1) return '0 MB/s';

  const bytesDiff = bytesLoaded - speedTracker.lastLoaded;
  const bytesPerSecond = bytesDiff / timeDiff;

  speedTracker.lastTime = now;
  speedTracker.lastLoaded = bytesLoaded;

  const speedMB = bytesPerSecond / (1024 * 1024);
  return `${speedMB.toFixed(2)} MB/s`;
}

function calculateETA(progress: number, totalBytes: number, loadedBytes: number): string {
  if (progress === 0 || progress >= 100) return '-';

  const remainingBytes = totalBytes - loadedBytes;
  const bytesPerPercent = loadedBytes / progress;
  const remainingPercent = 100 - progress;
  const estimatedTotalTime = bytesPerPercent * 100;
  const estimatedRemainingTime = estimatedTotalTime - (bytesPerPercent * progress);

  const seconds = Math.round(estimatedRemainingTime / (1024 * 1024) * 8); // rough estimate

  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h`;
}

// Check Icon Component
function CheckIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}
