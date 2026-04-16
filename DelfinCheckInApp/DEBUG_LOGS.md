# 🔍 Guía: Ver Logs y Diagnosticar Errores

## 📱 Métodos para Ver Logs de la App

### Método 1: Terminal con Expo Dev Server (Recomendado)

Si tienes la app instalada desde un build de desarrollo/preview, necesitas conectar el iPhone al servidor de desarrollo:

```bash
# 1. Ve al directorio de la app
cd "/Users/albertogarciaarroyo/Delfín Check‑in 🐬/delfin-owner-app"

# 2. Inicia el servidor de desarrollo
npx expo start --dev-client

# 3. Abre la app en tu iPhone
# Los logs aparecerán automáticamente en la terminal
```

**Nota:** Si instalaste la app desde un build de EAS (no desde Expo Go), necesitas que el iPhone esté en la misma red WiFi que tu Mac.

---

### Método 2: Safari Web Inspector (iOS)

Para ver logs de JavaScript en tiempo real:

1. **Conecta tu iPhone a tu Mac** con un cable USB
2. **En tu iPhone:** Ve a `Ajustes > Safari > Avanzado` y activa **"Inspección Web"**
3. **En tu Mac:** Abre Safari
4. **En Safari:** Ve a `Desarrollar > [Tu iPhone] > [Delfín Check-in (Staging)]`
5. Se abrirá la consola de desarrollador donde verás todos los logs y errores

**Ventajas:**
- ✅ Ve errores de JavaScript en tiempo real
- ✅ Puedes hacer `console.log()` y ver los resultados
- ✅ Ve errores de red (requests fallidos)

---

### Método 3: Xcode Console (Si tienes Xcode)

```bash
# 1. Abre Xcode
# 2. Ve a Window > Devices and Simulators
# 3. Selecciona tu iPhone
# 4. Abre la consola (botón "Open Console")
# 5. Filtra por "Delfín" o "Expo"
```

---

### Método 4: Logs del Sistema iOS

En tu iPhone:

1. Abre la app **Consola** (si la tienes instalada)
2. O usa **Ajustes > Privacidad y Seguridad > Análisis y Mejoras > Datos de Análisis**
3. Busca entradas relacionadas con "Delfín" o "Expo"

---

## 🐛 Problemas Comunes y Soluciones

### Problema: Pantalla en blanco al abrir la app

**Posibles causas:**

1. **Error de JavaScript no capturado**
   - Solución: Ver logs con Safari Web Inspector (Método 2)

2. **Error de conexión a la API**
   - Solución: Verificar que `EXPO_PUBLIC_API_URL` esté configurado correctamente
   - Verificar que el iPhone tenga conexión a internet

3. **Error en el código de inicialización**
   - Solución: Revisar `app/_layout.tsx` y `lib/auth.tsx`

4. **Problema con SecureStore**
   - Solución: Verificar permisos de la app

---

## 🔧 Comandos Útiles para Debugging

### Ver logs en tiempo real mientras usas la app:

```bash
# Terminal 1: Servidor de desarrollo
cd delfin-owner-app
npx expo start --dev-client

# Terminal 2: Logs de Metro bundler
cd delfin-owner-app
npx expo start --dev-client --verbose
```

### Limpiar caché y reinstalar:

```bash
cd delfin-owner-app

# Limpiar caché de Expo
npx expo start --clear

# Limpiar node_modules y reinstalar
rm -rf node_modules
npm install
```

### Verificar configuración:

```bash
# Ver configuración actual
npx expo config

# Ver variables de entorno
echo $EXPO_PUBLIC_API_URL
```

---

## 📋 Checklist de Diagnóstico

Cuando veas una pantalla en blanco, verifica:

- [ ] ¿La app se abre sin cerrarse inmediatamente?
- [ ] ¿Ves algún mensaje de error en la terminal?
- [ ] ¿El iPhone está conectado a internet?
- [ ] ¿La URL de la API es correcta? (`https://admin.delfincheckin.com` o `https://staging.delfincheckin.com`)
- [ ] ¿Hay errores en Safari Web Inspector?
- [ ] ¿El servidor de desarrollo está corriendo?

---

## 🚨 Errores Comunes y Soluciones

### Error: "Network request failed"
- **Causa:** No hay conexión a internet o la URL de la API es incorrecta
- **Solución:** Verificar conexión WiFi/datos y URL en `app.config.ts`

### Error: "Cannot read property 'X' of undefined"
- **Causa:** Error de JavaScript en el código
- **Solución:** Ver logs en Safari Web Inspector para ver la línea exacta

### Error: "SecureStore is not available"
- **Causa:** La app no tiene permisos o está en modo de desarrollo incorrecto
- **Solución:** Verificar que el build sea de desarrollo/preview, no producción

### Pantalla en blanco sin errores
- **Causa:** Error silencioso en el código de inicialización
- **Solución:** Agregar `console.log()` en `app/_layout.tsx` y `lib/auth.tsx` para ver dónde se detiene

---

## 📞 Próximos Pasos

1. **Ejecuta el Método 2 (Safari Web Inspector)** para ver los errores exactos
2. **Copia los errores** que aparezcan en la consola
3. **Compártelos** para poder ayudarte a solucionarlos

