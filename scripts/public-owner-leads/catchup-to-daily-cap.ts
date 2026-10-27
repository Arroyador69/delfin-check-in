#!/usr/bin/env npx tsx
/**
 * Envía hasta HARD_CAP del día (1000) en lotes, con pacing lento para Zoho.
 * Tras cada lote: refill cola a MIN_QUEUED.
 *
 *   npx tsx scripts/public-owner-leads/catchup-to-daily-cap.ts
 *   npx tsx scripts/public-owner-leads/catchup-to-daily-cap.ts --batch 40 --delay 2000
 */
import fs from 'fs';
import path from 'path';

function loadEnvFile(name: string): void {
  const p = path.join(process.cwd(), name);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const eq = t.indexOf('=');
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadEnvFile('.env.outreach.local');
loadEnvFile('.env.local');

import { runDailyPublicOwnerLeads } from '../../src/lib/public-owner-leads/daily-run';
import {
  PUBLIC_OWNER_LEADS_DAILY_HARD_CAP,
  PUBLIC_OWNER_LEADS_MIN_QUEUED,
} from '../../src/lib/public-owner-leads/constants';
import { sql } from '../../src/lib/db';

function argNum(name: string, def: number): number {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) {
    const n = Number(process.argv[i + 1]);
    if (Number.isFinite(n)) return n;
  }
  return def;
}

async function counts() {
  const r = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM public_owner_leads
        WHERE status = 'sent'
          AND sent_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
            AT TIME ZONE 'Europe/Madrid') AS sent_today,
      (SELECT COUNT(*)::int FROM public_owner_leads
        WHERE status = 'queued' AND opted_out = false) AS queued
  `;
  return {
    sentToday: Number(r.rows[0]?.sent_today || 0),
    queued: Number(r.rows[0]?.queued || 0),
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  process.env.PUBLIC_OWNER_LEADS_FLOW = process.env.PUBLIC_OWNER_LEADS_FLOW || 'A+B+C';
  // Nunca cold por Zoho desde este script (usar Resend en prod / CRON).
  if (!process.env.RESEND_API_KEY?.trim() && !process.env.BREVO_API_KEY?.trim()) {
    console.error(
      '[catchup] Falta RESEND_API_KEY (o BREVO). No enviar por Zoho. Usa cron prod ?force=1'
    );
    process.exit(1);
  }
  process.env.OUTREACH_BLOCK_ZOHO = '1';
  const batch = argNum('--batch', 40);
  const pauseBetweenBatchesMs = argNum('--delay', 90_000); // 90s entre lotes (anti Zoho)
  const cap = PUBLIC_OWNER_LEADS_DAILY_HARD_CAP;

  let round = 0;
  let zohoBlocks = 0;

  while (true) {
    const { sentToday, queued } = await counts();
    const remaining = Math.max(0, cap - sentToday);
    console.log(
      JSON.stringify({
        round,
        sentToday,
        queued,
        remaining,
        cap,
        minQueued: PUBLIC_OWNER_LEADS_MIN_QUEUED,
      })
    );

    if (remaining <= 0) {
      console.log('[done] tope diario alcanzado', { sentToday, cap });
      break;
    }

    if (queued < 20) {
      console.log('[stock] cola baja → prepare refill');
      await runDailyPublicOwnerLeads({
        dryRun: false,
        wave: 'prepare',
        maxSend: 0,
        extractLimit: 40,
      });
    }

    const maxSend = Math.min(batch, remaining);
    const result = await runDailyPublicOwnerLeads({
      dryRun: false,
      wave: 'morning',
      maxSend,
      extractLimit: 12,
    });

    const zohoHit = (result.errors || []).some((e) =>
      /Unusual sending activity|550 5\.4\.6/i.test(e)
    );
    console.log(
      JSON.stringify({
        round,
        sent: result.sent,
        failed: result.failed,
        budget: result.budget,
        refill: result.refill,
        zohoHit,
      })
    );

    if (zohoHit) {
      zohoBlocks++;
      // Zoho “Unusual sending activity” suele necesitar 15–30 min de pausa.
      const wait = Math.min(30 * 60_000, 15 * 60_000 * zohoBlocks);
      console.log(`[zoho] rate-limit → espera ${Math.round(wait / 1000)}s (intento ${zohoBlocks})`);
      await sleep(wait);
    } else if (result.sent === 0 && result.failed === 0 && result.budget === 0) {
      console.log('[stop] budget 0 sin progreso');
      break;
    } else {
      zohoBlocks = Math.max(0, zohoBlocks - 1);
      await sleep(pauseBetweenBatchesMs);
    }

    round++;
    if (round > 80) {
      console.error('[stop] demasiadas rondas');
      process.exit(2);
    }
  }

  const final = await counts();
  console.log('[final]', final);
  if (final.sentToday < cap) process.exit(3);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
