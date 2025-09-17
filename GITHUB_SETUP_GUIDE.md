# 🚀 Guía Paso a Paso - Configuración GitHub para Colaboración

## ✅ Completado - Archivos subidos al repositorio

Todos los archivos de configuración han sido subidos exitosamente:
- ✅ `.github/workflows/ci.yml` - Pipeline CI/CD
- ✅ `.github/CODEOWNERS` - Revisiones automáticas
- ✅ `.github/pull_request_template.md` - Plantilla de PR
- ✅ `.github/ISSUE_TEMPLATE/` - Plantillas de issues
- ✅ `CONTRIBUTING.md` - Guía de contribución
- ✅ `README.md` actualizado
- ✅ Scripts npm mejorados
- ✅ Configuración de Prettier y linting

---

## 🔧 Pasos que DEBES hacer en GitHub (Web)

### 1. 👥 Invitar a tu compañero al repositorio

1. Ve a tu repo: https://github.com/Arroyador69/delfin-check-in
2. Click en **Settings** (pestaña superior)
3. En el menú lateral: **Collaborators and teams**
4. Click **Add people**
5. Escribe el usuario de GitHub de tu compañero
6. Selecciona **Write** como rol
7. Click **Add [usuario] to this repository**

### 2. 🛡️ Configurar protección de rama main

1. En **Settings** → **Branches** (menú lateral)
2. Click **Add branch protection rule**
3. En **Branch name pattern** escribe: `main`
4. Marca las siguientes opciones:

   **✅ Require a pull request before merging**
   - Required number of reviewers: `1`
   - ✅ Dismiss stale PR approvals when new commits are pushed
   - ✅ Require review from code owners

   **✅ Require status checks to pass before merging**
   - ✅ Require branches to be up to date before merging
   - En "Status checks that are required to pass":
     - Cuando aparezcan (después del primer PR), seleccionar:
     - `CI / ci (ubuntu-latest, 18.x)`
     - `CI / ci (ubuntu-latest, 20.x)`
     - `CI / security`

   **✅ Require conversation resolution before merging**
   
   **✅ Restrict pushes that create files larger than 100 MB**
   
   **En "Restrictions":**
   - ✅ Restrict pushes to matching branches
   - NO marcar "Allow force pushes" 
   - NO marcar "Allow deletions"

5. Click **Create** para guardar

### 3. 🔍 Verificar que Vercel está conectado para Previews

1. Ve a tu dashboard de Vercel: https://vercel.com/dashboard
2. Busca el proyecto `delfin-check-in`
3. Click en **Settings**
4. En **Git** verificar:
   - ✅ Repository: `Arroyador69/delfin-check-in`
   - ✅ Production Branch: `main`
   - ✅ Preview Deployments: `Enabled`

### 4. 📝 Actualizar CODEOWNERS con tu compañero

1. Ve al archivo `.github/CODEOWNERS` en GitHub
2. Click el ícono de lápiz (Edit)
3. Reemplaza algunas líneas `@Arroyador69` con el usuario de tu compañero:

```bash
# Ejemplo - reemplaza "usuario-compañero" con el usuario real
/src/components/ @Arroyador69 @usuario-compañero
/src/app/dashboard/ @usuario-compañero
/src/app/guest-registration/ @usuario-compañero
```

4. Commit directamente a main (solo esta vez)

---

## 🎯 ¿Cómo verificar que todo funciona?

### Test 1: Crear un PR de prueba
```bash
# Tu compañero puede hacer esto:
git checkout -b test/verificar-setup
echo "// Test colaboración" >> src/test.js
git add .
git commit -m "test: verificar setup de colaboración"
git push origin test/verificar-setup
```

1. Ir a GitHub y crear PR
2. Verificar que:
   - ✅ La plantilla de PR se carga automáticamente
   - ✅ Los checks de CI se ejecutan
   - ✅ Te aparece como reviewer requerido (CODEOWNERS)
   - ✅ No se puede mergear sin aprobación

### Test 2: Verificar Vercel Preview
1. En el PR, esperar 1-2 minutos
2. Debería aparecer un comentario de Vercel con:
   - 🔗 Preview URL
   - ✅ Deploy successful

### Test 3: Verificar protección de main
```bash
# Esto debería fallar:
git checkout main
git push origin main
# Error: "protected branch hook declined"
```

---

## 🚦 Estados de los checks CI

Después del primer PR, verás estos checks:

- **CI / ci (ubuntu-latest, 18.x)** - Tests en Node 18
- **CI / ci (ubuntu-latest, 20.x)** - Tests en Node 20  
- **CI / security** - Audit de seguridad
- **CI / lighthouse** - Performance check
- **Vercel** - Preview deployment

---

## 📋 Flujo diario recomendado

### Para cualquier tarea:
```bash
# 1. Actualizar main
git checkout main
git pull origin main

# 2. Crear rama para la tarea
git checkout -b feature/descripcion-corta

# 3. Desarrollar y commitear
# ... hacer cambios ...
git add .
git commit -m "feat: descripción del cambio"

# 4. Subir y crear PR
git push origin feature/descripcion-corta
# Ir a GitHub y crear PR
```

### Para revisar PRs:
1. Leer la descripción completa
2. Revisar el código línea por línea
3. Probar la Preview URL si es necesario
4. Dejar comentarios constructivos
5. Aprobar o solicitar cambios
6. El autor puede mergear después de aprobación

---

## 🆘 Problemas comunes y soluciones

### "Required status check is not passing"
- Esperar a que terminen todos los checks
- Si fallan, revisar los logs en la pestaña "Checks"
- Corregir errores y hacer push adicional

### "Review required from code owner"
- El owner asignado debe aprobar el PR
- Verificar el archivo CODEOWNERS

### "Branch is out of date"
```bash
git checkout main
git pull origin main
git checkout tu-rama
git rebase main
git push --force-with-lease origin tu-rama
```

### Vercel Preview no aparece
- Verificar conexión en Vercel dashboard
- Puede tardar 2-3 minutos en la primera vez

---

## 🎉 ¡Listo para colaborar!

Una vez completados estos pasos:

✅ **Tu compañero puede trabajar sin pisaros**  
✅ **Cada cambio se revisa automáticamente**  
✅ **CI/CD protege la calidad del código**  
✅ **Previews automáticos para cada PR**  
✅ **Main siempre estable y protegida**

**¡El setup profesional está completo! 🚀**
