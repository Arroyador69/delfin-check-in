# 🚀 Compilar para App Store - Guía Rápida

## ⚡ Pasos Rápidos

### 1. Crear el Icono (1024x1024px)

**Opción rápida:**
1. Ve a https://www.appicon.co
2. Sube tu logo de Delfín Check-in
3. Descarga el icono de 1024x1024px
4. Reemplaza `assets/icon.png`

**O crea manualmente:**
- Canvas: 1024x1024px
- Fondo: Teal sólido (#0D9488)
- Logo del delfín centrado
- Exporta como PNG

📖 **Guía completa:** Ver `GUIA_ICONO_APP_STORE.md`

### 2. Verificar Preparación

```bash
cd delfin-owner-app
./scripts/prepare-for-app-store.sh
```

Este script verifica que todo esté listo.

### 3. Compilar

```bash
# Opción 1: Script automatizado
./scripts/build-production.sh

# Opción 2: Comando directo
npx eas build -p ios --profile production
```

### 4. Subir a App Store

```bash
# Automático
eas submit -p ios --profile production

# O manualmente usando Transporter/Xcode
```

## 📋 Checklist Pre-Build

- [ ] Icono creado y reemplazado (`assets/icon.png` - 1024x1024px)
- [ ] Splash screen actualizado (opcional pero recomendado)
- [ ] EAS CLI instalado: `npm install -g eas-cli`
- [ ] Logueado en EAS: `eas login`
- [ ] App creada en App Store Connect
- [ ] Bundle ID configurado: `com.desarroyo.delfinowner`
- [ ] Credenciales de Apple configuradas (si usas submit automático)

## 🎨 Especificaciones del Logo

- **Delfín:** Azul (#1E40AF) con vientre azul claro (#60A5FA)
- **Fondo:** Teal sólido (#0D9488)
- **Tamaño icono:** 1024x1024px PNG
- **Sin transparencia** (fondo sólido requerido)

## 📚 Documentación Completa

- **Icono:** `GUIA_ICONO_APP_STORE.md`
- **Build:** `GUIA_BUILD_APP_STORE.md`
- **Setup inicial:** `SETUP_GUIDE.md`

## 🆘 Problemas Comunes

### "Icon missing"
```bash
# Verifica que el icono existe
file assets/icon.png
# Debe mostrar: PNG image data, 1024 x 1024
```

### "No credentials found"
```bash
eas credentials
```

### "Not logged in"
```bash
eas login
```

## ✅ Listo para Compilar

Una vez que tengas el icono en `assets/icon.png`, ejecuta:

```bash
./scripts/prepare-for-app-store.sh  # Verifica todo
./scripts/build-production.sh        # Compila
```

¡Y listo! 🎉

