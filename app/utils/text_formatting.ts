'use client';

export function formatText(rawText: string): string {
  if (!rawText) return '';

  let text = rawText.replace(/\r\n/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/(\w+)-\n\s*(\w+)/g, '$1$2');
  text = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');

  return text.trim();
}

export function chunkText(
  text: string,
  chunkSize: number = 512,
  overlap: number = 50
): string[] {
  const chunks: string[] = [];

  if (text.length <= chunkSize) {
    return [text];
  }

  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    const lastPeriod = text.lastIndexOf('.', end);
    const lastNewline = text.lastIndexOf('\n', end);

    if (lastPeriod > start && lastPeriod > end - 100) {
      end = lastPeriod + 1;
    } else if (lastNewline > start && lastNewline > end - 100) {
      end = lastNewline;
    }

    chunks.push(text.substring(start, end).trim());
    start = end - overlap;
  }

  return chunks.filter(chunk => chunk.length > 0);
}
