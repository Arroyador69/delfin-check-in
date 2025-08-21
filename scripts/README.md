# Scripts de Configuración

Este directorio contiene scripts auxiliares para la configuración y testing del proyecto.

## Scripts disponibles

### `setup-messages.js`
Configura las plantillas de mensajes automáticos personalizadas en la base de datos.

```bash
cd scripts
node setup-messages.js
```

### `test-supabase.js`
Prueba la conexión con Supabase y verifica que todas las tablas estén configuradas correctamente.

```bash
cd scripts
node test-supabase.js
```

### `test-env.js`
Verifica que todas las variables de entorno estén configuradas correctamente.

```bash
cd scripts
node test-env.js
```

## Uso

Todos los scripts deben ejecutarse desde el directorio raíz del proyecto o especificando la ruta correcta al archivo `.env.local`.
