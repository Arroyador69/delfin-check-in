# 🔑 Variables que debes copiar de Vercel y enviar a tu hermano

## 📋 Ve a Vercel → Tu proyecto → Settings → Environment Variables

### Copia estos valores EXACTOS:

```bash
# 1. POSTGRES_URL (completa)
POSTGRES_URL="postgresql://default:XXXX@ep-XXXX.vercel-storage.com:5432/verceldb"

# 2. POSTGRES_PRISMA_URL (completa)  
POSTGRES_PRISMA_URL="postgresql://default:XXXX@ep-XXXX.vercel-storage.com:5432/verceldb?pgbouncer=true&connect_timeout=15"

# 3. POSTGRES_URL_NON_POOLING (completa)
POSTGRES_URL_NON_POOLING="postgresql://default:XXXX@ep-XXXX.vercel-storage.com:5432/verceldb"

# 4. KV_URL (completa)
KV_URL="redis://default:XXXX@XXXX.kv.vercel-storage.com:6379"

# 5. KV_REST_API_URL (completa)
KV_REST_API_URL="https://XXXX.kv.vercel-storage.com"

# 6. KV_REST_API_TOKEN (completa)
KV_REST_API_TOKEN="XXXX"

# 7. KV_REST_API_READ_ONLY_TOKEN (completa)  
KV_REST_API_READ_ONLY_TOKEN="XXXX"

# 8. NEXTAUTH_SECRET (completa)
NEXTAUTH_SECRET="XXXX"
```

## 📱 Cómo enviar a tu hermano:

### ✅ Formas SEGURAS:
1. **WhatsApp privado** - Una variable por mensaje
2. **Telegram privado** - Una variable por mensaje  
3. **Email privado** - Solo entre vosotros
4. **Llamada de voz** - Dictarle las variables
5. **En persona** - Si estáis juntos

### ❌ NUNCA hagas:
- Subir al repositorio de GitHub
- Ponerlas en issues públicos
- Enviar por redes sociales públicas
- Dejarlas en mensajes de grupo

## 📝 Mensaje de ejemplo para enviar:

```
Hola! Aquí tienes las variables para el .env.local:

POSTGRES_URL="postgresql://default:ABC123@ep-xyz.vercel-storage.com:5432/verceldb"

(Envía una por mensaje para mayor seguridad)
```

## ⚠️ Importante:
- Son las MISMAS variables que usas tú
- Con estas puede acceder a las MISMAS bases de datos
- Los cambios que haga se verán reflejados en tu aplicación también
- Mantén estas variables privadas y seguras

---

**Una vez que tu hermano tenga estas variables y siga los pasos, podrá trabajar con las bases de datos exactamente igual que tú! 🎉**
