# Delfín Check-in 🐬

Sistema completo de gestión hotelera con registro oficial de viajeros para cumplimiento del Ministerio del Interior español.

[![CI/CD](https://github.com/Arroyador69/delfin-check-in/actions/workflows/ci.yml/badge.svg)](https://github.com/Arroyador69/delfin-check-in/actions/workflows/ci.yml)
[![Vercel](https://img.shields.io/badge/deployed%20on-Vercel-black?logo=vercel)](https://admin.delfincheckin.com)
[![Next.js](https://img.shields.io/badge/Next.js-15.4.6-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)

## 🚀 Inicio rápido para desarrolladores

### Prerrequisitos
- Node.js 18+ y npm
- Base de datos PostgreSQL (Vercel Postgres recomendado)
- Cuenta de Vercel para despliegue

### Configuración local
```bash
# Clonar repositorio
git clone https://github.com/Arroyador69/delfin-check-in.git
cd delfin-check-in

# Instalar dependencias
npm install

# Configurar variables de entorno
cp env.example.template .env.local
# Editar .env.local con tus valores

# Ejecutar en desarrollo
npm run dev
```

### Configurar Husky (hooks de Git)
```bash
npm run prepare
npx husky add .husky/pre-commit "npm run pre-commit"
```

## 👥 Colaboración

Este proyecto sigue un flujo de trabajo profesional con:

- ✅ **Pull Requests obligatorios** - No push directo a main
- ✅ **Revisiones de código** - Al menos 1 aprobación requerida  
- ✅ **CI/CD automatizado** - Tests, linting y build en cada PR
- ✅ **Previews automáticos** - Vercel despliega cada PR automáticamente
- ✅ **Hooks de Git** - Linting y formato automático en commits

**📖 [Lee la guía de contribución](CONTRIBUTING.md)** para el flujo completo.

## 🏗️ Arquitectura

### Frontend (Next.js 15)
- **App Router** con TypeScript
- **Tailwind CSS** para estilos
- **Server Components** para performance
- **Middleware** para autenticación

### Backend
- **API Routes** de Next.js
- **Vercel Postgres** para persistencia
- **Vercel KV** para caché y sesiones
- **Zod** para validación de datos

### Despliegue
- **Vercel** para hosting y CI/CD
- **GitHub Actions** para testing
- **Branch protection** en main
- **Automatic previews** en PRs

## 🔒 Seguridad y Cumplimiento

### Configuración de Subdominios:
- **GitHub Pages**: `form.delfincheckin.com` (formulario público)
- **Vercel**: `admin.delfincheckin.com` (dashboard protegido)

### Protección del Dashboard:
- **Middleware Next.js**: Bloquea todas las rutas del admin
- **Redirección automática**: A `/admin-login` para autenticación
- **Sesión activa**: Por 24 horas con cookies seguras

### Cumplimiento Legal:
- **Ley 4/2015** de Protección de Seguridad Ciudadana
- **Formato MIR** para comunicación con Ministerio del Interior
- **Validación exhaustiva** de datos personales
- **Exportación XML** compatible con sistemas oficiales

## 📋 Funcionalidades

### Para Administradores:
- ✅ Dashboard completo de registros
- ✅ Exportación XML MIR individual y masiva
- ✅ Gestión de habitaciones y reservas
- ✅ Comunicación automática con Ministerio
- ✅ Reportes y estadísticas

### Para Huéspedes:
- ✅ Formulario público multiidioma
- ✅ Registro digital de documentos
- ✅ Validación en tiempo real
- ✅ Interfaz responsive y accesible

### Para Desarrolladores:
- ✅ API REST completa
- ✅ Documentación automática
- ✅ Testing automatizado
- ✅ Monitoreo y logging
- ✅ Deployment automático

## 🛠️ Scripts disponibles

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo
npm run build           # Build de producción
npm run start           # Servidor de producción

# Calidad de código
npm run lint            # Linting con ESLint
npm run lint:fix        # Fix automático de linting
npm run format          # Formatear con Prettier
npm run format:check    # Verificar formato
npm run type-check      # Verificar tipos TypeScript

# Testing y análisis
npm run test            # Ejecutar tests
npm run analyze         # Análisis de bundle
npm run clean           # Limpiar archivos build
```

## 🔧 Variables de entorno

Copia `env.example.template` a `.env.local` y configura:

```bash
# Base de datos
POSTGRES_URL="postgresql://..."

# Autenticación
NEXTAUTH_SECRET="tu-secreto-seguro"
NEXTAUTH_URL="http://localhost:3000"

# Cache/Sesiones
KV_URL="redis://..."
KV_REST_API_URL="https://..."
KV_REST_API_TOKEN="..."

# Configuración del establecimiento
ESTABLISHMENT_CODE="0000256653"
ESTABLISHMENT_NAME="Delfín Check-in"
```

## 🚀 Despliegue

### Automático (Recomendado):
1. Push a `main` → Despliegue automático a producción
2. PR a `main` → Preview automático en Vercel
3. Merge PR → Despliegue a producción

### Manual:
```bash
# Build local
npm run build

# Deploy a Vercel
npx vercel --prod
```

## 📊 Monitoreo

- **Vercel Analytics** para performance
- **Error tracking** con logs detallados
- **Health checks** automáticos
- **Uptime monitoring** 24/7

## 🤝 Contribuir

1. **Fork** el repositorio
2. **Crea** una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. **Commit** tus cambios (`git commit -m 'feat: add amazing feature'`)
4. **Push** a la rama (`git push origin feature/amazing-feature`)
5. **Abre** un Pull Request

**📖 [Guía completa de contribución](CONTRIBUTING.md)**

## 📝 Licencia

Este proyecto es propietario y está protegido por derechos de autor.

## 🆘 Soporte

- **Issues**: [GitHub Issues](https://github.com/Arroyador69/delfin-check-in/issues)
- **Documentación**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **Email**: contacto@delfincheckin.com

---

**🐬 Desarrollado con ❤️ para la industria hotelera española**# Force deploy Wed Oct 15 13:36:05 CEST 2025
