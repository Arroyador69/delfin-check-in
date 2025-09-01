# 🐬 Delfín Check-in

Sistema inteligente de gestión de habitaciones y check-in digital para propiedades turísticas.

## ✨ Características

- **Gestión de Habitaciones**: Configuración de URLs iCal para Airbnb y Booking.com
- **Sincronización Automática**: Importación automática de reservas desde múltiples plataformas
- **Check-in Digital**: Formularios digitales para huéspedes
- **Mensajes Automáticos**: Plantillas personalizables para comunicación
- **Tareas de Limpieza**: Gestión de limpieza y mantenimiento
- **Precios Dinámicos**: Reglas de precios inteligentes
- **Notificaciones**: Integración con Telegram y email
- **Dashboard Intuitivo**: Interfaz moderna y responsive

## 🚀 Tecnologías

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL), Redis
- **Integraciones**: iCal, Telegram Bot, Email (SMTP)
- **Deployment**: Vercel, Docker, múltiples plataformas cloud

## 📋 Requisitos Previos

- Node.js 18+ 
- npm o yarn
- Cuenta de Supabase
- Redis (opcional para desarrollo local)

## 🛠️ Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/Arroyador69/delfin-check-in.git
cd delfin-check-in
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
# Copiar archivo de ejemplo
cp env.example .env.local

# Editar .env.local con tus credenciales
```

### 4. Configurar Supabase

1. Ve a [Supabase](https://supabase.com) y crea un proyecto
2. En Settings > API, copia las credenciales:
   - Project URL
   - Anon public key
   - Service role key
3. Actualiza `.env.local` con tus credenciales
4. Ejecuta el schema SQL en el SQL Editor de Supabase:

```bash
# Copiar el schema
cat database/schema.sql
```

### 5. Verificar configuración

```bash
# Verificar que todo esté configurado correctamente
./check-setup.sh
```

### 6. Iniciar el servidor

```bash
npm run dev
```

El servidor estará disponible en: http://localhost:3000

## 🔧 Configuración Rápida

Para una configuración automática, puedes usar los scripts incluidos:

```bash
# Configuración completa automática
./complete-setup.sh

# Solo configuración de entorno
./setup-env.sh

# Solo configuración de Supabase
./configure-supabase.sh
```

## 📊 Estructura del Proyecto

```
delfin-checkin/
├── src/
│   ├── app/                 # Páginas de Next.js App Router
│   │   ├── api/            # API routes
│   │   ├── rooms/          # Gestión de habitaciones
│   │   ├── reservations/   # Vista de reservas
│   │   ├── checkin/        # Check-in digital
│   │   └── settings/       # Configuración
│   ├── components/         # Componentes React
│   └── lib/               # Utilidades y configuraciones
├── database/
│   └── schema.sql         # Esquema de base de datos
├── public/                # Archivos estáticos
└── scripts/              # Scripts de configuración
```

## 🗄️ Base de Datos

El sistema utiliza las siguientes tablas principales:

- **rooms**: Habitaciones y configuración iCal
- **reservations**: Reservas sincronizadas
- **guests**: Datos de huéspedes (check-in digital)
- **messages**: Plantillas de mensajes automáticos
- **cleaning_tasks**: Tareas de limpieza
- **pricing_rules**: Reglas de precios dinámicos

## 🔌 Integraciones

### iCal Sync
- Sincronización automática con Airbnb y Booking.com
- URLs iCal configurables por habitación
- Actualización en tiempo real

### Telegram Bot
- Notificaciones automáticas
- Comandos para gestión rápida
- Plantillas personalizables

### Email
- Notificaciones por email
- Plantillas HTML personalizables
- Configuración SMTP

## 🚀 Deployment

### Vercel (Recomendado)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker

```bash
# Construir imagen
docker build -t delfin-checkin .

# Ejecutar contenedor
docker run -p 3000:3000 delfin-checkin
```

### Otras plataformas

El proyecto incluye configuraciones para:
- Netlify
- Railway
- Render
- Fly.io
- AWS
- Azure

## 🔒 Seguridad

- Variables de entorno para credenciales sensibles
- Validación de datos con Zod
- Autenticación con Supabase Auth
- HTTPS obligatorio en producción

## 📝 Uso

### Gestión de Habitaciones

1. Ve a "Gestionar Habitaciones"
2. Configura URLs iCal de Airbnb y Booking.com
3. Establece precios base
4. Las reservas se sincronizarán automáticamente

### Check-in Digital

1. Los huéspedes reciben enlaces personalizados
2. Completar formulario con datos personales
3. Firma digital y aceptación de normas
4. Notificación automática al propietario

### Mensajes Automáticos

1. Configura plantillas en "Mensajes"
2. Personaliza triggers y canales
3. Variables dinámicas disponibles
4. Programación automática

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🆘 Soporte

Si tienes problemas o preguntas:

1. Revisa la documentación
2. Verifica la configuración con `./check-setup.sh`
3. Abre un issue en GitHub
4. Contacta al equipo de desarrollo

## 🎯 Roadmap

- [ ] Integración con WhatsApp Business API
- [ ] Dashboard de analytics avanzado
- [ ] App móvil nativa
- [ ] Integración con sistemas de limpieza
- [ ] IA para optimización de precios
- [ ] Múltiples idiomas

---

**Desarrollado con ❤️ por el equipo de Delfín Check-in**
# Test deploy sin GitHub Actions - Tue Sep  2 00:20:36 CEST 2025
# Forzar deploy con ESLint desactivado
# Forzar deploy del commit 9993ade
# Forzar nuevo deployment con todas las correcciones
