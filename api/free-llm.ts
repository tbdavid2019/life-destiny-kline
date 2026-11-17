export const config = {
  runtime: 'edge',
};

declare const process: {
  env: Record<string, string | undefined>;
};

const DEFAULT_BASE_URL = 'https://llm.aiurl.tw/v1';
const DEFAULT_MODEL = 'group/talk';
const MAX_PROMPT_CHARS = 25000;
const HEARTBEAT_INTERVAL_MS = 5000;

const DEFAULT_ALLOWED_ORIGINS = [
  'https://life-destiny-kline.vercel.app',
  'https://tbdavid2019.github.io',
];

function isOriginAllowed(req: Request, origin: string): boolean {
  if (!origin) return true;

  const normalizedOrigin = origin.trim().replace(/\/+$/, '');
  let originUrl: URL;
  try {
    originUrl = new URL(normalizedOrigin);
  } catch {
    return false;
  }

  // Always allow same-origin requests (covers custom domains & any Vercel alias)
  const rawHost = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '')
    .split(',')[0]
    ?.trim()
    .toLowerCase();
  if (rawHost && originUrl.host.toLowerCase() === rawHost) {
    return true;
  }

  const customList = (process.env.FREE_LLM_ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const allowList = customList.length > 0 ? customList : DEFAULT_ALLOWED_ORIGINS;
  if (allowList.includes('*') || allowList.includes(originUrl.origin)) {
    return true;
  }

  if (/^https:\/\/life-destiny-kline(-[a-z0-9-]+)?\.vercel\.app$/i.test(originUrl.origin)) {
    return true;
  }
  if (/^https:\/\/([a-z0-9-]+\.)?david888\.com$/i.test(originUrl.origin)) {
    return true;
  }
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(originUrl.origin)) {
    return true;
  }

  return false;
}

function buildCorsHeaders(req: Request): { headers: Record<string, string>; allowed: boolean } {
  const origin = req.headers.get('origin') || '';
  const allowed = isOriginAllowed(req, origin);

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  };

  if (origin && allowed) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }

  return { headers, allowed };
}

function jsonResponse(body: unknown, status: number, extraHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  });
}

function readFreeLlmConfig() {
  const enabledFlag = (process.env.FREE_LLM_ENABLED || '').trim().toLowerCase();
  const apiKey = (process.env.FREE_LLM_API_KEY || '').trim();
  const baseUrl = (process.env.FREE_LLM_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
  const model = (process.env.FREE_LLM_MODEL || DEFAULT_MODEL).trim();

  const isEnabled = enabledFlag === 'true' && apiKey.length > 0 && baseUrl.length > 0 && model.length > 0;

  return {
    isEnabled,
    apiKey,
    baseUrl,
    model,
  };
}

interface UpstreamAttemptResult {
  emittedChars: number;
  reasoningChars: number;
  finishReason?: string;
  errorMessage?: string;
  httpStatus?: number;
}

function extractErrorText(parsed: Record<string, unknown>): string | undefined {
  const err = parsed.error;
  if (typeof err === 'string' && err.trim()) return err.trim();
  if (err && typeof err === 'object') {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim()) return msg.trim();
    return JSON.stringify(err).slice(0, 240);
  }
  if (typeof parsed.detail === 'string' && parsed.detail.trim()) {
    return parsed.detail.trim();
  }
  return undefined;
}

async function streamUpstreamOnce(params: {
  endpoint: string;
  apiKey: string;
  model: string;
  systemInstruction: string;
  userPrompt: string;
  signal: AbortSignal;
  isClosed: () => boolean;
  enqueueSse: (text: string) => void;
}): Promise<UpstreamAttemptResult> {
  const { endpoint, apiKey, model, systemInstruction, userPrompt, signal, isClosed, enqueueSse } = params;

  const upstreamResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 24000,
    }),
    signal,
  });

  if (!upstreamResponse.ok) {
    const errDetail = (await upstreamResponse.text()).slice(0, 300);
    return {
      emittedChars: 0,
      reasoningChars: 0,
      httpStatus: upstreamResponse.status,
      errorMessage: `免費 AI 引擎暫時無法回應 (${upstreamResponse.status})，可稍後重試或切換至自備金鑰 (BYOK)。${errDetail ? ` [${errDetail}]` : ''}`,
    };
  }

  const contentType = upstreamResponse.headers.get('content-type') || '';

  if (!contentType.includes('text/event-stream') || !upstreamResponse.body) {
    const jsonResult = (await upstreamResponse.json().catch(() => ({}))) as {
      choices?: Array<{
        finish_reason?: string;
        message?: { content?: string };
        text?: string;
      }>;
      error?: unknown;
      detail?: unknown;
    };

    const errText = extractErrorText(jsonResult as Record<string, unknown>);
    if (errText) {
      return {
        emittedChars: 0,
        reasoningChars: 0,
        errorMessage: `免費 AI 引擎錯誤：${errText}`,
      };
    }

    const choice = jsonResult.choices?.[0];
    const content = choice?.message?.content || choice?.text || '';
    if (content) {
      enqueueSse(
        `data: ${JSON.stringify({
          delta: content,
          finishReason: choice?.finish_reason,
          model,
        })}\n\n`
      );
    }

    return {
      emittedChars: content.length,
      reasoningChars: 0,
      finishReason: choice?.finish_reason,
    };
  }

  const reader = upstreamResponse.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let lineBuffer = '';
  let emittedChars = 0;
  let reasoningChars = 0;
  let lastFinishReason: string | undefined;
  let errorMessage: string | undefined;

  const handleLine = (rawLine: string): boolean => {
    const line = rawLine.trim();
    if (!line || line.startsWith(':')) return false;
    if (!line.startsWith('data:')) return false;

    const dataStr = line.slice(5).trim();
    if (dataStr === '[DONE]') {
      return true;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(dataStr) as Record<string, unknown>;
    } catch {
      return false;
    }

    const errText = extractErrorText(parsed);
    if (errText) {
      errorMessage = `免費 AI 引擎錯誤：${errText}`;
      return true;
    }

    const choices = parsed.choices as
      | Array<{
          delta?: { content?: string | null; text?: string | null; reasoning_content?: string | null; reasoning?: string | null };
          message?: { content?: string | null };
          text?: string | null;
          finish_reason?: string | null;
        }>
      | undefined;

    const choice = choices?.[0];
    if (!choice) return false;

    const reasoning = choice.delta?.reasoning_content || choice.delta?.reasoning || '';
    if (typeof reasoning === 'string' && reasoning.length > 0) {
      reasoningChars += reasoning.length;
    }

    const delta =
      (typeof choice.delta?.content === 'string' && choice.delta.content) ||
      (typeof choice.delta?.text === 'string' && choice.delta.text) ||
      (typeof choice.message?.content === 'string' && choice.message.content) ||
      (typeof choice.text === 'string' && choice.text) ||
      '';

    const finishReason = choice.finish_reason || undefined;
    if (finishReason) {
      lastFinishReason = finishReason;
    }

    if (delta || finishReason) {
      emittedChars += delta.length;
      enqueueSse(
        `data: ${JSON.stringify({
          delta,
          finishReason,
        })}\n\n`
      );
    }

    return false;
  };

  while (!isClosed()) {
    const { done, value } = await reader.read();
    if (done) break;

    lineBuffer += decoder.decode(value, { stream: true });
    const lines = lineBuffer.split(/\r?\n/);
    lineBuffer = lines.pop() ?? '';

    for (const rawLine of lines) {
      if (handleLine(rawLine)) {
        return {
          emittedChars,
          reasoningChars,
          finishReason: lastFinishReason,
          errorMessage,
        };
      }
    }
  }

  if (lineBuffer.trim()) {
    handleLine(lineBuffer);
  }

  return {
    emittedChars,
    reasoningChars,
    finishReason: lastFinishReason,
    errorMessage,
  };
}

export default async function handler(req: Request): Promise<Response> {
  const { headers: corsHeaders, allowed } = buildCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    if (!allowed) {
      return jsonResponse({ error: 'Origin not allowed' }, 403, corsHeaders);
    }
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!allowed) {
    return jsonResponse({ error: 'Origin not allowed' }, 403, corsHeaders);
  }

  const configState = readFreeLlmConfig();

  if (req.method === 'GET') {
    return jsonResponse(
      {
        enabled: configState.isEnabled,
        model: configState.isEnabled ? configState.model : undefined,
      },
      200,
      corsHeaders
    );
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
  }

  if (!configState.isEnabled) {
    return jsonResponse(
      {
        error: '免費 AI 引擎目前已關閉或尚未啟用，請切換至「自備金鑰 (BYOK)」模式繼續使用。',
      },
      503,
      corsHeaders
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: 'Invalid JSON request body' }, 400, corsHeaders);
  }

  const systemInstruction = typeof body.systemInstruction === 'string' ? body.systemInstruction.trim() : '';
  const userPrompt = typeof body.userPrompt === 'string' ? body.userPrompt.trim() : '';

  if (!systemInstruction || !userPrompt) {
    return jsonResponse({ error: '缺少必要的提示詞內容' }, 400, corsHeaders);
  }

  if (systemInstruction.length > MAX_PROMPT_CHARS || userPrompt.length > MAX_PROMPT_CHARS) {
    return jsonResponse({ error: '請求內容過長' }, 413, corsHeaders);
  }

  const endpoint = configState.baseUrl.endsWith('/chat/completions')
    ? configState.baseUrl
    : `${configState.baseUrl}/chat/completions`;

  const encoder = new TextEncoder();
  const upstreamAbort = new AbortController();
  let streamClosed = false;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueueSse = (text: string) => {
        if (!streamClosed) {
          controller.enqueue(encoder.encode(text));
        }
      };

      const finishStream = () => {
        if (heartbeatTimer !== null) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        if (!streamClosed) {
          streamClosed = true;
          controller.close();
        }
      };

      enqueueSse(': connected\n\n');
      heartbeatTimer = setInterval(() => {
        enqueueSse(': keepalive\n\n');
      }, HEARTBEAT_INTERVAL_MS);

      try {
        let attempt = await streamUpstreamOnce({
          endpoint,
          apiKey: configState.apiKey,
          model: configState.model,
          systemInstruction,
          userPrompt,
          signal: upstreamAbort.signal,
          isClosed: () => streamClosed,
          enqueueSse,
        });

        // Auto-retry once if upstream returned 0 content characters (transient routing glitch)
        const shouldRetry =
          !streamClosed &&
          attempt.emittedChars === 0 &&
          (!attempt.httpStatus || attempt.httpStatus >= 500 || attempt.httpStatus === 429);

        if (shouldRetry) {
          enqueueSse(': retrying\n\n');
          attempt = await streamUpstreamOnce({
            endpoint,
            apiKey: configState.apiKey,
            model: configState.model,
            systemInstruction,
            userPrompt,
            signal: upstreamAbort.signal,
            isClosed: () => streamClosed,
            enqueueSse,
          });
        }

        if (attempt.errorMessage && attempt.emittedChars === 0) {
          enqueueSse(`event: error\ndata: ${JSON.stringify({ error: attempt.errorMessage })}\n\n`);
          finishStream();
          return;
        }

        if (attempt.emittedChars === 0) {
          enqueueSse(
            `event: error\ndata: ${JSON.stringify({
              error: `免費 AI 引擎未輸出任何文字內容 (finishReason=${attempt.finishReason || 'none'}, reasoning=${attempt.reasoningChars})，請再點擊一次重新生成，或切換自備金鑰 (BYOK)。`,
            })}\n\n`
          );
          finishStream();
          return;
        }

        enqueueSse(`data: ${JSON.stringify({ done: true, chars: attempt.emittedChars })}\n\n`);
        enqueueSse('data: [DONE]\n\n');
        finishStream();
      } catch (err) {
        if (!streamClosed) {
          const msg =
            err instanceof Error && err.name === 'AbortError'
              ? '免費 AI 引擎請求已取消。'
              : '免費 AI 引擎連線逾時或暫時中斷，請稍後重試或切換至自備金鑰 (BYOK)。';
          enqueueSse(`event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`);
        }
        finishStream();
      }
    },
    cancel() {
      streamClosed = true;
      if (heartbeatTimer !== null) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      upstreamAbort.abort();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      ...corsHeaders,
    },
  });
}
