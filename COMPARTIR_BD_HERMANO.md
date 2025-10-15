# 🤝 Compartir Base de Datos con tu Hermano (GRATIS)

## 🎯 Objetivo
Que tu hermano pueda trabajar con las mismas bases de datos SQL sin coste adicional.

## 📋 Opción 1: Variables de entorno compartidas (RECOMENDADO)

### Para tu hermano - Setup completo:

```bash
# 1. Clonar repositorio
git clone https://github.com/Arroyador69/delfin-check-in.git
cd delfin-check-in
npm install

# 2. Crear .env.local con las MISMAS variables que tú usas
cp env.example.template .env.local
```

### Variables que debes compartir (por WhatsApp/privado):

```bash
# Base de datos Neon (LAS MISMAS que usas tú)
POSTGRES_URL="postgresql://usuario:password@ep-xxxxx.neon.tech/database"
POSTGRES_PRISMA_URL="postgresql://usuario:password@ep-xxxxx.neon.tech/database?pgbouncer=true&connect_timeout=15"
POSTGRES_URL_NON_POOLING="postgresql://usuario:password@ep-xxxxx.neon.tech/database"

# Cache/Sesiones (LAS MISMAS que usas tú)
KV_URL="redis://default:ABC123@abc-xyz.kv.vercel-storage.com:6379"
KV_REST_API_URL="https://abc-xyz.kv.vercel-storage.com"
KV_REST_API_TOKEN="ABC123..."
KV_REST_API_READ_ONLY_TOKEN="ABC123..."

# Autenticación
NEXTAUTH_SECRET="el-mismo-secreto-que-usas-tu"
NEXTAUTH_URL="http://localhost:3000"

# Configuración
ESTABLISHMENT_CODE="0000256653"
ESTABLISHMENT_NAME="Delfín Check-in"
```

## ✅ Ventajas de esta opción:

- 🆓 **Completamente GRATIS**
- 🗄️ **Mismas bases de datos** - cambios se ven en ambos lados
- 🔄 **Sincronización automática** - trabajan con los mismos datos
- 🚀 **Setup en 5 minutos**
- 🛡️ **Seguro** - solo variables de entorno, no acceso a Vercel dashboard

## ⚠️ Consideraciones importantes:

### ✅ LO QUE SÍ PUEDE hacer tu hermano:
- Ver y modificar datos en las bases de datos
- Ejecutar queries SQL
- Probar la aplicación localmente
- Desarrollar nuevas funcionalidades
- Hacer commits y PRs

### ❌ LO QUE NO puede hacer:
- Hacer deployments a producción
- Ver métricas de Vercel
- Cambiar configuración de producción
- Ver logs de producción

## 🔧 Verificar que funciona:

```bash
# Tu hermano ejecuta:
npm run dev

# Debería funcionar en http://localhost:3000
# Y conectar a las MISMAS bases de datos que tú
```

## 📋 Opción 2: Invitación a proyecto Vercel (también gratis)

Si quieres que tenga acceso completo:

1. **Vercel Dashboard** → **Tu proyecto**
2. **Settings** → **Members** 
3. **Invite** → Email de tu hermano
4. **Role: Developer**

**Esto también es GRATIS** para proyectos individuales.

## 🎯 ¿Cuál elegir?

### **Opción 1 (Variables compartidas)** si:
- ✅ Solo quieres que desarrolle localmente
- ✅ Mantienes control total del deploy
- ✅ Máxima simplicidad

### **Opción 2 (Invitación Vercel)** si:
- ✅ Quieres que pueda hacer deploys
- ✅ Quieres que vea métricas y logs
- ✅ Colaboración más completa

## 🚨 Seguridad:

- 🔐 **Nunca subir .env.local** al repositorio
- 💬 **Compartir variables por mensaje privado**
- 🔄 **Cambiar secretos si es necesario**

---

**¡Con cualquiera de las dos opciones puede trabajar con tus bases de datos SIN COSTE! 🎉**
