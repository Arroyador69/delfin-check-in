# 🔍 Cómo Ver Logs de la App - Guía Simplificada

## Opción 1: Safari Web Inspector (Recomendado)

### Paso 1: Activar el menú "Desarrollar" en Safari

1. **Abre Safari** en tu Mac
2. Ve a **Safari > Configuración** (o **Safari > Preferences**)
3. Ve a la pestaña **"Avanzado"** (Advanced)
4. ✅ **Marca la casilla "Mostrar menú Desarrollar en la barra de menús"**
5. Ahora verás el menú **"Desarrollar"** en la barra superior de Safari

### Paso 2: Conectar tu iPhone

1. **Conecta tu iPhone a tu Mac** con cable USB
2. **En tu iPhone:** Ve a `Ajustes > Safari > Avanzado`
3. ✅ **Activa "Inspección Web"**
4. **En Safari (Mac):** Ve a `Desarrollar > [Tu iPhone] > Delfín Check-in (Staging)`
5. Se abrirá una ventana con la consola de desarrollador
6. **Abre la app en tu iPhone** y verás los logs aparecer en tiempo real

---

## Opción 2: Terminal (Si instalaste desde build de EAS)

Si instalaste la app desde un **build de EAS** (no desde Expo Go), necesitas conectarla al servidor de desarrollo:

### Paso 1: Asegúrate de que el servidor está corriendo

```bash
cd "/Users/albertogarciaarroyo/Delfín Check‑in 🐬/delfin-owner-app"
npx expo start --dev-client
```

### Paso 2: Conectar la app al servidor

**IMPORTANTE:** El QR code **NO funciona** si instalaste la app desde un build de EAS. En su lugar:

1. **Asegúrate de que tu iPhone y Mac están en la misma red WiFi**
2. **Abre la app en tu iPhone**
3. **Agita el iPhone** (shake gesture) o **presiona Cmd+D** si estás en simulador
4. Se abrirá el **menú de desarrollo de Expo**
5. Selecciona **"Enter URL manually"** o **"Configure Bundle"**
6. Ingresa la URL que aparece en la terminal (algo como `exp://192.168.x.x:8081`)

**O más fácil:**

1. En la terminal donde corre `expo start`, presiona **`i`** para abrir en simulador iOS
2. O presiona **`a`** para Android
3. Los logs aparecerán directamente en la terminal

---

## Opción 3: Ver logs directamente en la terminal

Si ya tienes el servidor corriendo (`npx expo start --dev-client`):

1. **Abre la app en tu iPhone**
2. **Los logs aparecerán automáticamente en la terminal** donde corre `expo start`
3. Busca mensajes que empiecen con:
   - 🔐 Cargando sesión...
   - 🧭 NavigationHandler...
   - ❌ Error...
   - etc.

---

## 🚨 Si no ves logs en la terminal

Esto significa que la app **no está conectada** al servidor de desarrollo. Esto es normal si instalaste desde un build de EAS.

**Solución:** Necesitas usar **Safari Web Inspector** (Opción 1) o conectar manualmente la app al servidor.

---

## 📋 Resumen Rápido

**Para ver logs AHORA mismo:**

1. ✅ Activa "Desarrollar" en Safari (Safari > Configuración > Avanzado)
2. ✅ Conecta iPhone a Mac con USB
3. ✅ Activa "Inspección Web" en iPhone (Ajustes > Safari > Avanzado)
4. ✅ En Safari: Desarrollar > [iPhone] > [App]
5. ✅ Abre la app en iPhone
6. ✅ Ve los logs en la consola de Safari

**El QR code solo funciona si usas Expo Go, no con builds de EAS.**

