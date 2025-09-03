# Delfín Check-in 🐬

Sistema de gestión de check-in para hoteles y alojamientos turísticos.

## 🚀 **DEPLOYMENT FORZADO - TIMESTAMP: 2024-12-19 15:30**

## 🔒 **SISTEMA DE AUTENTICACIÓN TOTALMENTE PROTEGIDO**

### **📋 Configuración de Subdominios:**
- **GitHub Pages**: `form.delfincheckin.com` (formulario público)
- **Vercel**: `admin.delfincheckin.com` (dashboard protegido)

### **🛡️ Protección del Dashboard:**
- **Middleware Next.js**: Bloquea todas las rutas del admin
- **Redirección automática**: A `/admin-login` para autenticación
- **Credenciales**: `admin` / `Cuaderno2314`

### **🌐 Formulario Público:**
- **Acceso libre**: Sin autenticación requerida
- **Envío de datos**: A APIs de Vercel
- **Multi-idioma**: Español, Inglés, Francés

## 🚀 **FORZANDO DEPLOYMENT EN VERCEL - 2024-12-19 15:35**

## 🔒 **Seguridad:**
- **Acceso restringido** solo para administradores autorizados
- **Sesión activa** por 24 horas
- **Cookies seguras** con SameSite=Strict
- **Middleware robusto** que bloquea desde el servidor

---

**🐬 Delfín Check-in - Sistema de Registro de Viajeros**
