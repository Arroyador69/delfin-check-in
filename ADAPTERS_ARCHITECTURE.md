# Arquitectura de Adapters Multi-País

## 📋 Resumen

Este documento describe la arquitectura de adapters implementada para soportar múltiples países en el sistema Delfín Check-in, sin duplicar código ni romper funcionalidad existente.

## 🎯 Objetivo

Permitir que el sistema funcione con diferentes países (España, Italia, Francia, etc.) manteniendo:
- ✅ Código MIR existente intacto (sin duplicar)
- ✅ Endpoints actuales funcionando
- ✅ Formulario en GitHub Pages sin cambios mayores
- ✅ Migración gradual sin romper nada

## 🏗️ Estructura

```
src/lib/adapters/
├── base/
│   ├── types.ts          # Interfaces y tipos comunes
│   └── adapter.ts        # Clase base abstracta
├── spain/
│   ├── es-hospederias.ts # Adapter España (wrapper del código MIR)
│   └── index.ts
├── italy/
│   ├── it-alloggiati.ts  # Adapter Italia (stub para futuro)
│   └── index.ts
└── index.ts              # Factory function
```

## 🔑 Conceptos Clave

### Adapter Pattern

Cada país tiene su propio adapter que:
1. **Encapsula** la lógica específica del país
2. **Usa** el código existente (no lo duplica)
3. **Implementa** la interfaz común (`BaseAdapter`)

### España (es-hospederias)

El `SpainHospederiasAdapter`:
- ✅ **NO duplica** código MIR existente
- ✅ **Usa** `buildPvXml`, `buildRhXml` (de `mir-xml-official.ts`)
- ✅ **Usa** `MinisterioClientOfficial` (de `ministerio-client-official.ts`)
- ✅ **Transforma** el payload genérico al formato MIR
- ✅ **Mantiene** toda la validación y lógica existente

## 📊 Flujo de Datos

### Flujo Actual (Sigue Funcionando)
```
Form GitHub Pages
  ↓ POST
/api/public/form/[tenant_id]/submit (v1)
  ↓
/api/registro-flex
  ↓
Código MIR existente
  ↓
MIR Oficial
```

### Flujo Nuevo (Paralelo, No Reemplaza)
```
Form GitHub Pages
  ↓ GET config
/api/public/form/config?tenant=X&property=Y
  ↓ (devuelve campos dinámicos)
Form renderiza según país
  ↓ POST
/api/public/form/[tenant_id]/submit (v1 - sigue igual)
  ↓ (internamente puede usar adapter)
SpainAdapter (wrapper)
  ↓ (usa internamente)
Código MIR existente (sin cambios)
  ↓
MIR Oficial
```

## 🔌 Endpoints

### `/api/public/form/config` (NUEVO)

**Propósito**: Devolver configuración del formulario según país

**Método**: `GET`

**Parámetros**:
- `tenant` (query): ID del tenant
- `property` (query): ID de la propiedad

**Respuesta**:
```json
{
  "country": "ES",
  "adapter": "es-hospederias",
  "fields": [...],
  "validations": {...},
  "legalTexts": {...},
  "locale": "es"
}
```

**Seguridad**: ✅ Solo lectura, no afecta envíos actuales

### `/api/v2/checkins` (PLACEHOLDER)

**Estado**: No implementado aún (retorna 501)

**Propósito**: Endpoint futuro para usar adapters directamente

### `/api/v2/adapters/[key]/validate` (FUNCIONAL)

**Propósito**: Validar datos antes de enviarlos usando el adapter

**Método**: `POST`

**Body**: `CheckInPayload`

**Respuesta**:
```json
{
  "valid": true/false,
  "errors": [...]
}
```

## 🗄️ Base de Datos

### Tabla: `tenant_properties`

**Campos añadidos**:
- `country_code` (VARCHAR(2)): Código ISO del país (ej: 'ES', 'IT')
- `adapter_key` (VARCHAR(50)): Key del adapter (ej: 'es-hospederias', 'it-alloggiati')

**Valores por defecto**: Todos los registros existentes tienen `country_code='ES'` y `adapter_key='es-hospederias'`

## 🛠️ Uso del Factory

```typescript
import { getAdapter, getAdapterByCountry } from '@/lib/adapters';

// Obtener adapter por key
const adapter = getAdapter('es-hospederias');

// Obtener adapter por país
const adapter = getAdapterByCountry('ES');

// Validar
const validation = adapter.validate(payload);

// Transformar a formato de autoridad
const xml = await adapter.toAuthorityPayload(payload, context);

// Enviar
const result = await adapter.submit(xml, context);
```

## 📝 Implementar un Nuevo País

### Paso 1: Crear el Adapter

```typescript
// src/lib/adapters/italy/it-alloggiati.ts
export class ItalyAlloggiatiAdapter extends BaseAdapter {
  readonly key = 'it-alloggiati';
  readonly countryCode = 'IT';
  readonly name = 'Italia - Sistema Alloggiati';
  
  // Implementar todos los métodos abstractos
}
```

### Paso 2: Registrar en Factory

```typescript
// src/lib/adapters/index.ts
import { ItalyAlloggiatiAdapter } from './italy';

const italyAdapter = new ItalyAlloggiatiAdapter();
adapters.set(italyAdapter.key, italyAdapter);
```

### Paso 3: Configurar Propiedad

```sql
UPDATE tenant_properties 
SET country_code = 'IT', adapter_key = 'it-alloggiati'
WHERE id = <property_id>;
```

## ✅ Garantías

1. **Código MIR intacto**: No se modifica, solo se encapsula
2. **Endpoints actuales**: Siguen funcionando igual
3. **Form actual**: Funciona con fallback si no hay tenant/property
4. **Base de datos**: Campos con valores por defecto
5. **Migración gradual**: Puedes activar adapters propiedad por propiedad

## 🚀 Próximos Pasos

1. ✅ Estructura base creada
2. ✅ SpainAdapter implementado (wrapper del código MIR)
3. ✅ Endpoint de configuración creado
4. ✅ Factory function implementada
5. ⏳ Modificar form en GitHub Pages para usar configuración dinámica (opcional)
6. ⏳ Implementar ItalyAdapter cuando se trabaje en Italia

## 📚 Referencias

- Código MIR existente: `src/lib/mir-xml-official.ts`, `src/lib/mir-xml-rh.ts`
- Cliente MIR: `src/lib/ministerio-client-official.ts`
- Endpoint actual: `src/app/api/public/form/[slug]/submit/route.ts`
- Normas MIR: `MIR-HOSPE-DSI-WS-Servicio de Hospedajes - Comunicaciones v3.1.3/`

