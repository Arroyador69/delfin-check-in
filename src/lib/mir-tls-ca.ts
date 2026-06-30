import fs from 'node:fs';
import path from 'node:path';
import tls from 'node:tls';

let cachedBundle: string | undefined | null = null;

function readAccompPem(): string | undefined {
  const candidates = [
    path.join(process.cwd(), 'certs', 'ACCOMP.pem'),
    path.join(process.cwd(), 'certs', 'ACCOMP.crt'),
    path.join(__dirname, '..', '..', 'certs', 'ACCOMP.pem'),
    path.join(__dirname, '..', '..', 'certs', 'ACCOMP.crt'),
  ];

  for (const pemPath of candidates) {
    try {
      if (fs.existsSync(pemPath)) {
        const pem = fs.readFileSync(pemPath, 'utf8').trim();
        if (pem.includes('BEGIN CERTIFICATE')) {
          return pem;
        }
      }
    } catch {
      // siguiente candidato
    }
  }
  return undefined;
}

/**
 * CA para TLS con hospedajes.ses.mir.es: raíces del runtime + intermedio FNMT ACCOMP.
 * El MIR no siempre envía el intermedio en la cadena → falla verify sin este bundle.
 */
export function getMirTlsCaBundle(): string | undefined {
  if (cachedBundle !== null) {
    return cachedBundle;
  }

  const intermediate = readAccompPem();
  if (!intermediate) {
    console.warn('⚠️ MIR TLS: no se encontró certs/ACCOMP.pem en el bundle de despliegue');
    cachedBundle = undefined;
    return cachedBundle;
  }

  const roots = tls.rootCertificates.join('\n');
  cachedBundle = `${roots}\n${intermediate}\n`;
  return cachedBundle;
}

export function isMirTlsInsecure(): boolean {
  return String(process.env.MIR_TLS_INSECURE || '').toLowerCase() === 'true';
}
