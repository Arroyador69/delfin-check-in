# 🎨 Guía: Crear Icono para App Store

## 📋 Requisitos del Icono

Para App Store (iOS), necesitas:
- **Tamaño:** 1024x1024 píxeles
- **Formato:** PNG
- **Fondo:** Sólido (sin transparencia)
- **Contenido:** Logo de Delfín Check-in centrado

## 🎨 Especificaciones del Logo

Basado en el logo de Delfín Check-in:

### Elementos del Logo:
1. **Delfín:**
   - Delfín estilizado y amigable
   - Color principal: Azul (#1E40AF o similar)
   - Vientre: Azul claro (#60A5FA o similar)
   - Contorno: Azul oscuro (#1E3A8A o similar)

2. **Fondo:**
   - Color sólido: Teal (#0D9488 o #14B8A6)
   - Sin gradientes ni transparencias

3. **Texto (opcional en icono pequeño):**
   - "Delfín Check-In" en dos líneas
   - Fuente: Sans-serif, bold, blanca
   - Solo si es legible a tamaño pequeño

## 🛠️ Opciones para Crear el Icono

### Opción 1: Usar Herramienta Online (Recomendado)

1. **AppIcon.co** (https://www.appicon.co)
   - Sube tu logo en alta resolución
   - Genera automáticamente todos los tamaños
   - Descarga el icono de 1024x1024

2. **MakeAppIcon** (https://www.makeappicon.com)
   - Similar a AppIcon.co
   - Genera assets para iOS y Android

### Opción 2: Crear Manualmente

#### Con Figma/Sketch/Adobe Illustrator:

1. **Crear Canvas:**
   - Tamaño: 1024x1024px
   - Fondo: Teal sólido (#0D9488)

2. **Añadir Delfín:**
   - Centrar el delfín
   - Asegurar que tenga buen contraste con el fondo
   - Dejar espacio alrededor (márgenes de ~10-15%)

3. **Exportar:**
   - Formato: PNG
   - Resolución: 1024x1024px
   - Sin transparencia

#### Con Canva:

1. Crear diseño de 1024x1024px
2. Fondo teal sólido
3. Añadir logo del delfín
4. Exportar como PNG

### Opción 3: Usar el Logo Existente

Si ya tienes el logo en formato vectorial (SVG, AI, etc.):

1. Abre el logo en Illustrator/Figma
2. Crea un canvas de 1024x1024px
3. Coloca el logo centrado
4. Asegura que el fondo sea teal sólido
5. Exporta como PNG a 1024x1024px

## 📁 Ubicación del Archivo

Una vez creado el icono, guárdalo en:

```
delfin-owner-app/assets/icon.png
```

**Reemplaza** el archivo existente con tu nuevo icono.

## ✅ Verificación

Después de crear el icono, verifica:

```bash
cd delfin-owner-app
file assets/icon.png
# Debe mostrar: PNG image data, 1024 x 1024
```

## 🎯 Próximos Pasos

Una vez que tengas el icono:
1. Reemplaza `assets/icon.png`
2. Actualiza `assets/splash.png` para que coincida
3. Ejecuta: `npx eas build -p ios --profile production`

