import { readSseStream } from './sseUtils';

export interface FreeLlmStatus {
  enabled: boolean;
  model?: string;
}

const DEFAULT_VERCEL_FREE_ENDPOINT = 'https://life-destiny-kline.vercel.app/api/free-llm';

/**
 * 編譯期參數開關：若明確設定 VITE_FREE_LLM_ENABLED=false 則直接隱藏免費模式
 */
export function isFreeLlmBuildEnabled(): boolean {
  const raw = (import.meta.env.VITE_FREE_LLM_ENABLED as string | undefined)?.trim().toLowerCase();
  if (raw === 'false' || raw === '0' || raw === 'off') {
    return false;
  }
  return true;
}

/**
 * 解析免費 LLM 代理端點：優先使用環境變數 VITE_FREE_LLM_ENDPOINT，
 * GitHub Pages 靜態網域預設指向 Vercel Serverless 端點，Vercel/本地端使用同源 /api/free-llm。
 */
export function getFreeLlmEndpoint(): string {
  const custom = (import.meta.env.VITE_FREE_LLM_ENDPOINT as string | undefined)?.trim();
  if (custom) {
    return custom.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')) {
    return DEFAULT_VERCEL_FREE_ENDPOINT;
  }

  return '/api/free-llm';
}

/**
 * 向後端查詢免費 AI 引擎是否啟用（不會暴露任何金鑰或上游網址）
 */
export async function fetchFreeLlmStatus(): Promise<FreeLlmStatus> {
  if (!isFreeLlmBuildEnabled()) {
    return { enabled: false };
  }

  const endpoint = getFreeLlmEndpoint();
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 5000) : null;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      cache: 'no-store',
      signal: controller?.signal,
    });

    if (!response.ok) {
      return { enabled: false };
    }

    const data = (await response.json()) as Partial<FreeLlmStatus>;
    return {
      enabled: data.enabled === true,
      model: typeof data.model === 'string' ? data.model : undefined,
    };
  } catch {
    return { enabled: false };
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * 透過後端安全串流代理呼叫免費 AI 引擎（支援長時間推演不斷線）
 */
export async function callFreeLlmProxy(params: {
  systemInstruction: string;
  userPrompt: string;
}): Promise<string> {
  if (!isFreeLlmBuildEnabled()) {
    throw new Error('免費 AI 模式目前已停用，請切換至自備金鑰 (BYOK) 模式。');
  }

  const endpoint = getFreeLlmEndpoint();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: params.systemInstruction,
      userPrompt: params.userPrompt,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      payload.error || `免費 AI 引擎請求失敗 (${response.status})，請稍後重試或切換至自備金鑰 (BYOK)。`
    );
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream') || !response.body) {
    const payload = (await response.json().catch(() => ({}))) as {
      content?: string;
      finishReason?: string;
      error?: string;
    };
    if (payload.error) {
      throw new Error(payload.error);
    }
    if (payload.finishReason === 'length') {
      console.warn('[free-llm] 模型輸出觸及長度上限 (finish_reason: length)，啟動自動修復與流年補齊機制。');
    }
    return payload.content || '';
  }

  let fullContent = '';
  let finishReason: string | undefined;

  await readSseStream(response, (eventName, dataStr) => {
    let parsed: {
      delta?: string;
      content?: string;
      finishReason?: string;
      error?: string;
    };
    try {
      parsed = JSON.parse(dataStr);
    } catch {
      return;
    }

    if (eventName === 'error' || parsed.error) {
      throw new Error(parsed.error || '免費 AI 引擎回傳異常，請稍後重試或切換至自備金鑰 (BYOK)。');
    }

    if (typeof parsed.delta === 'string') {
      fullContent += parsed.delta;
    } else if (typeof parsed.content === 'string') {
      fullContent += parsed.content;
    }

    if (parsed.finishReason) {
      finishReason = parsed.finishReason;
    }
  });

  if (finishReason === 'length') {
    console.warn('[free-llm] 模型輸出觸及長度上限 (finish_reason: length)，啟動自動修復與流年補齊機制。');
  }

  return fullContent;
}
