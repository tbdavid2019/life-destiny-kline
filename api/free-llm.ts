declare const process: {
  env: Record<string, string | undefined>;
};

interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  on?: (event: string, listener: (chunk: unknown) => void) => void;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
  end: (body?: string) => void;
}

const DEFAULT_BASE_URL = 'https://llm.aiurl.tw/v1';
const DEFAULT_MODEL = 'group/talk';
const MAX_PROMPT_CHARS = 25000;

const DEFAULT_ALLOWED_ORIGINS = [
  'https://life-destiny-kline.vercel.app',
  'https://tbdavid2019.github.io',
];

function getHeader(req: ApiRequest, name: string): string {
  const raw = req.headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0] || '';
  return typeof raw === 'string' ? raw : '';
}

function isOriginAllowed(origin: string): boolean {
  if (!origin) return true;

  const customList = (process.env.FREE_LLM_ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const normalizedOrigin = origin.trim().replace(/\/+$/, '');
  const allowList = customList.length > 0 ? customList : DEFAULT_ALLOWED_ORIGINS;

  if (allowList.includes('*') || allowList.includes(normalizedOrigin)) {
    return true;
  }

  // Allow project Vercel preview deployments and local dev servers
  if (/^https:\/\/life-destiny-kline(-[a-z0-9-]+)?\.vercel\.app$/i.test(normalizedOrigin)) {
    return true;
  }
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalizedOrigin)) {
    return true;
  }

  return false;
}

function applyCors(req: ApiRequest, res: ApiResponse): boolean {
  const origin = getHeader(req, 'origin');
  const allowed = isOriginAllowed(origin);

  if (origin && allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  return allowed;
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

async function parseJsonBody(req: ApiRequest): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    return JSON.parse(req.body) as Record<string, unknown>;
  }
  if (typeof req.on === 'function') {
    const raw = await new Promise<string>((resolve, reject) => {
      let data = '';
      req.on!('data', (chunk) => {
        data += String(chunk);
      });
      req.on!('end', () => resolve(data));
      req.on!('error', (err) => reject(err));
    });
    if (raw.trim()) {
      return JSON.parse(raw) as Record<string, unknown>;
    }
  }
  return {};
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const originAllowed = applyCors(req, res);

  if (req.method === 'OPTIONS') {
    if (!originAllowed) {
      res.status(403).json({ error: 'Origin not allowed' });
      return;
    }
    res.status(204).end();
    return;
  }

  if (!originAllowed) {
    res.status(403).json({ error: 'Origin not allowed' });
    return;
  }

  const config = readFreeLlmConfig();

  if (req.method === 'GET') {
    res.status(200).json({
      enabled: config.isEnabled,
      model: config.isEnabled ? config.model : undefined,
    });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!config.isEnabled) {
    res.status(503).json({
      error: '免費 AI 引擎目前已關閉或尚未啟用，請切換至「自備金鑰 (BYOK)」模式繼續使用。',
    });
    return;
  }

  let body: Record<string, unknown>;
  try {
    body = await parseJsonBody(req);
  } catch {
    res.status(400).json({ error: 'Invalid JSON request body' });
    return;
  }

  const systemInstruction = typeof body.systemInstruction === 'string' ? body.systemInstruction.trim() : '';
  const userPrompt = typeof body.userPrompt === 'string' ? body.userPrompt.trim() : '';

  if (!systemInstruction || !userPrompt) {
    res.status(400).json({ error: '缺少必要的提示詞內容' });
    return;
  }

  if (systemInstruction.length > MAX_PROMPT_CHARS || userPrompt.length > MAX_PROMPT_CHARS) {
    res.status(413).json({ error: '請求內容過長' });
    return;
  }

  const endpoint = config.baseUrl.endsWith('/chat/completions')
    ? config.baseUrl
    : `${config.baseUrl}/chat/completions`;

  try {
    const upstreamResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 24000,
      }),
    });

    if (!upstreamResponse.ok) {
      const errDetail = await upstreamResponse.text();
      res.status(upstreamResponse.status >= 500 ? 502 : upstreamResponse.status).json({
        error: `免費 AI 引擎暫時無法回應 (${upstreamResponse.status})，可稍後重試或切換至自備金鑰 (BYOK)。`,
        detail: errDetail.slice(0, 300),
      });
      return;
    }

    const jsonResult = (await upstreamResponse.json()) as {
      choices?: Array<{
        finish_reason?: string;
        message?: { content?: string };
      }>;
    };

    const choice = jsonResult.choices?.[0];
    const content = choice?.message?.content || '';

    res.status(200).json({
      content,
      finishReason: choice?.finish_reason,
      model: config.model,
    });
  } catch {
    res.status(502).json({
      error: '免費 AI 引擎連線逾時或暫時中斷，請稍後重試或切換至自備金鑰 (BYOK)。',
    });
  }
}
