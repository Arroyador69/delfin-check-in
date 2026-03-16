## 🌊 Flujo profesional: staging vs producción

Esta guía explica cómo trabajar con `staging.delfincheckin.com` y `admin.delfincheckin.com` sin romper a los usuarios.

### 1. Repositorios y dominios

- **Repo core**: `delfin-check-in`
  - Despliegue principal: `admin.delfincheckin.com` (producción).
- **Repo staging**: `staging.delfincheckin.com`
  - Despliegue previo: `staging.delfincheckin.com`.

Ambos apuntan a Vercel, pero **con variables de entorno distintas**.

### 2. Base de datos

- Producción:
  - Proyecto Neon principal (`DATABASE_URL` de producción).
- Staging:
  - Proyecto Neon separado solo para pruebas (`DATABASE_URL` de staging).

Regla de oro: **staging nunca debe apuntar a la base de datos de producción**.

### 3. Flujo de ramas

Recomendado:

1. `main`: código ya en producción.
2. `feat/*`: ramas de nuevas funcionalidades.

Flujo:

1. `git checkout main && git pull`.
2. `git checkout -b feat/nueva-funcionalidad`.
3. Trabajas, haces commits y PR desde `feat/*` hacia `main`.
4. Vercel crea preview para la PR.
5. Cuando está bien:
   - Merge a `main`.
   - Deploy a **staging** (o producción, según configuración actual).

Si quieres un flujo aún más estricto:

- Introducir rama `develop`:
  - PR `feat/*` → `develop` → despliegue en `staging`.
  - Solo cuando está estable: `develop` → `main` → producción.

### 4. Migraciones de base de datos

Pasos seguros:

1. Ejecutar migración SQL primero en **Neon staging**.
2. Probar la funcionalidad nueva en `staging.delfincheckin.com`.
3. Si todo funciona:
   - Ejecutar la misma migración en **Neon producción**.
4. Hacer deploy de la versión que ya has probado.

Nunca mezclar cambios de código que esperan columnas nuevas con bases de datos que aún no tienen esas columnas.

### 5. Cómo trabajar cuando haya clientes reales

Cuando haya usuarios en producción:

- Todas las nuevas features pasan por:
  1. Rama `feat/*`.
  2. PR y revisión (incluida revisión de seguridad con IA si la activas).
  3. Deploy en staging y pruebas manuales.
  4. Solo después, merge a `main` y deploy a producción.

- Para cambios delicados (MIR, pagos, precios):
  - Hacer siempre pruebas con **tenant de pruebas** en staging.
  - Si es posible, activar feature flags para clientes concretos antes de generalizar.

