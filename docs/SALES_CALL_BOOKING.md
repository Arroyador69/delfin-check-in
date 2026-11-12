# Reservas de llamada comercial (Delfín ↔ NFCTap)

## Qué ve el cliente
- Página pública `https://delfincheckin.com/reserva-llamada/` (landing; APIs en admin)
- L–V · 09:00–14:00 y 16:00–19:00 (Europe/Madrid)
- Huecos cada **45 min** (15 llamada + 30 margen), igual que NFCTap; puntualidad estricta
- Formulario: nombre, email, teléfono opcional, comentarios
- **No** se menciona sincronización con ningún otro proyecto

## Env (Vercel)
```
SALES_CALL_MEETING_URL=https://zoom.us/j/XXXX   # enlace fijo Zoom/Meet
SALES_CALL_PEER_URL=https://nfctap.tech         # origen del otro proyecto
SALES_CALL_SYNC_SECRET=mismo_secreto_en_ambos
TELEGRAM_WAITLIST_BOT_TOKEN=...
TELEGRAM_WAITLIST_CHAT_ID=...
```

## Sync entre proyectos
1. Al listar huecos, Delfín pide `GET {PEER}/api/public/sales-calls/peer-busy?from&to` con header `X-Sales-Call-Sync`.
2. Al reservar, Delfín escribe en local y hace `POST` espejo al peer (bloquea el mismo `start_at`).
3. NFCTap debe implementar el mismo contrato (inverso: peer = admin.delfincheckin.com).

## Mails
Cold + FU outreach incluyen CTA sutil «Reservar llamada» → `https://delfincheckin.com/reserva-llamada/?email=&src=`.
Recovery checkout Polar también.

## Telegram
Cada reserva envía aviso con fecha, hora Madrid, nombre, email, comentarios y enlace reunión.
Recordatorio al equipo ~1 h antes. Aviso si el cliente cancela.

## Email al cliente (Zoho/SMTP ya configurado)
1. **Confirmación** al reservar: fecha, Zoom, enlace gestionar (cambiar/cancelar).
2. **Recordatorio ~1 h antes** (cron `/api/cron/sales-call-reminders` cada 15 min).

## Gestionar
`https://delfincheckin.com/reserva-llamada/gestionar/?token=…` → cancelar o cambiar de hora (libera hueco + sync peer).
