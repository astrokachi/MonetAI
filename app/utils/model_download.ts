'use client';

export interface DownloadProgress {
  progress: number;
  loaded: number;
  total: number;
  info: string;
  isComplete: boolean;
}

export type OnProgressCallback = (progressData: DownloadProgress) => void;

export async function downloadModel(
  modelUrl: string,
  onProgress?: OnProgressCallback
): Promise<void> {
  const cache = await caches.open('ai-models');
  const cachedResponse = await cache.match(modelUrl);

  if (cachedResponse) {
    console.log("Model already cached!");
    onProgress?.({
      progress: 100,
      loaded: 0,
      total: 0,
      info: 'Already cached',
      isComplete: true,
    });
    return;
  }

  const response = await fetch(modelUrl);

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const contentLength = +(response.headers.get("Content-Length") || 0);
  const reader = response.body?.getReader();

  if (!reader) {
    throw new Error("No response body");
  }

  let received = 0;
  const chunks: Uint8Array[] = [];
  let lastEmit = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      if (value) {
        chunks.push(value);
        received += value.length;

        const now = Date.now();

        if (now - lastEmit > 150) {
          lastEmit = now;

          const progress = contentLength ? Math.round((received / contentLength) * 100) : 0;
          const info = formatDownloadProgress(received, contentLength);

          onProgress?.({
            progress,
            loaded: received,
            total: contentLength,
            info,
            isComplete: false,
          });
        }
      }
    }

    const blob = new Blob(chunks as BlobPart[]);
    await cache.put(modelUrl, new Response(blob));

    onProgress?.({
      progress: 100,
      loaded: received,
      total: contentLength,
      info: formatDownloadProgress(received, contentLength),
      isComplete: true,
    });

    console.log("Model downloaded and cached successfully!");
  } finally {
    reader.releaseLock();
  }
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

function formatDownloadProgress(loaded: number, total: number) {
  if (total === 0) {
    return formatBytes(loaded);
  }

  return `${formatBytes(loaded)} / ${formatBytes(total)}`;
}
