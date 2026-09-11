export interface StreamChoice {
  index: number;
  delta?: {
    content?: string;
  };
}

export interface StreamChunk {
  object?: string;
  choices?: StreamChoice[];
}

export async function consumeSseJsonStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (chunk: StreamChunk) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let partial = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      partial += decoder.decode(value, { stream: true });
      const lines = partial.split('\n');
      partial = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (!data || data === '[DONE]') continue;
        try {
          onEvent(JSON.parse(data) as StreamChunk);
        } catch {
          // ignore malformed SSE payloads
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
