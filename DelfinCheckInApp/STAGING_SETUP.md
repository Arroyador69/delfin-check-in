# 🔄 Configuración de Staging para App Móvil

## ¿Necesitas un Repo Separado para Staging?

**Respuesta corta: NO necesariamente.**

## Opciones

### Opción 1: Branches en el mismo repo (Recomendado) ✅

```
Repo: DelfinCheckInApp
├── main branch
│   ├── API_URL: https://admin.delfincheckin.com
│   ├── Bundle ID: com.desarroyo.delfinowner
│   └── → App Store / Play Store
│
└── staging branch
    ├── API_URL: https://staging.delfincheckin.com
    ├── Bundle ID: com.desarroyo.delfinowner.dev
    └── → TestFlight / Internal Testing
```

**Ventajas:**
- Un solo repo, más fácil de mantener
- Cambios se prueban en staging antes de producción
- Mismo código, solo cambia configuración

**Cómo funciona:**
1. Desarrollo en `staging` branch
2. Testing con builds de `staging` branch
3. Merge a `main` cuando esté listo
4. Build de producción desde `main` branch

### Opción 2: Repos separados (No recomendado)

```
Repo 1: DelfinCheckInApp (producción)
Repo 2: DelfinCheckInApp-Staging (staging)
```

**Desventajas:**
- Duplicación de código
- Más difícil mantener sincronizados
- Más complejo

## Configuración Recomendada

### 1. Variables de Entorno por Branch

**En `app.config.ts`:**
```typescript
const isProduction = process.env.EXPO_PUBLIC_ENV === 'production';
const apiUrl = isProduction 
  ? 'https://admin.delfincheckin.com'
  : 'https://staging.delfincheckin.com';
```

### 2. EAS Build Profiles

**En `eas.json`:**
```json
{
  "build": {
    "preview": {
      "env": {
        "EXPO_PUBLIC_ENV": "staging",
        "EXPO_PUBLIC_API_URL": "https://staging.delfincheckin.com"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_ENV": "production",
        "EXPO_PUBLIC_API_URL": "https://admin.delfincheckin.com"
      }
    }
  }
}
```

### 3. Bundle IDs Diferentes

**iOS:**
- Producción: `com.desarroyo.delfinowner`
- Staging: `com.desarroyo.delfinowner.dev`

**Android:**
- Producción: `com.desarroyo.delfinowner`
- Staging: `com.desarroyo.delfinowner.dev`

Esto permite tener ambas apps instaladas al mismo tiempo.

## Flujo de Trabajo

```bash
# 1. Trabajar en staging
git checkout staging
# Hacer cambios
git commit -m "feat: nueva funcionalidad"
git push origin staging

# 2. Build de staging para testing
npx eas build -p ios --profile preview --branch staging

# 3. Cuando esté listo, merge a main
git checkout main
git merge staging
git push origin main

# 4. Build de producción
npx eas build -p ios --profile production --branch main
```

## Conclusión

**Usa branches en el mismo repo** - Es más simple y eficiente. No necesitas repos separados.

