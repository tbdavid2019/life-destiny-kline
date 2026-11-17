/**
 * 共用 SSE (Server-Sent Events) 串流讀取器
 * 供免費代理與所有 BYOK 串流端點共用，避免長生成連線在代理或閘道端發生閒置超時 (504 / 524)。
 */
export async function readSseStream(
  response: Response,
  onData: (eventName: string, dataStr: string) => boolean | void
): Promise<void> {
  if (!response.body) {
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let currentEvent = 'message';

  const processLine = (rawLine: string): boolean => {
    const line = rawLine.trim();
    if (!line) {
      currentEvent = 'message';
      return false;
    }
    if (line.startsWith(':')) {
      return false;
    }
    if (line.startsWith('event:')) {
      currentEvent = line.slice(6).trim();
      return false;
    }
    if (!line.startsWith('data:')) {
      return false;
    }

    const dataStr = line.slice(5).trim();
    if (dataStr === '[DONE]') {
      return true;
    }

    return onData(currentEvent, dataStr) === true;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';

    for (const rawLine of lines) {
      if (processLine(rawLine)) {
        return;
      }
    }
  }

  if (buffer.trim()) {
    processLine(buffer);
  }
}
