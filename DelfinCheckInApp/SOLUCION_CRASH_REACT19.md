# 🔧 Solución: Crash en iPhone - React 19 y Hermes

## 🐛 Problema Identificado

La app crashea al iniciar tanto en iPhone como en Mac. El error es:
- **Error:** `EXC_BAD_ACCESS` en `hermes::vm::HadesGC::writeBarrierSlow`
- **Causa:** Incompatibilidad entre React 19.2.0 y Hermes (motor JavaScript de React Native)
- **Ubicación:** Durante la ejecución de `Object.defineProperty` en JavaScript

## ✅ Solución: Downgrade a React 18

React 19 es muy nuevo y tiene problemas de compatibilidad con React Native 0.81.5 y Hermes. La solución es usar React 18 que es más estable.

### Paso 1: Instalar React 18

```bash
cd "/Users/albertogarciaarroyo/Delfín Check‑in 🐬/delfin-owner-app"
npm install react@18.3.1 react-dom@18.3.1 @types/react@18.3.12 --legacy-peer-deps
```

### Paso 2: Verificar Instalación

```bash
npm list react react-dom
```

Deberías ver:
- `react@18.3.1`
- `react-dom@18.3.1`

### Paso 3: Limpiar y Reinstalar

```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Paso 4: Compilar Nuevo Build

```bash
npx eas build -p ios --profile production
```

## 🔍 Verificación

Después del downgrade, verifica:

```bash
npx expo-doctor
```

Debería mostrar que React está en versión 18.x.x

## 📝 Notas

- React 18 es la versión recomendada para React Native 0.81.5
- React 19 aún tiene problemas de compatibilidad con algunas librerías
- Esta solución debería resolver el crash tanto en iPhone como en Mac

## 🚀 Después de Compilar

Una vez compilado con React 18:
1. Prueba en un iPhone real
2. La app debería iniciar correctamente
3. Si sigue crasheando, revisa los logs de Xcode

