# 🤝 Configuración para tu compañero de trabajo

## 📋 Pasos para @andresarrroyoaa

### 1. 📥 Clonar el repositorio
```bash
git clone https://github.com/Arroyador69/delfin-check-in.git
cd delfin-check-in
npm install
```

### 2. ⚙️ Configurar variables de entorno
```bash
# Copiar template
cp env.example.template .env.local

# Editar .env.local con los valores reales
# (Te los pasará @Arroyador69 por mensaje privado)
```

### 3. 🔧 Variables que necesitas (pídelas a @Arroyador69):

```bash
# Base de datos
POSTGRES_URL="postgresql://..."
POSTGRES_PRISMA_URL="postgresql://..."
POSTGRES_URL_NON_POOLING="postgresql://..."

# Autenticación
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# Cache/Sesiones
KV_URL="redis://..."
KV_REST_API_URL="https://..."
KV_REST_API_TOKEN="..."
KV_REST_API_READ_ONLY_TOKEN="..."

# Configuración del establecimiento
ESTABLISHMENT_CODE="0000256653"
ESTABLISHMENT_NAME="Delfín Check-in"
```

### 4. 🎯 Verificar que funciona
```bash
npm run dev
# Debería funcionar en http://localhost:3000
```

### 5. 📚 Leer documentación
- [CONTRIBUTING.md](CONTRIBUTING.md) - Flujo de trabajo
- [README.md](README.md) - Información general
- [GITHUB_SETUP_GUIDE.md](GITHUB_SETUP_GUIDE.md) - Configuración GitHub

### 6. 🔄 Flujo de trabajo diario
```bash
# Siempre antes de empezar
git checkout main
git pull origin main

# Para cada tarea
git checkout -b feature/mi-tarea
# ... hacer cambios ...
git add .
git commit -m "feat: descripción del cambio"
git push origin feature/mi-tarea

# Crear PR en GitHub
# Esperar aprobación de @Arroyador69
# Mergear cuando esté aprobado
```

## 🚨 Importantes recordatorios:

- ✅ **SIEMPRE trabajar en ramas** (nunca push directo a main)
- ✅ **Todos los PRs necesitan aprobación** de @Arroyador69
- ✅ **Seguir las plantillas** de PR e issues
- ✅ **Probar localmente** antes de subir cambios
- ✅ **Mantener .env.local privado** (nunca subirlo al repo)

## 📞 Contacto:
Si tienes dudas, pregunta a @Arroyador69 o crea un issue en GitHub.

---
**¡Bienvenido al equipo! 🎉**
