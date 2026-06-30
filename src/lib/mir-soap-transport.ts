import https from 'node:https';
import { URL } from 'node:url';
import { getMirTlsCaBundle, isMirTlsInsecure } from '@/lib/mir-tls-ca';

export type MirSoapResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  text: () => Promise<string>;
};

/**
 * POST SOAP al MIR usando node:https (más fiable en Vercel que fetch+undici con CA custom).
 */
export function mirSoapPost(
  url: string,
  headers: Record<string, string>,
  body: string,
  timeoutMs = 60000
): Promise<MirSoapResponse> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const insecure = isMirTlsInsecure();
    const ca = insecure ? undefined : getMirTlsCaBundle();

    const req = https.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        method: 'POST',
        headers,
        ca,
        rejectUnauthorized: !insecure,
        timeout: timeoutMs,
        servername: parsed.hostname,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          const status = res.statusCode ?? 0;
          const headerPairs: [string, string][] = [];
          for (const [key, value] of Object.entries(res.headers)) {
            if (value === undefined) continue;
            if (Array.isArray(value)) {
              value.forEach((v) => headerPairs.push([key, v]));
            } else {
              headerPairs.push([key, value]);
            }
          }
          resolve({
            ok: status >= 200 && status < 300,
            status,
            statusText: res.statusMessage ?? '',
            headers: new Headers(headerPairs),
            text: async () => text,
          });
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      const err = new Error('Timeout en la conexión con el MIR');
      err.name = 'AbortError';
      reject(err);
    });

    req.write(body);
    req.end();
  });
}
