# 🐕 Configuración de Husky - Git Hooks

Husky nos permite ejecutar scripts automáticamente antes de commits y push, asegurando que el código siempre esté limpio.

## 📦 Instalación (solo una vez por desarrollador)

### 1. Instalar Husky y dependencias
```bash
npm install --save-dev husky lint-staged prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

### 2. Inicializar Husky
```bash
npm run prepare
```

### 3. Crear hooks de pre-commit
```bash
npx husky add .husky/pre-commit "npm run pre-commit"
```

### 4. Crear hook de pre-push (opcional)
```bash
npx husky add .husky/pre-push "npm run type-check && npm run build"
```

### 5. Verificar que funciona
```bash
# Hacer un cambio pequeño
echo "// Test" >> src/test.js

# Intentar commit - debería ejecutar linting automáticamente
git add .
git commit -m "test: verificar husky"

# Limpiar
rm src/test.js
git reset --soft HEAD~1
```

## ⚙️ ¿Qué hace cada hook?

### Pre-commit:
- ✅ Ejecuta ESLint y corrige errores automáticamente
- ✅ Formatea el código con Prettier
- ✅ Solo en archivos que están en staging (modificados)
- ❌ Bloquea el commit si hay errores que no se pueden corregir automáticamente

### Pre-push (opcional):
- ✅ Verifica tipos de TypeScript
- ✅ Hace build del proyecto
- ❌ Bloquea el push si hay errores

## 🚨 Solución de problemas

### "Husky command not found"
```bash
# Reinstalar husky
npm install husky --save-dev
npm run prepare
```

### "Permission denied"
```bash
# Dar permisos a los hooks
chmod +x .husky/pre-commit
chmod +x .husky/pre-push
```

### "Hooks no se ejecutan"
```bash
# Verificar que git hooks están habilitados
git config core.hooksPath .husky
```

### "Quiero saltarme los hooks temporalmente"
```bash
# Solo en casos excepcionales
git commit --no-verify -m "mensaje"
git push --no-verify
```

## 📋 Configuración recomendada en .eslintrc.json

```json
{
  "extends": ["next/core-web-vitals"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "prefer-const": "error",
    "no-console": "warn"
  }
}
```

## 📋 Configuración recomendada en .prettierrc

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

---

**Una vez configurado, Husky se ejecutará automáticamente en cada commit, manteniendo el código limpio y consistente en todo el equipo. 🎉**
