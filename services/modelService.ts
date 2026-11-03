import { AIProvider, ModelOption } from '../types';
import { signAwsRequest } from './awsSigV4';

export interface ProviderMetadata {
  id: AIProvider;
  name: string;
  badge: string;
  description: string;
  defaultBaseUrl: string;
  keyPlaceholder: string;
  keyHelpUrl?: string;
  isAws?: boolean;
}

export const PROVIDERS: ProviderMetadata[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    badge: '官方直連',
    description: 'Google AI Studio Gemini 模型 (Gemini 2.5 Pro / Flash 等)',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    keyPlaceholder: 'AIzaSy...',
    keyHelpUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: 'groq',
    name: 'Groq',
    badge: '極速推論',
    description: 'Groq LPU 極速推論 (Llama 3.3, DeepSeek R1 Distill 等)',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    keyPlaceholder: 'gsk_...',
    keyHelpUrl: 'https://console.groq.com/keys',
  },
  {
    id: 'openai',
    name: 'ChatGPT (OpenAI)',
    badge: 'OpenAI 官方',
    description: 'OpenAI 官方端點 (GPT-4o, o3-mini, o1, GPT-4.5 等)',
    defaultBaseUrl: 'https://api.openai.com/v1',
    keyPlaceholder: 'sk-proj-... / sk-...',
    keyHelpUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'claude',
    name: 'Claude (Anthropic)',
    badge: 'Anthropic 官方',
    description: 'Anthropic 官方端點 (Claude 3.7 Sonnet, Claude 3.5 Sonnet 等)',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    keyPlaceholder: 'sk-ant-...',
    keyHelpUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'grok',
    name: 'xAI (Grok)',
    badge: 'xAI 官方',
    description: 'Elon Musk xAI Grok 系列模型 (Grok 2, Grok 3 等)',
    defaultBaseUrl: 'https://api.x.ai/v1',
    keyPlaceholder: 'xai-...',
    keyHelpUrl: 'https://console.x.ai/',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    badge: '海量多模型',
    description: '聚合數百款全球頂尖模型 (Claude, GPT, DeepSeek, Qwen 等)',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    keyPlaceholder: 'sk-or-...',
    keyHelpUrl: 'https://openrouter.ai/keys',
  },
  {
    id: 'bedrock',
    name: 'AWS Bedrock',
    badge: 'AWS 託管',
    description: 'Amazon Bedrock 託管 Foundation Models (Claude, Nova, Llama 等)',
    defaultBaseUrl: '',
    keyPlaceholder: 'AWS Access Key ID',
    keyHelpUrl: 'https://console.aws.amazon.com/bedrock',
    isAws: true,
  },
  {
    id: 'custom',
    name: '自定義 / 相容端點',
    badge: 'OpenAI 相容',
    description: '相容端點 (Ollama, vLLM, DeepSeek, LocalAI, OneAPI, LiteLLM 等)',
    defaultBaseUrl: '',
    keyPlaceholder: 'sk-...',
  },
];

export interface FetchModelsParams {
  provider: AIProvider;
  apiKey: string;
  apiBaseUrl?: string;
  awsConfig?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
    sessionToken?: string;
  };
}

/**
 * 動態向 Provider API 發送請求以獲取當前帳號可用的 Model 列表
 */
export async function fetchModelList(params: FetchModelsParams): Promise<ModelOption[]> {
  const { provider, apiKey, apiBaseUrl, awsConfig } = params;

  // 1. AWS Bedrock 處理
  if (provider === 'bedrock') {
    return await fetchBedrockModels(awsConfig, apiBaseUrl, apiKey);
  }

  // 其他 Provider 需要 API Key
  const cleanApiKey = apiKey ? apiKey.trim() : '';
  if (!cleanApiKey) {
    throw new Error('請先輸入 API Key 再獲取模型列表');
  }

  const cleanBaseUrl = apiBaseUrl?.trim().replace(/\/+$/, '') || getDefaultBaseUrl(provider);

  switch (provider) {
    case 'gemini':
      return await fetchGeminiModels(cleanBaseUrl, cleanApiKey);
    case 'groq':
      return await fetchGroqModels(cleanBaseUrl, cleanApiKey);
    case 'grok':
      return await fetchGrokModels(cleanBaseUrl, cleanApiKey);
    case 'openai':
      return await fetchOpenAIModels(cleanBaseUrl, cleanApiKey);
    case 'claude':
      return await fetchClaudeModels(cleanBaseUrl, cleanApiKey);
    case 'openrouter':
      return await fetchOpenRouterModels(cleanBaseUrl, cleanApiKey);
    case 'custom':
    default:
      return await fetchCustomOpenAIModels(cleanBaseUrl, cleanApiKey);
  }
}

export function getDefaultBaseUrl(provider: AIProvider): string {
  const match = PROVIDERS.find(p => p.id === provider);
  return match ? match.defaultBaseUrl : '';
}

/**
 * Google Gemini 模型列表解析
 */
async function fetchGeminiModels(baseUrl: string, apiKey: string): Promise<ModelOption[]> {
  // 優先嘗試 OpenAI-compatible /models 端點
  try {
    const res = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.data) && data.data.length > 0) {
        return data.data
          .filter((m: any) => typeof m.id === 'string' && !m.id.includes('embedding') && !m.id.includes('aqa'))
          .map((m: any) => ({
            id: m.id,
            name: m.id,
          }));
      }
    }
  } catch (err) {
    console.warn('Gemini OpenAI endpoint failed, falling back to native API', err);
  }

  // Fallback 到原生 Google Generative Language models API
  try {
    const nativeRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!nativeRes.ok) {
      const err = await nativeRes.text();
      throw new Error(`Google API 失敗: ${nativeRes.status} - ${err}`);
    }
    const json = await nativeRes.json();
    if (!Array.isArray(json?.models)) {
      throw new Error('無法取得 Google Gemini 模型列表');
    }

    return json.models
      .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m: any) => {
        const id = m.name?.replace(/^models\//, '') || m.name;
        return {
          id,
          name: m.displayName ? `${m.displayName} (${id})` : id,
          description: m.description,
        };
      });
  } catch (error: any) {
    throw new Error(`獲取 Gemini 模型列表失敗: ${error.message || error}`);
  }
}

/**
 * Groq 模型列表
 */
async function fetchGroqModels(baseUrl: string, apiKey: string): Promise<ModelOption[]> {
  try {
    const res = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Groq 請求失敗: ${res.status} - ${err}`);
    }

    const json = await res.json();
    const list: any[] = json?.data || [];

    return list
      .filter(m => m.active !== false && !m.id.includes('whisper') && !m.id.includes('tts'))
      .map(m => ({
        id: m.id,
        name: m.id,
        contextLength: m.context_window,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  } catch (err: any) {
    handleFetchError(err, 'Groq');
    return [];
  }
}

/**
 * xAI (Grok) 模型列表
 */
async function fetchGrokModels(baseUrl: string, apiKey: string): Promise<ModelOption[]> {
  try {
    const res = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`xAI 請求失敗: ${res.status} - ${err}`);
    }

    const json = await res.json();
    const list: any[] = json?.data || [];

    return list.map(m => ({
      id: m.id,
      name: m.id,
    }));
  } catch (err: any) {
    handleFetchError(err, 'xAI (Grok)');
    return [];
  }
}

/**
 * OpenAI (ChatGPT) 模型列表
 */
async function fetchOpenAIModels(baseUrl: string, apiKey: string): Promise<ModelOption[]> {
  try {
    const res = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI 請求失敗: ${res.status} - ${err}`);
    }

    const json = await res.json();
    const list: any[] = json?.data || [];

    const chatKeywords = ['gpt', 'o1', 'o3', 'chatgpt'];
    const excludeKeywords = ['embedding', 'whisper', 'tts', 'dall-e', 'davinci', 'babbage', 'moderation', 'realtime', 'transcription', 'audio'];

    const filtered = list.filter(m => {
      const id = (m.id || '').toLowerCase();
      if (excludeKeywords.some(ex => id.includes(ex))) return false;
      return chatKeywords.some(kw => id.includes(kw));
    });

    return filtered
      .map(m => ({
        id: m.id,
        name: m.id,
        created: m.created || 0,
      }))
      .sort((a, b) => (b.created || 0) - (a.created || 0))
      .map(({ id, name }) => ({ id, name }));
  } catch (err: any) {
    handleFetchError(err, 'OpenAI');
    return [];
  }
}

/**
 * Anthropic (Claude) 模型列表
 */
async function fetchClaudeModels(baseUrl: string, apiKey: string): Promise<ModelOption[]> {
  try {
    const res = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
    });

    if (!res.ok) {
      // 某些反向代理可能使用 OpenAI 格式相容端點
      if (baseUrl !== 'https://api.anthropic.com/v1') {
        const proxyRes = await fetch(`${baseUrl}/models`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        if (proxyRes.ok) {
          const proxyJson = await proxyRes.json();
          if (Array.isArray(proxyJson?.data)) {
            return proxyJson.data.map((m: any) => ({
              id: m.id,
              name: m.name || m.id,
            }));
          }
        }
      }
      const err = await res.text();
      throw new Error(`Anthropic 請求失敗: ${res.status} - ${err}`);
    }

    const json = await res.json();
    const list: any[] = json?.data || [];

    return list.map(m => ({
      id: m.id,
      name: m.display_name ? `${m.display_name} (${m.id})` : m.id,
    }));
  } catch (err: any) {
    handleFetchError(err, 'Anthropic Claude');
    return [];
  }
}

/**
 * OpenRouter 模型列表
 */
async function fetchOpenRouterModels(baseUrl: string, apiKey: string): Promise<ModelOption[]> {
  try {
    const res = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter 請求失敗: ${res.status} - ${err}`);
    }

    const json = await res.json();
    const list: any[] = json?.data || [];

    return list.map(m => ({
      id: m.id,
      name: m.name || m.id,
      description: m.description,
      contextLength: m.context_length,
    }));
  } catch (err: any) {
    handleFetchError(err, 'OpenRouter');
    return [];
  }
}

/**
 * AWS Bedrock 模型列表
 */
async function fetchBedrockModels(
  awsConfig?: { accessKeyId?: string; secretAccessKey?: string; region?: string; sessionToken?: string },
  customBaseUrl?: string,
  apiKey?: string
): Promise<ModelOption[]> {
  // 如果提供了自定義代理 Base URL
  if (customBaseUrl) {
    return await fetchCustomOpenAIModels(customBaseUrl, apiKey || '');
  }

  const accessKeyId = awsConfig?.accessKeyId?.trim();
  const secretAccessKey = awsConfig?.secretAccessKey?.trim();
  const region = awsConfig?.region?.trim() || 'us-east-1';
  const sessionToken = awsConfig?.sessionToken?.trim();

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('請填寫 AWS Access Key ID 與 Secret Access Key 以獲取 Bedrock 模型');
  }

  const url = `https://bedrock.${region}.amazonaws.com/foundation-models?byOutputModality=TEXT`;

  try {
    const headers = await signAwsRequest({
      method: 'GET',
      url,
      region,
      service: 'bedrock',
      accessKeyId,
      secretAccessKey,
      sessionToken,
    });

    const res = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`AWS Bedrock 請求失敗: ${res.status} - ${err}`);
    }

    const json = await res.json();
    const list: any[] = json?.modelSummaries || [];

    return list.map(m => ({
      id: m.modelId,
      name: `${m.providerName || ''} - ${m.modelName || m.modelId}`.trim(),
      description: m.modelArn,
    }));
  } catch (err: any) {
    if (err.message && err.message.includes('Failed to fetch')) {
      throw new Error(
        `AWS Bedrock 瀏覽器跨域限制 (CORS)：若您的網路或 IAM 端點禁止前端直接請求，請填入 Bedrock 反向代理 URL，或直接手動輸入 Model ID (例如：anthropic.claude-3-5-sonnet-20241022-v2:0)。`
      );
    }
    throw new Error(`獲取 AWS Bedrock 模型列表失敗: ${err.message || err}`);
  }
}

/**
 * 自定義 / 相容端點模型列表
 */
async function fetchCustomOpenAIModels(baseUrl: string, apiKey: string): Promise<ModelOption[]> {
  if (!baseUrl) {
    throw new Error('請先輸入 API Base URL');
  }

  try {
    const res = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`相容端點請求失敗: ${res.status} - ${err}`);
    }

    const json = await res.json();
    let list: any[] = [];
    if (Array.isArray(json?.data)) {
      list = json.data;
    } else if (Array.isArray(json?.models)) {
      list = json.models;
    } else if (Array.isArray(json)) {
      list = json;
    }

    return list.map(m => {
      const id = typeof m === 'string' ? m : m.id || m.name;
      return {
        id,
        name: typeof m === 'object' && m.name ? `${m.name} (${id})` : id,
      };
    });
  } catch (err: any) {
    handleFetchError(err, '自定義端點');
    return [];
  }
}

function handleFetchError(err: any, providerName: string): never {
  const msg = err?.message || String(err);
  if (msg.includes('Failed to fetch')) {
    throw new Error(
      `無法連線至 ${providerName} 端點 (可能為瀏覽器 CORS 限制或網路錯誤)。若端點限制瀏覽器直連，可配置代理 URL，或直接在下方自訂模型 ID。`
    );
  }
  throw new Error(`獲取 ${providerName} 模型列表失敗: ${msg}`);
}
