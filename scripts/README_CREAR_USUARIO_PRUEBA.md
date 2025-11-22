# Crear Usuario de Prueba para AppConnect

Este script crea un usuario de prueba en la base de datos para que el equipo de AppConnect pueda probar la aplicación móvil.

## Dos opciones disponibles

### Opción A: Script directo a base de datos (Recomendado)

Crea el usuario directamente en la base de datos Neon.

**Requisitos:**
- Tener acceso a la variable de entorno `DATABASE_URL` o `POSTGRES_URL` de Neon
- Instalar `pg` si no está instalado: `npm install pg`

**Ejecución:**

```bash
cd delfin-checkin

# Con variable de entorno directamente
DATABASE_URL="tu_url_de_neon_aqui" node scripts/create-test-user.js

# O si tienes .env con DATABASE_URL
node scripts/create-test-user.js
```

### Opción B: Script usando API

Crea el usuario mediante el endpoint API (requiere un tenant_id existente).

**Requisitos:**
- Tener un `tenant_id` existente (puedes obtenerlo del admin panel o base de datos)

**Ejecución:**

```bash
cd delfin-checkin
TENANT_ID="uuid-del-tenant" node scripts/create-test-user-api.js
```

## Credenciales generadas

El script creará un usuario con las siguientes credenciales:

- **Email:** `appconnect-test@delfincheckin.com`
- **Contraseña:** `AppConnect2024!`
- **Rol:** `owner`

## Qué hace el script

1. Busca un tenant activo existente o crea uno nuevo
2. Verifica si el usuario ya existe
3. Si existe, actualiza la contraseña
4. Si no existe, crea un nuevo usuario con las credenciales de prueba
5. Muestra las credenciales para compartir con AppConnect

## Notas

- El script es idempotente: puedes ejecutarlo múltiples veces sin problemas
- Si el usuario ya existe, solo actualizará la contraseña
- El usuario se crea con `is_active = true` y `email_verified = true` para acceso inmediato

