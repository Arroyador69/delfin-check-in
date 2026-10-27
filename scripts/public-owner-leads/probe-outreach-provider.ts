#!/usr/bin/env npx tsx
/**
 * Muestra proveedor outreach resuelto + envía 1 mail de prueba a --to=
 *
 *   npx tsx scripts/public-owner-leads/probe-outreach-provider.ts
 *   npx tsx scripts/public-owner-leads/probe-outreach-provider.ts --to=contacto@delfincheckin.com --send
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

import {
  getOutreachProviderInfo,
  sendOutreachMail,
} from '../../src/lib/public-owner-leads/send-smtp';

async function main() {
  const info = getOutreachProviderInfo();
  console.log(JSON.stringify(info, null, 2));

  const send = process.argv.includes('--send');
  const toIdx = process.argv.indexOf('--to');
  const to =
    (toIdx >= 0 && process.argv[toIdx + 1]) || 'contacto@delfincheckin.com';

  if (!send) {
    console.log('Sin --send: solo diagnóstico. Añade --send para probar 1 email.');
    return;
  }

  const r = await sendOutreachMail({
    to,
    subject: `[probe outreach] ${info.provider} ${new Date().toISOString()}`,
    text: `Probe proveedor=${info.provider}`,
    html: `<p>Probe proveedor=<b>${info.provider}</b></p>`,
  });
  console.log('sent', r);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
