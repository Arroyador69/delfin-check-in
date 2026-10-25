#!/usr/bin/env npx tsx
import { extractPublicEmailsFromUrl } from '../../src/lib/public-owner-leads/extract-web';

const urls = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      'https://www.penaquente.es',
      'https://www.casaruralarega.com',
      'https://www.lafuentecasarural.com',
      'https://casaruralelmilano.com',
      'https://www.cortijolasenorita.com',
      'https://www.casadelaxe.com',
    ];

async function main() {
  for (const u of urls) {
    const r = await extractPublicEmailsFromUrl(u, 200);
    console.log(
      u,
      '→',
      r.leads.map((l) => l.email),
      r.blocked ? `blocked:${r.error}` : 'ok',
      'disc',
      r.discoveredSources
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
