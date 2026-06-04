import * as Sentry from '@sentry/nextjs';
import { shouldPersistConsoleLogToDb } from '@/lib/console-db-log-filter';
import { logError } from '@/lib/error-logger';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }

  // Captura interna de logs (Neon) para Superadmin.
  // Objetivo: ver warnings/errores sin depender de Vercel Logs.
  // Activación explícita para controlar coste/ruido.
  const enableDbLogs = String(process.env.DB_LOGS_ENABLED || '').toLowerCase() === 'true';
  if (process.env.NEXT_RUNTIME === 'nodejs' && enableDbLogs) {
    installConsoleDbLogger();
    installProcessDbLogger();
  }
}

// Recomendado por Sentry para capturar errores de RSC/anidados en App Router.
export const onRequestError = Sentry.captureRequestError;

type Level = 'error' | 'warning' | 'info';

function safeStringify(value: unknown, maxLen = 4000): string {
  try {
    const seen = new WeakSet<object>();
    const s = JSON.stringify(
      value,
      (_k, v) => {
        if (typeof v === 'bigint') return String(v);
        if (typeof v === 'object' && v !== null) {
          if (seen.has(v as object)) return '[Circular]';
          seen.add(v as object);
        }
        return v;
      },
      2
    );
    if (typeof s !== 'string') return String(value);
    return s.length > maxLen ? s.slice(0, maxLen) + '…(trunc)' : s;
  } catch {
    return String(value);
  }
}

function toMessage(args: unknown[]): string {
  if (!args || args.length === 0) return '';
  if (typeof args[0] === 'string') return String(args[0]);
  if (args[0] instanceof Error) return args[0].message || String(args[0]);
  return safeStringify(args[0]);
}

function buildSignature(level: Level, message: string, extra: unknown): string {
  const base = `${level}|${message || ''}`;
  const extraS = typeof extra === 'string' ? extra : safeStringify(extra, 800);
  return `${base}|${extraS}`.slice(0, 1200);
}

function installConsoleDbLogger() {
  // Rate-limit y dedupe en memoria por instancia.
  // Evita costes altos si hay un loop de logs.
  const WINDOW_MS = 60_000;
  const MAX_PER_SIGNATURE_PER_WINDOW = 10;
  const counters = new Map<string, { t: number; n: number }>();

  const originalError = console.error.bind(console);
  const originalWarn = console.warn.bind(console);

  let inLogger = false;

  async function write(level: Level, args: unknown[]) {
    if (inLogger) return;
    const message = toMessage(args);
    if (!shouldPersistConsoleLogToDb(message)) return;
    const meta = {
      runtime: process.env.NEXT_RUNTIME,
      node_env: process.env.NODE_ENV,
      args: args.map((a) => (a instanceof Error ? { name: a.name, message: a.message, stack: a.stack } : a)),
    };
    const sig = buildSignature(level, message, meta.args?.[0]);
    const now = Date.now();
    const cur = counters.get(sig);
    if (cur && now - cur.t < WINDOW_MS) {
      if (cur.n >= MAX_PER_SIGNATURE_PER_WINDOW) return;
      cur.n += 1;
    } else {
      counters.set(sig, { t: now, n: 1 });
    }

    // Fire-and-forget: no bloquear requests.
    try {
      inLogger = true;
      await logError({
        level: level === 'warning' ? 'warning' : level,
        message: message || '(sin mensaje)',
        error: args.find((a) => a instanceof Error) as any,
        tenantId: null,
        userId: null,
        url: null,
        metadata: {
          source: 'console',
          signature: sig,
          ...meta,
        },
      });
    } finally {
      inLogger = false;
    }
  }

  console.error = (...args: unknown[]) => {
    originalError(...args);
    void write('error', args);
  };
  console.warn = (...args: unknown[]) => {
    originalWarn(...args);
    void write('warning', args);
  };
}

function installProcessDbLogger() {
  let inHandler = false;

  const handle = async (level: Level, err: unknown) => {
    if (inHandler) return;
    try {
      inHandler = true;
      await logError({
        level: level === 'warning' ? 'warning' : level,
        message: level === 'error' ? 'Unhandled server error' : 'Unhandled server warning',
        error: err as any,
        tenantId: null,
        userId: null,
        url: null,
        metadata: {
          source: 'process',
          event: level === 'error' ? 'uncaught' : 'unhandled',
        },
      });
    } finally {
      inHandler = false;
    }
  };

  process.on('unhandledRejection', (reason) => {
    // Node trata esto como warning; lo guardamos como warning.
    void handle('warning', reason);
  });
  process.on('uncaughtException', (error) => {
    void handle('error', error);
  });
}

