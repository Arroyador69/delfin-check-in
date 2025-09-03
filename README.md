# 🐬 Delfín Check-in - Sistema de Gestión de Habitaciones

## 🔒 **SISTEMA DE AUTENTICACIÓN TOTALMENTE PROTEGIDO**

### **🛡️ Protección Implementada:**
- ✅ **Middleware de Next.js** → Bloquea TODAS las rutas del admin
- ✅ **AdminLayout Component** → Protege TODAS las páginas del admin  
- ✅ **Página de Login Nativa** → `/admin-login` (no HTML estático)
- ✅ **Redirección Automática** → Cualquier ruta → login
- ✅ **Protección Doble** → Middleware + Componente

### **🔐 Credenciales de Acceso:**
- **Usuario**: `admin`
- **Contraseña**: `Cuaderno2314`

### **🚫 Páginas Completamente Bloqueadas:**
- `/` (Dashboard principal)
- `/guest-registrations-dashboard`
- `/reservations`
- `/rooms`
- `/settings`
- `/partes`
- `/messages`
- `/checkin`
- `/guest-registration`
- **CUALQUIER otra ruta del admin**

### **✅ Solo Accesible:**
- `/admin-login` → Página de login nativa
- `/api/*` → APIs para recibir datos del formulario

## 🚀 **Despliegue:**
- **GitHub**: `form.delfincheckin.com` (formulario público)
- **Vercel**: `admin.delfincheckin.com` (dashboard protegido)

## 🔒 **Seguridad:**
- **Acceso restringido** solo para administradores autorizados
- **Sesión activa** por 24 horas
- **Cookies seguras** con SameSite=Strict
- **Middleware robusto** que bloquea desde el servidor

---

**🐬 Delfín Check-in - Sistema de Registro de Viajeros**
