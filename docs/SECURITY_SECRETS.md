# Secretos y variables de entorno

## Dónde van los secretos

| Entorno | Dónde configurar |
|---------|------------------|
| Producción / Preview | [Vercel](https://vercel.com) → proyecto → **Settings → Environment Variables** |
| Local | `.env.local` (gitignored), nunca commitear |

## Qué no debe estar en GitHub

- `.env`, `.env.local`, `.env.security`
- `JWT_SECRET`, `ADMIN_SECRET_HASH` con valores reales
- Claves `sk_*`, `pk_*` de Stripe (secret), `OPENAI_API_KEY`, URLs Postgres con contraseña
- Certificados privados (`.key`, `.p12` con clave privada)

El archivo `certs/ACCOMP.pem` es el certificado intermedio FNMT **público** (TLS MIR); no es un secreto.

## Rotar JWT tras exposición en Git

Si `JWT_SECRET` llegó a estar en el historial del repositorio:

1. Genera valores nuevos: `npx ts-node scripts/generate-hash.ts '<nueva_contraseña_admin>'`
2. En Vercel, actualiza **JWT_SECRET** y **ADMIN_SECRET_HASH** en Production (y Preview si aplica).
3. Redeploy del proyecto.
4. Todos los usuarios deberán volver a iniciar sesión (tokens antiguos invalidados).
5. Opcional: purgar el archivo del historial de Git con `git filter-repo` (requiere force-push coordinado).

## Endpoints de diagnóstico

En producción, `/api/debug/*`, `/api/audit-mir-config`, `/api/audit-pablo`, etc. responden **404** salvo `DELFIN_ALLOW_DEBUG_ROUTES=true` (solo emergencias).
