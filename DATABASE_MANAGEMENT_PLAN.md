# 🗄️ Plan de Gestión de Base de Datos - Delfín Check-in

## 🎯 Objetivo
Centralizar TODOS los datos de clientes y reservas en una sola base de datos PostgreSQL, gestionable desde Cursor AI y accesible para análisis.

## 📊 Estructura actual (YA TIENES)

### ✅ Tablas existentes en PostgreSQL:
```sql
-- Habitaciones y configuración
rooms (id, name, ical_urls, prices, created_at)

-- Reservas (desde Airbnb, Booking, manuales)
reservations (id, external_id, room_id, guest_name, check_in, check_out, channel, total_price, status)

-- Huéspedes (check-in digital)
guests (id, reservation_id, name, document_type, document_number, birth_date, country)

-- Registros oficiales MIR
guest_registrations (id, reserva_ref, fecha_entrada, fecha_salida, data, created_at)

-- Mensajes automáticos
messages (id, trigger, channel, template, language, is_active)
```

## 🔧 Herramientas recomendadas (GRATIS)

### 1. 🖥️ Cliente PostgreSQL desde Cursor
```bash
# Opción 1: pgcli (recomendado)
npm install -g pgcli
pgcli "postgresql://tu-url-vercel-postgres"

# Opción 2: Extensión VS Code/Cursor
# - PostgreSQL Explorer
# - SQLTools
```

### 2. 📊 Scripts de gestión personalizados
```javascript
// /scripts/database-manager.js
import { sql } from '@/lib/db';

// Ver todas las reservas
export async function getAllReservations() {
  return await sql`
    SELECT r.*, rm.name as room_name
    FROM reservations r
    LEFT JOIN rooms rm ON rm.id = r.room_id
    ORDER BY r.check_in DESC
  `;
}

// Estadísticas de ocupación
export async function getOccupancyStats() {
  return await sql`
    SELECT 
      DATE_TRUNC('month', check_in) as month,
      COUNT(*) as total_reservations,
      SUM(total_price) as revenue
    FROM reservations 
    WHERE status = 'confirmed'
    GROUP BY month
    ORDER BY month DESC
  `;
}
```

### 3. 🎛️ Dashboard personalizado
```typescript
// Añadir nueva página: /src/app/database-manager/page.tsx
// Con queries personalizadas, exportación de datos, etc.
```

## 🆚 PostgreSQL vs MySQL - Tu caso específico

### ✅ PostgreSQL (RECOMENDADO - mantener)
| Aspecto | PostgreSQL | Ventaja |
|---------|------------|---------|
| **Coste** | 🆓 Gratis en Vercel | Ya configurado |
| **JSON** | ✅ Nativo (JSONB) | Perfecto para guest_registrations |
| **Rendimiento** | ⚡ Excelente | Optimizado para web |
| **Herramientas** | 🔧 Muchas opciones | pgcli, extensiones |
| **Escalabilidad** | 📈 Excelente | Hasta 1TB en Vercel |
| **Seguridad** | 🛡️ Superior | Row-level security |

### ❌ MySQL (NO recomendado)
| Aspecto | MySQL | Desventaja |
|---------|-------|------------|
| **Coste** | 💰 PlanetScale $29/mes | Caro |
| **JSON** | ⚠️ Limitado | Peor soporte JSON |
| **Migración** | 🔄 Compleja | Riesgo de pérdida datos |
| **Hosting** | 🌐 Separado | Más configuración |

## 🚀 Plan de implementación (GRATIS)

### Fase 1: Herramientas locales (1 día)
```bash
# 1. Instalar pgcli
npm install -g pgcli

# 2. Conectar desde terminal
pgcli $POSTGRES_URL

# 3. Queries de ejemplo
\dt  # Ver todas las tablas
SELECT * FROM reservations LIMIT 10;
```

### Fase 2: Scripts de gestión (2-3 días)
```bash
# Crear scripts en /scripts/
- database-queries.js     # Consultas comunes
- export-data.js         # Exportar a CSV/Excel
- backup-manager.js      # Backups automáticos
- analytics.js           # Estadísticas avanzadas
```

### Fase 3: Dashboard avanzado (1 semana)
```bash
# Nueva página en dashboard
/src/app/database-manager/
- Consultas personalizadas
- Exportación de datos
- Gráficos y estadísticas
- Gestión de reservas avanzada
```

## 💰 Análisis de costes

### PostgreSQL actual (Vercel)
- **0-1GB**: 🆓 Gratis
- **1-10GB**: $20/mes
- **10-100GB**: $90/mes

### MySQL alternativas
- **PlanetScale**: $29/mes mínimo
- **AWS RDS**: $15-50/mes
- **DigitalOcean**: $15/mes

## 🎯 Mi recomendación FINAL

### ✅ MANTENER PostgreSQL porque:
1. **Ya funciona perfectamente**
2. **Gratis hasta 1GB** (suficiente para años)
3. **Mejor para tu tipo de datos** (JSON, fechas, etc.)
4. **Herramientas excelentes** para gestión local
5. **Escalable** cuando crezcas

### 🔧 AÑADIR herramientas de gestión:
1. **pgcli** para consultas desde terminal
2. **Scripts personalizados** para análisis
3. **Dashboard interno** para gestión avanzada
4. **Backups automáticos** a archivos locales

## 🎮 ¿Quieres que implementemos herramientas de gestión PostgreSQL?

Puedo crear:
- **Scripts de consulta** personalizados
- **Dashboard de análisis** interno
- **Herramientas de backup** automáticas
- **Conexión directa** desde Cursor

**¿Te parece bien mantener PostgreSQL y añadir herramientas de gestión potentes?**
