# 🔧 Solución: Crash en macOS/TestFlight

## 🐛 Problema Identificado

La app está crasheando cuando se ejecuta en macOS desde TestFlight. El error es:
- **Error:** `EXC_BAD_ACCESS (SIGSEGV)` - Segmentation fault
- **Ubicación:** Hermes JavaScript engine (`hermes::vm::HadesGC::writeBarrierSlow`)
- **Causa:** Problema de compatibilidad entre React 19, Hermes y Mac Catalyst

## ✅ Solución Aplicada

He actualizado `app.config.ts` para:

1. **Deshabilitar Mac Catalyst** explícitamente
2. **Configurar deployment target** para iOS 13.0+
3. **Asegurar que la app solo funcione en dispositivos iOS reales**

## 🔄 Próximos Pasos

### 1. Compilar Nuevo Build

Después de los cambios, necesitas compilar un nuevo build:

```bash
cd "/Users/albertogarciaarroyo/Delfín Check‑in 🐬/delfin-owner-app"
npx eas build -p ios --profile production
```

### 2. Subir a TestFlight

Una vez compilado, súbelo de nuevo a TestFlight:

```bash
eas submit -p ios --profile production --latest
```

### 3. Probar en Dispositivo iOS Real

**Importante:** Prueba la app en un **iPhone o iPad real**, no en Mac Catalyst. La app está diseñada solo para dispositivos iOS.

## 📱 Notas Importantes

- ✅ La app funcionará correctamente en **iPhone** y **iPad**
- ❌ La app **NO** funcionará en Mac Catalyst (macOS)
- ✅ Esto es normal y esperado para apps móviles nativas

## 🔍 Verificación

Para verificar que el build está correcto:

1. Descarga el `.ipa` del nuevo build
2. Instálalo en un iPhone real (no en Mac)
3. La app debería funcionar sin crashes

## 🆘 Si el Problema Persiste

Si después de estos cambios sigue crasheando:

1. **Verifica que estés probando en un iPhone real**, no en Mac
2. **Revisa los logs** en Xcode o TestFlight
3. **Considera usar React 18** si React 19 sigue causando problemas:
   ```bash
   npm install react@18 react-dom@18
   ```

## 📚 Referencias

- [Expo Build Properties](https://docs.expo.dev/guides/config-plugins/#expo-build-properties)
- [iOS Deployment Target](https://developer.apple.com/documentation/xcode/setting-the-ios-deployment-target)

