
export async function downloadModel(modelUrl: string, modelName: string, onProgress: (progress: number, loaded: number, info: string, total: number) => void) {
  const cache = await caches.open('ai-models');
  const cachedResponse = await cache.match(modelName);

  if (cachedResponse) {
    console.log("Model already cached!");
    return;
  };

  const response = await fetch(modelUrl);

  if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

  const contentLength = +(response.headers.get("Content-Length") || 0);
  const reader = response.body?.getReader(); // read in chunks

  if (!reader) throw new Error("No response body");

  let received = 0;
  const chunks: Uint8Array[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      if (value) {
        chunks.push(value);
        received += value.length;

        const progress = contentLength ? Math.round((received / contentLength) * 100) : 0;
        const info = formatDownloadProgress(received, contentLength);

        // update state
        onProgress?.(progress, received, info, contentLength);
      }
    }

    const blob = new Blob(chunks as BlobPart[]);

    await cache.put(modelName, new Response(blob))

    onProgress?.(100, received, formatDownloadProgress(received, contentLength), contentLength);
    console.log("Model downloaded and cached successfully!");

    return true;
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
  if (total == 0) {
    return formatBytes(loaded);
  }

  return `${formatBytes(loaded)} / ${formatBytes(total)}`;
}
