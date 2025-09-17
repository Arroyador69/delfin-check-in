# 🤝 Guía de Contribución - Delfín Check-in

¡Bienvenido al equipo! Esta guía te ayudará a trabajar de forma eficiente y sin conflictos con el resto del equipo.

## 🚀 Configuración inicial

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
# Copiar el template de variables de entorno
cp env.example.template .env.local

# Editar .env.local con tus valores reales
# NUNCA subas .env.local al repositorio
```

### 4. Instalar Husky (hooks de Git)
```bash
npm run prepare
```

## 🔄 Flujo de trabajo diario

### 1. Antes de empezar a trabajar
```bash
# Asegúrate de estar en main
git checkout main

# Actualiza main con los últimos cambios
git pull origin main
```

### 2. Crear una nueva rama para tu tarea
```bash
# Nombrado de ramas:
# feature/descripcion-corta - para nuevas funcionalidades
# fix/descripcion-del-bug - para corrección de errores
# refactor/area-mejorada - para refactoring
# docs/actualizacion - para documentación

git checkout -b feature/nueva-funcionalidad
```

### 3. Desarrollar y hacer commits
```bash
# Hacer cambios en el código...

# Verificar que todo funciona
npm run dev

# Verificar linting y formato
npm run lint
npm run format:check

# Hacer commit (Husky ejecutará las verificaciones automáticamente)
git add .
git commit -m "feat: descripción clara del cambio"
```

### 4. Antes de subir cambios
```bash
# Actualizar con los últimos cambios de main
git pull --rebase origin main

# Resolver conflictos si los hay
# Verificar que todo sigue funcionando después del rebase
npm run build
```

### 5. Subir cambios y crear PR
```bash
# Subir la rama
git push origin feature/nueva-funcionalidad

# Ir a GitHub y crear un Pull Request
# La plantilla de PR se cargará automáticamente
```

## 📝 Convenciones de commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
tipo(alcance): descripción corta

Descripción más detallada si es necesario

- Cambio 1
- Cambio 2

Fixes #123
```

### Tipos de commit:
- `feat`: Nueva funcionalidad
- `fix`: Corrección de errores
- `docs`: Cambios en documentación
- `style`: Cambios de formato (no afectan funcionalidad)
- `refactor`: Cambios de código que no son features ni fixes
- `test`: Añadir o modificar tests
- `chore`: Tareas de mantenimiento

### Ejemplos:
```bash
git commit -m "feat: add date validation for MIR export"
git commit -m "fix: resolve missing fechaEntrada error in XML generation"
git commit -m "docs: update API documentation for guest registration"
git commit -m "refactor: extract date normalization logic to utility function"
```

## 🔍 Proceso de revisión de código

### Como autor del PR:
1. **Completa la plantilla de PR** con toda la información solicitada
2. **Asigna reviewers** - automático via CODEOWNERS
3. **Verifica que los checks pasan** (CI, linting, build)
4. **Responde a comentarios** de forma constructiva
5. **Haz los cambios solicitados** en commits adicionales
6. **No hagas force push** durante la revisión

### Como revisor:
1. **Revisa el código** buscando:
   - Lógica correcta y eficiente
   - Posibles bugs o edge cases
   - Cumplimiento de estándares
   - Seguridad (especialmente importante en nuestro proyecto)
   - Performance
2. **Prueba los cambios** localmente si es necesario
3. **Deja comentarios constructivos** y específicos
4. **Aprueba o solicita cambios** claramente

## 🚨 Reglas importantes

### ❌ Prohibido:
- Push directo a `main` (está protegida)
- Force push en ramas compartidas
- Commits sin mensaje descriptivo
- Subir archivos `.env` con datos reales
- Mergear PRs sin aprobación
- Ignorar los checks de CI

### ✅ Obligatorio:
- Todos los PRs deben pasar CI
- Al menos 1 aprobación para mergear
- Resolver todas las conversaciones antes de merge
- Probar los cambios localmente
- Actualizar documentación si es necesario

## 🏗️ Estructura del proyecto

```
delfin-checkin/
├── .github/                 # Workflows y templates de GitHub
├── src/
│   ├── app/                 # App Router de Next.js
│   │   ├── api/            # API routes
│   │   │   ├── export/     # Exportación MIR (CRÍTICO)
│   │   │   ├── ministerio/ # APIs del ministerio
│   │   │   └── auth/       # Autenticación
│   │   ├── admin-login/    # Login de administrador
│   │   └── guest-*/        # Registro de huéspedes
│   ├── components/         # Componentes reutilizables
│   ├── lib/               # Utilidades y configuración
│   └── middleware.ts      # Middleware de Next.js
├── database/              # Esquemas de base de datos
└── public/               # Archivos estáticos
```

## 🔐 Consideraciones de seguridad

**⚠️ IMPORTANTE**: Este proyecto maneja datos personales y cumple con regulaciones españolas.

### Siempre verificar:
- No exponer datos personales en logs
- Validar todas las entradas de usuario
- Usar HTTPS en todas las comunicaciones
- No hardcodear secrets en el código
- Sanitizar datos antes de mostrarlos

### Archivos críticos que requieren revisión especial:
- `/src/app/api/export/` - Exportación MIR
- `/src/app/api/ministerio/` - Comunicación con ministerio
- `/src/middleware.ts` - Autenticación
- Cualquier archivo que maneje datos personales

## 🐛 Reportar bugs

1. **Busca primero** si el bug ya está reportado
2. **Usa la plantilla de issue** para bugs
3. **Incluye información completa**:
   - Pasos para reproducir
   - Comportamiento esperado vs actual
   - Screenshots si es visual
   - Información del entorno
   - Logs relevantes (sin datos sensibles)

## ❓ ¿Necesitas ayuda?

1. **Documentación**: Lee este archivo y los READMEs
2. **Issues**: Busca en issues existentes
3. **Slack/Discord**: Pregunta al equipo (si tienes acceso)
4. **Code review**: Pide ayuda en tu PR

## 🎯 Objetivos del equipo

- **Calidad**: Código limpio, testeable y mantenible
- **Seguridad**: Cumplimiento normativo y protección de datos
- **Performance**: Aplicación rápida y eficiente
- **Colaboración**: Trabajo en equipo fluido y sin conflictos
- **Aprendizaje**: Mejora continua y compartir conocimiento

---

**¡Gracias por contribuir a Delfín Check-in! 🐬**
