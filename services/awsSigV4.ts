/**
 * AWS Signature Version 4 (SigV4) Request Signing utility
 * Implemented using Web Crypto API (crypto.subtle) without external heavy SDKs.
 */

export interface AwsSigV4Options {
  method: string;
  url: string;
  region: string;
  service: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  body?: string;
  headers?: Record<string, string>;
}

async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const subtle = (globalThis.crypto && globalThis.crypto.subtle) || (typeof window !== 'undefined' && window.crypto && window.crypto.subtle);
  if (!subtle) {
    throw new Error('Web Crypto API (crypto.subtle) is not available in this environment');
  }
  const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hash = await subtle.digest('SHA-256', buffer as unknown as BufferSource);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256(key: Uint8Array, data: string): Promise<Uint8Array> {
  const subtle = (globalThis.crypto && globalThis.crypto.subtle) || (typeof window !== 'undefined' && window.crypto && window.crypto.subtle);
  if (!subtle) {
    throw new Error('Web Crypto API (crypto.subtle) is not available in this environment');
  }
  const cryptoKey = await subtle.importKey(
    'raw',
    key as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(data) as unknown as BufferSource
  );
  return new Uint8Array(signature);
}

export async function signAwsRequest(options: AwsSigV4Options): Promise<Record<string, string>> {
  const {
    method,
    url,
    region,
    service,
    accessKeyId,
    secretAccessKey,
    sessionToken,
    body = '',
    headers = {},
  } = options;

  const parsedUrl = new URL(url);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);

  // Normalize all header keys to lowercase to prevent key case mismatch crashes
  const reqHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    reqHeaders[k.toLowerCase()] = v;
  }
  reqHeaders['host'] = parsedUrl.host;
  reqHeaders['x-amz-date'] = amzDate;

  if (sessionToken) {
    reqHeaders['x-amz-security-token'] = sessionToken;
  }

  const payloadHash = await sha256Hex(body);
  reqHeaders['x-amz-content-sha256'] = payloadHash;

  const headerKeys = Object.keys(reqHeaders).sort();
  const signedHeaders = headerKeys.join(';');
  const canonicalHeaders = headerKeys.map(k => `${k}:${reqHeaders[k].trim()}\n`).join('');

  const canonicalQuery = Array.from(parsedUrl.searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const canonicalRequest = [
    method.toUpperCase(),
    parsedUrl.pathname || '/',
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const canonicalRequestHash = await sha256Hex(canonicalRequest);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n');

  const kDate = await hmacSha256(new TextEncoder().encode('AWS4' + secretAccessKey), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signatureBytes = await hmacSha256(kSigning, stringToSign);
  const signature = Array.from(signatureBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  reqHeaders['authorization'] = authHeader;

  return reqHeaders;
}
