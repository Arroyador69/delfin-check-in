# Delfín Check-in 🐬

**Gestión inteligente de habitaciones Airbnb y Booking.com**

Una aplicación SaaS completa para gestionar propiedades turísticas con sincronización automática de calendarios, mensajería automática, check-in digital y precios dinámicos.

## 🚀 Estado Actual del Proyecto

### ✅ **COMPLETADO - Infraestructura Base**

#### **Configuración del Proyecto**
- ✅ Next.js 15 con TypeScript y Tailwind CSS
- ✅ Configuración PWA (Progressive Web App)
- ✅ Estructura de carpetas organizada
- ✅ Configuración de ESLint y TypeScript

#### **Base de Datos**
- ✅ Esquema PostgreSQL completo en Supabase
- ✅ Tablas: rooms, reservations, guests, messages, cleaning_tasks, pricing_rules
- ✅ Triggers y índices optimizados
- ✅ Datos iniciales de ejemplo

#### **Librerías y Dependencias**
- ✅ Supabase para base de datos
- ✅ BullMQ + Redis para colas de trabajo
- ✅ Telegram Bot API para notificaciones
- ✅ iCal para sincronización de calendarios
- ✅ PDFKit para generación de documentos
- ✅ Zod para validación de datos
- ✅ React Hook Form para formularios

#### **Interfaz de Usuario**
- ✅ Dashboard principal con estadísticas
- ✅ Página de gestión de habitaciones
- ✅ Página de check-in digital
- ✅ Página de reservas
- ✅ Página de configuración completa
- ✅ Navegación responsive
- ✅ Diseño moderno y profesional

#### **API Routes**
- ✅ CRUD completo para habitaciones
- ✅ Endpoints para gestión de datos

#### **Despliegue**
- ✅ Configuración Docker y Docker Compose
- ✅ Configuración PM2 para producción
- ✅ Configuraciones para múltiples plataformas:
  - Vercel, Railway, Render, Heroku
  - DigitalOcean, AWS, Google Cloud, Azure
  - Netlify, Fly.io
- ✅ GitHub Actions para CI/CD
- ✅ Nginx como reverse proxy

### 🔄 **EN PROGRESO - Funcionalidades Core**

#### **Sincronización iCal**
- 🔄 Lógica de sincronización implementada
- ⏳ Integración con Airbnb y Booking.com
- ⏳ Polling automático cada 5-10 minutos

#### **Sistema de Mensajería**
- 🔄 Templates de mensajes definidos
- ⏳ Envío automático por email/Telegram
- ⏳ Triggers por eventos de reserva

#### **Check-in Digital**
- 🔄 Formulario de check-in implementado
- ⏳ Generación de PDFs
- ⏳ Firma digital en canvas

### ⏳ **PENDIENTE - Próximas Funcionalidades**

#### **Semana 1 - Funcionalidades Core**
- [ ] **Sincronización iCal completa**
  - [ ] Integración real con Airbnb API
  - [ ] Integración real con Booking.com API
  - [ ] Polling automático configurado
  - [ ] Resolución de conflictos de calendario

- [ ] **Sistema de mensajería automática**
  - [ ] Envío de emails con templates
  - [ ] Notificaciones Telegram automáticas
  - [ ] Triggers por eventos (nueva reserva, T-7 días, etc.)
  - [ ] Gestión de plantillas de mensajes

- [ ] **Check-in digital funcional**
  - [ ] Generación de PDFs con PDFKit
  - [ ] Firma digital en canvas
  - [ ] Almacenamiento de documentos
  - [ ] Exportación para Hacienda

#### **Semana 2 - Automatizaciones**
- [ ] **Precios dinámicos v1**
  - [ ] Reglas básicas de pricing
  - [ ] Panel de configuración
  - [ ] Cálculo automático de precios
  - [ ] Exportación de precios

- [ ] **Sistema de limpieza**
  - [ ] Checklist de limpieza
  - [ ] Notificaciones automáticas
  - [ ] Gestión de turnos
  - [ ] Estado de habitaciones

- [ ] **Exportaciones y reportes**
  - [ ] Reportes mensuales
  - [ ] Exportación CSV/PDF
  - [ ] Datos para Hacienda
  - [ ] Análisis de ocupación

#### **Semana 3 - PWA y Roles**
- [ ] **Funcionalidades PWA completas**
  - [ ] Modo offline
  - [ ] Push notifications
  - [ ] Instalación en móvil
  - [ ] Sincronización offline

- [ ] **Sistema de roles y usuarios**
  - [ ] Autenticación con magic links
  - [ ] Roles: owner, family, cleaner, guest
  - [ ] Permisos por rol
  - [ ] Gestión de usuarios

#### **Semana 4 - Hardening y Testing**
- [ ] **Testing completo**
  - [ ] Tests unitarios
  - [ ] Tests de integración
  - [ ] Tests E2E
  - [ ] Testing con 6 habitaciones reales

- [ ] **Optimización y seguridad**
  - [ ] Optimización de rendimiento
  - [ ] Auditoría de seguridad
  - [ ] Rate limiting
  - [ ] Validación de datos

- [ ] **Página de estado del sistema**
  - [ ] Monitorización de colas
  - [ ] Logs en tiempo real
  - [ ] Métricas de rendimiento
  - [ ] Alertas automáticas

## 🗄️ **Base de Datos - Opciones de Despliegue**

### **Para Uso Personal (Raspberry Pi)**
```bash
# Instalar PostgreSQL en Raspberry Pi
sudo apt update
sudo apt install postgresql postgresql-contrib

# Configurar base de datos
sudo -u postgres createdb delfin_checkin
sudo -u postgres createuser delfin_user
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE delfin_checkin TO delfin_user;"

# Configurar variables de entorno
DATABASE_URL=postgresql://delfin_user:password@raspberry-pi-ip:5432/delfin_checkin
```

**Ventajas:**
- ✅ Control total de datos
- ✅ Sin costos mensuales
- ✅ Privacidad completa
- ✅ Sin límites de uso

**Desventajas:**
- ❌ Requiere mantenimiento
- ❌ Dependencia de conexión a internet
- ❌ Backup manual necesario

### **Para SaaS Comercial (Servicios Online)**

#### **Opción 1: Supabase (Recomendado)**
```bash
# Crear proyecto en Supabase
# Obtener URL y claves de la consola
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Ventajas:**
- ✅ Fácil de configurar
- ✅ Escalable automáticamente
- ✅ Backup automático
- ✅ Panel de administración
- ✅ API REST y GraphQL

#### **Opción 2: PlanetScale**
```bash
# Base de datos MySQL compatible con PostgreSQL
DATABASE_URL=mysql://user:password@host:3306/delfin_checkin
```

#### **Opción 3: Neon (PostgreSQL Serverless)**
```bash
# PostgreSQL serverless
DATABASE_URL=postgresql://user:password@host:5432/delfin_checkin
```

## 🚀 **Instalación y Configuración**

### **Prerrequisitos**
- Node.js 18+ 
- npm o yarn
- Redis (para colas de trabajo)
- PostgreSQL (Supabase recomendado)

### **Instalación Local**

1. **Clonar el repositorio**
```bash
git clone https://github.com/tu-usuario/delfin-checkin.git
cd delfin-checkin
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp env.example .env.local
# Editar .env.local con tus credenciales
```

4. **Configurar base de datos**
```bash
# Ejecutar el esquema SQL en tu base de datos
psql -h your-host -U your-user -d your-database -f database/schema.sql
```

5. **Iniciar Redis**
```bash
# Instalar Redis localmente o usar Docker
docker run -d -p 6379:6379 redis:alpine
```

6. **Ejecutar la aplicación**
```bash
# Terminal 1: Aplicación principal
npm run dev

# Terminal 2: Worker para colas de trabajo
npm run dev:worker

# O ambos juntos
npm run dev:all
```

### **Configuración de Servicios**

#### **1. Supabase**
1. Crear cuenta en [supabase.com](https://supabase.com)
2. Crear nuevo proyecto
3. Ejecutar el esquema SQL desde `database/schema.sql`
4. Obtener URL y claves de la configuración del proyecto

#### **2. Telegram Bot**
1. Hablar con [@BotFather](https://t.me/botfather) en Telegram
2. Crear nuevo bot con `/newbot`
3. Obtener token del bot
4. Obtener Chat ID con [@userinfobot](https://t.me/userinfobot)

#### **3. Redis**
```bash
# Opción 1: Redis local
brew install redis  # macOS
sudo apt install redis-server  # Ubuntu

# Opción 2: Redis Cloud
# Crear cuenta en redis.com y obtener URL de conexión
```

## 📱 **Características PWA**

- **Instalación en móvil**: Añadir a pantalla de inicio
- **Modo offline**: Funcionalidad básica sin conexión
- **Push notifications**: Notificaciones automáticas
- **Sincronización**: Datos sincronizados cuando hay conexión

## 🔒 **Seguridad**

- **Autenticación**: Magic links sin contraseñas
- **Autorización**: Roles y permisos granulares
- **Cifrado**: Datos cifrados en reposo y tránsito
- **Validación**: Zod para validación de datos
- **Rate limiting**: Protección contra ataques

## 🚀 **Despliegue**

### **Opción 1: Vercel (Más Fácil)**
```bash
npm install -g vercel
vercel
```

### **Opción 2: Docker**
```bash
docker-compose up -d
```

### **Opción 3: Servidor VPS**
```bash
# Usar PM2 para producción
npm run build
pm2 start ecosystem.config.js
```

## 📊 **Roadmap Comercial**

### **Fase 1: MVP Personal (4 semanas)**
- ✅ Infraestructura base
- 🔄 Funcionalidades core
- ⏳ Testing con 6 habitaciones

### **Fase 2: SaaS Beta (8 semanas)**
- [ ] Multi-tenancy
- [ ] Panel de administración
- [ ] Facturación con Stripe
- [ ] Soporte multi-idioma

### **Fase 3: SaaS Comercial (12 semanas)**
- [ ] API pública
- [ ] Integraciones avanzadas
- [ ] Analytics y reportes
- [ ] App móvil nativa

## 🤝 **Contribución**

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 **Licencia**

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🆘 **Soporte**

- **Documentación**: [docs.delfin-checkin.com](https://docs.delfin-checkin.com)
- **Email**: soporte@delfin-checkin.com
- **Telegram**: [@delfin_checkin_support](https://t.me/delfin_checkin_support)

## 🎯 **Próximos Pasos Inmediatos**

1. **Configurar Supabase** con el esquema de base de datos
2. **Configurar Telegram Bot** para notificaciones
3. **Probar la aplicación** con datos de ejemplo
4. **Implementar sincronización iCal** con Airbnb/Booking.com
5. **Configurar sistema de mensajería** automática

---

**¡Delfín Check-in está listo para revolucionar la gestión de propiedades turísticas! 🐬✨**
