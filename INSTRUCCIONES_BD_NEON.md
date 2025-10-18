# 🗄️ Instrucciones para Base de Datos Neon (Vercel)

## 📋 Script SQL para ejecutar en Neon

### 🎯 **Objetivo:**
Sincronizar los estados MIR entre las tablas `guest_registrations` y `mir_comunicaciones` para que el dashboard muestre los estados reales.

### 📝 **Pasos a seguir:**

1. **Acceder a Neon Dashboard:**
   - Ve a [console.neon.tech](https://console.neon.tech)
   - Selecciona tu proyecto
   - Ve a la pestaña "SQL Editor"

2. **Ejecutar el script:**
   - Copia todo el contenido del archivo `scripts/script-bd-neon-vercel.sql`
   - Pégalo en el SQL Editor
   - Haz clic en "Run" o presiona Ctrl+Enter

3. **Verificar resultados:**
   - El script mostrará estadísticas antes y después
   - Verifica que los números de "pendientes" hayan disminuido
   - Los registros de Adil y otros deberían aparecer como "enviado" o "confirmado"

### 🔍 **Qué hace el script:**

1. **Actualiza `guest_registrations`:**
   - Sincroniza el campo `mir_status` con los datos reales de `mir_comunicaciones`
   - Actualiza estados: pendiente → enviado/confirmado según corresponda

2. **Muestra estadísticas:**
   - Total de registros
   - Cantidad por estado (pendientes, enviados, confirmados, errores)

3. **Verifica sincronización:**
   - Compara estados entre ambas tablas
   - Identifica registros desincronizados

### ✅ **Resultado esperado:**

- ✅ El registro de Adil aparecerá como "ENVIADO" o "CONFIRMADO"
- ✅ Los otros registros mostrarán su estado real
- ✅ El dashboard funcionará correctamente
- ✅ Las estadísticas serán precisas

### 🚨 **Si hay errores:**

- Verifica que las tablas `guest_registrations` y `mir_comunicaciones` existan
- Asegúrate de que hay datos en `mir_comunicaciones` para los registros enviados
- Si no hay datos en `mir_comunicaciones`, significa que los registros no se han enviado realmente al MIR

### 📊 **Después de ejecutar el script:**

1. Ve a `https://admin.delfincheckin.com/estado-envios-mir`
2. Haz clic en "Consultar Estado Real MIR" para verificar con el MIR
3. Los estados deberían mostrarse correctamente

### 💡 **Nota importante:**
Este script solo sincroniza los datos existentes. Para consultas en tiempo real con el MIR, usa el botón "Consultar Estado Real MIR" en el dashboard.

