import { LifeDestinyResult } from '../types';

export interface SharedPayload {
  userName?: string;
  result: LifeDestinyResult;
}

/**
 * Compresses data using native CompressionStream (gzip) into a URL-safe base64 string.
 * Falls back to encodeURIComponent(JSON.stringify(data)) if stream is unavailable.
 */
export async function compressData(data: SharedPayload): Promise<string> {
  const jsonStr = JSON.stringify(data);

  if (typeof CompressionStream !== 'undefined') {
    try {
      const stream = new Blob([new TextEncoder().encode(jsonStr)])
        .stream()
        .pipeThrough(new CompressionStream('gzip'));
      const buffer = await new Response(stream).arrayBuffer();
      const uint8Array = new Uint8Array(buffer);

      let binary = '';
      const len = uint8Array.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }

      // Convert to base64url (RFC 4648)
      const base64 = btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      return `gz:${base64}`;
    } catch (err) {
      console.warn('Gzip compression failed, falling back to raw URI encoding:', err);
    }
  }

  return `raw:${encodeURIComponent(jsonStr)}`;
}

/**
 * Decompresses data from a URL hash string.
 */
export async function decompressData(encoded: string): Promise<SharedPayload | null> {
  if (!encoded || typeof encoded !== 'string') return null;

  try {
    let jsonStr = '';

    if (encoded.startsWith('gz:')) {
      const base64url = encoded.slice(3);
      let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4 !== 0) {
        base64 += '=';
      }

      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const stream = new Blob([bytes])
        .stream()
        .pipeThrough(new DecompressionStream('gzip'));
      jsonStr = await new Response(stream).text();
    } else if (encoded.startsWith('raw:')) {
      jsonStr = decodeURIComponent(encoded.slice(4));
    } else {
      // Legacy / raw format
      try {
        jsonStr = decodeURIComponent(encoded);
      } catch {
        jsonStr = encoded;
      }
    }

    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') return null;

    const isValidChartList = (arr: any) =>
      Array.isArray(arr) && arr.length > 0 && typeof arr[0]?.age !== 'undefined';

    // Normalize format:
    // Case 1: SharedPayload with { userName, result }
    if (parsed.result && isValidChartList(parsed.result.chartData) && typeof parsed.result.analysis === 'object') {
      return {
        userName: String(parsed.userName || ''),
        result: parsed.result,
      };
    }

    // Case 2: direct LifeDestinyResult { chartData, analysis }
    if (isValidChartList(parsed.chartData) && typeof parsed.analysis === 'object') {
      return {
        userName: String(parsed.userName || ''),
        result: {
          chartData: parsed.chartData,
          analysis: parsed.analysis,
        },
      };
    }

    // Case 3: Exported JSON format with { chartPoints, ...analysis fields }
    if (isValidChartList(parsed.chartPoints)) {
      const result: LifeDestinyResult = {
        chartData: parsed.chartPoints,
        analysis: {
          bazi: parsed.bazi || [],
          summary: parsed.summary || '',
          summaryScore: parsed.summaryScore || 5,
          personality: parsed.personality || '',
          personalityScore: parsed.personalityScore || 5,
          industry: parsed.industry || '',
          industryScore: parsed.industryScore || 5,
          fengShui: parsed.fengShui || '',
          fengShuiScore: parsed.fengShuiScore || 5,
          wealth: parsed.wealth || '',
          wealthScore: parsed.wealthScore || 5,
          marriage: parsed.marriage || '',
          marriageScore: parsed.marriageScore || 5,
          health: parsed.health || '',
          healthScore: parsed.healthScore || 5,
          family: parsed.family || '',
          familyScore: parsed.familyScore || 5,
          crypto: parsed.crypto || '',
          cryptoScore: parsed.cryptoScore || 5,
          cryptoYear: parsed.cryptoYear || '',
          cryptoStyle: parsed.cryptoStyle || '',
        },
      };

      return {
        userName: parsed.userName || '',
        result,
      };
    }

    return null;
  } catch (err) {
    console.error('Failed to decompress shared data:', err);
    return null;
  }
}
