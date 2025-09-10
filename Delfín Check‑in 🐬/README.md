# 🐬 Delfín Check-in - Formulario Público

## 📋 Descripción

Formulario de registro de viajeros completamente independiente y público, compatible con el Ministerio del Interior de España. Este formulario se aloja en GitHub Pages y envía los datos directamente al dashboard de Vercel.

## 🚀 Características

- ✅ **100% Público** - Sin autenticación ni login
- ✅ **Formulario Completo** - Todos los campos requeridos por el Ministerio
- ✅ **Envío Directo** - Los datos van directamente a tu dashboard de Vercel
- ✅ **Sin Dependencias** - Solo HTML, CSS y JavaScript básico
- ✅ **Responsive** - Funciona en todos los dispositivos
- ✅ **Validación** - Campos obligatorios marcados con *

## 🌐 Despliegue en GitHub Pages

### 1. Crear Nuevo Repositorio

1. Ve a [GitHub](https://github.com) y crea un nuevo repositorio
2. Nombra el repositorio: `delfin-formulario-publico`
3. Hazlo público (no privado)
4. NO inicialices con README, .gitignore o licencia

### 2. Subir Archivos

```bash
# Clonar el repositorio
git clone https://github.com/TU_USUARIO/delfin-formulario-publico.git
cd delfin-formulario-publico

# Copiar el archivo index.html
# (Ya tienes el archivo creado)

# Hacer commit y push
git add .
git commit -m "Formulario público de registro de viajeros"
git push origin main
```

### 3. Activar GitHub Pages

1. Ve a tu repositorio en GitHub
2. Ve a **Settings** → **Pages**
3. En **Source**, selecciona **Deploy from a branch**
4. En **Branch**, selecciona **main** y **/(root)**
5. Haz clic en **Save**

### 4. URL del Formulario

Tu formulario estará disponible en:
```
https://TU_USUARIO.github.io/delfin-formulario-publico/
```

## 🔗 Conexión con Dashboard

El formulario está configurado para enviar datos a:
- **API**: `https://delfin-check-lcenw4sfh-arroyador69s-projects.vercel.app/api/ministerio/comunicaciones`
- **Dashboard**: `https://delfin-check-lcenw4sfh-arroyador69s-projects.vercel.app/guest-registrations-dashboard`

## 📱 Uso

1. **Acceso Directo**: Los clientes acceden al formulario sin login
2. **Rellenar Datos**: Completan todos los campos obligatorios
3. **Envío Automático**: Los datos se envían a tu API de Vercel
4. **Redirección**: Se abre automáticamente tu dashboard
5. **Generar XML**: Puedes generar XML desde el dashboard

## 🛠️ Personalización

### Cambiar URL de la API

Si cambias la URL de tu dashboard, actualiza estas líneas en `index.html`:

```javascript
// Línea ~400: URL de la API
const response = await fetch('TU_NUEVA_URL_API', {

// Línea ~410: URL del dashboard
window.open('TU_NUEVA_URL_DASHBOARD', '_blank');
```

### Cambiar Estilos

Los estilos están en la sección `<style>` del HTML y usan Tailwind CSS desde CDN.

## 🔒 Seguridad

- **Formulario Público**: Accesible sin autenticación
- **API Protegida**: Solo tu dashboard puede acceder a los datos
- **Validación Cliente**: Campos obligatorios validados antes del envío
- **Redirección Segura**: Los clientes van a tu dashboard protegido

## 📞 Soporte

Si necesitas ayuda o quieres personalizar el formulario, contacta con el administrador del sistema.

---

**🐬 Delfín Check-in - Sistema de Registro de Viajeros**
