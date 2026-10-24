# CLI: public owner leads

Ver documentación completa: [`docs/growth/PUBLIC_LEADS_PIPELINE.md`](../../docs/growth/PUBLIC_LEADS_PIPELINE.md).

```bash
npm run leads:extract -- --input scripts/public-owner-leads/sample-urls.csv
npm run leads:status
npm run leads:queue -- --limit 25
npm run leads:send -- --dry-run --limit 25
npm run leads:optout -- --email dueño@ejemplo.com
```
