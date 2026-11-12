# Contrato sync llamadas · Delfín ↔ NFCTap

## Problema que vimos
- NFCTap reserva en rejilla **45 min** (15 + buffer 30) vía `GET /api/calls/slots`.
- Delfín pedía `GET /api/public/sales-calls/peer-busy` → **404** en NFCTap → no había sync.
- Ejemplo: ocupado en NFCTap **vie 13 · 09:45** no cerraba nada en Delfín (rejilla distinta + sin peer-busy).

## Contrato ideal (ambos)
`SALES_CALL_PEER_URL` + `SALES_CALL_SYNC_SECRET` (igual en ambos).

| Método | Path | Uso |
|--------|------|-----|
| GET | `/api/public/sales-calls/peer-busy?from&to` | Header `X-Sales-Call-Sync`. Body `{ busy: [{ startAt, endAt }] }` |
| POST | mismo | Espejo de reserva: `{ startAt, endAt, remoteId, name?, email?, project }` → `{ ok, id }` |
| DELETE | mismo | Cancelar espejo: `{ remoteId, startAt? }` → `{ ok }` |

- Peer Delfín: `https://admin.delfincheckin.com`
- Peer NFCTap: `https://nfctap.tech`
- Rejilla: L–V, 09–14 y 16–19 Madrid, duración **15**, step **45**.

## Fallback Delfín (ya implementado)
Si peer-busy no responde, Delfín infiere ocupados así:
`expected_grid_45min − GET https://nfctap.tech/api/calls/slots?days=N`

Así una reserva en NFCTap **cierra el mismo hueco** en Delfín aunque aún no exista peer-busy.

## Qué debe hacer el agente NFCTap
1. Exponer `peer-busy` GET/POST/DELETE con el secreto.
2. Al reservar en `/llamar`, `POST` espejo a `admin.delfincheckin.com/api/public/sales-calls/peer-busy`.
3. Al listar huecos, restar busy de Delfín (GET peer-busy o equivalente).
4. Misma rejilla 45 min.
