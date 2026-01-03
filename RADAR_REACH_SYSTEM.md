# 🎯 Sistema Radar Reach - Documentación

## 📋 Resumen

El sistema **Radar Reach** es un módulo exclusivo para SuperAdmin que permite:
1. **Radar**: Detectar tendencias de demanda (Google Trends, OTAs, eventos, etc.)
2. **Reach**: Generar landings dinámicas basadas en esas tendencias para convertir en reservas directas

## 🗄️ Base de Datos

### Tablas Creadas

1. **`radar_signals`**: Señales de tendencias detectadas
   - Relacionada con `property_id` (tenant_properties)
   - Almacena solo datos estructurados (JSON), NO contenido generado
   - Tipos: `google_trends`, `ota_demand`, `seasonal`, `event_based`, `competitor`, `custom`

2. **`dynamic_landings`**: Landings dinámicas generadas
   - Relacionada con `property_id` y `radar_signal_id`
   - Contenido estructurado en JSON (NO HTML plano)
   - Cada landing representa una intención de viaje, NO una habitación específica

### Migración SQL

```bash
# Ejecutar en Neon (base de datos PostgreSQL)
psql $DATABASE_URL -f database/create-radar-reach-system.sql
```

## 🔌 APIs Creadas

### Radar (Señales)

- **GET** `/api/superadmin/radar/signals` - Obtener señales
  - Query params: `property_id`, `tenant_id`, `active_only`, `processed`
- **POST** `/api/superadmin/radar/signals` - Crear nueva señal
- **PUT** `/api/superadmin/radar/signals` - Actualizar señal
- **DELETE** `/api/superadmin/radar/signals?id=...` - Eliminar señal

### Reach (Landings)

- **GET** `/api/superadmin/reach/landings` - Obtener landings
  - Query params: `property_id`, `tenant_id`, `status`, `published_only`
- **POST** `/api/superadmin/reach/landings` - Crear nueva landing
- **PUT** `/api/superadmin/reach/landings` - Actualizar landing
- **DELETE** `/api/superadmin/reach/landings?id=...` - Eliminar landing
- **POST** `/api/superadmin/reach/generate-content` - Generar contenido con IA (cuando hay señal clara)

## 🔐 Seguridad

- Todas las APIs requieren autenticación de SuperAdmin (`isPlatformAdmin = true`)
- Usa `verifySuperAdmin()` de `@/lib/auth-superadmin`

## ✅ Estado de Implementación

### 1. Interfaz de SuperAdmin ✅ COMPLETADO
- ✅ Página `/superadmin/radar-reach` para gestionar Radar y Reach
- ✅ Lista de señales con filtros y tabla completa
- ✅ Formulario para crear/editar señales (modal completo)
- ✅ Lista de landings dinámicas con métricas
- ✅ Editor de contenido estructurado (JSON)
- ✅ Integración en menú de navegación

### 2. Sistema de Renderizado de Landings ✅ COMPLETADO
- ✅ Página en `book.delfincheckin.com/[tenantId]/landing/[slug]`
- ✅ Renderizar contenido JSON estructurado
- ✅ Mostrar TODAS las habitaciones activas del property (desde `tenant_properties`)
- ✅ Integrar con sistema de reservas existente (redirección a `/[tenantId]/[propertyId]`)
- ✅ SEO: JSON-LD, meta tags, FAQs estructurados

### 3. Integración con IA ⏳ BÁSICO COMPLETADO
- ✅ API `/api/superadmin/reach/generate-content` creada
- ⏳ Pendiente: Integrar OpenAI API real (actualmente genera contenido básico de ejemplo)
- ✅ Estructura lista para JSON-LD y FAQs

### 4. Motor de Reservas ✅ COMPLETADO
- ✅ Reutiliza sistema existente de `book.delfincheckin.com/[tenantId]/[propertyId]`
- ✅ Seleccionar habitación desde la landing (botón redirige)
- ✅ Procesar con Stripe (mismo flujo existente)
- ✅ NO permite redirecciones externas

## 🔄 Flujo de Uso

1. **SuperAdmin detecta tendencia** → Crea señal en Radar
2. **Si la señal es clara** → Genera contenido con IA (opcional)
3. **Crea landing dinámica** → Asocia señal + contenido
4. **Publica landing** → Se renderiza en `book.delfincheckin.com/[tenantId]/landing/[slug]`
5. **Visitant ve landing** → Ve todas las habitaciones activas del property
6. **Selecciona habitación** → Usa sistema de reservas existente
7. **Reserva con Stripe** → Conversión completa

## 📊 Estructura de Contenido JSON

```json
{
  "title": "Título de la landing",
  "meta_description": "Descripción para SEO",
  "hero": {
    "headline": "Título principal",
    "subheadline": "Subtítulo",
    "cta_text": "Reservar ahora"
  },
  "sections": [
    {
      "type": "features",
      "title": "Título sección",
      "items": []
    }
  ],
  "faqs": [
    {
      "question": "Pregunta",
      "answer": "Respuesta"
    }
  ],
  "seo": {
    "keywords": [],
    "json_ld": {}
  }
}
```

## 🎯 Principios de Diseño

1. **NO duplicar datos**: Reutiliza `tenant_properties`, `property_availability`, sistema de reservas
2. **Solo datos estructurados**: Radar solo genera señales, no contenido
3. **Contenido JSON**: Landings usan JSON estructurado, NO HTML plano
4. **IA bajo demanda**: Solo genera contenido cuando hay señal clara del Radar
5. **Todas las habitaciones**: Cada landing muestra TODAS las habitaciones activas del property
6. **Sin redirecciones**: Todas las reservas se procesan internamente con Stripe

## 📚 Archivos Creados

```
delfin-checkin/
├── database/
│   └── create-radar-reach-system.sql                    ✅ Migración SQL
├── src/app/api/superadmin/
│   ├── properties/
│   │   └── route.ts                                     ✅ API Propiedades (auxiliar)
│   ├── radar/
│   │   └── signals/
│   │       └── route.ts                                 ✅ API Radar
│   └── reach/
│       ├── landings/
│       │   └── route.ts                                 ✅ API Reach
│       └── generate-content/
│           └── route.ts                                 ✅ API Generación IA
├── src/app/api/public/
│   └── landings/
│       └── [slug]/
│           └── route.ts                                 ✅ API Pública Landing
├── src/app/superadmin/
│   ├── radar-reach/
│   │   ├── page.tsx                                     ✅ Página principal
│   │   └── components/
│   │       ├── SignalModal.tsx                          ✅ Modal señales
│   │       └── LandingModal.tsx                         ✅ Modal landings
│   └── page.tsx                                         ✅ Actualizado (enlace añadido)
├── src/components/
│   └── Navigation.tsx                                   ✅ Actualizado (menú)
└── RADAR_REACH_SYSTEM.md                                ✅ Documentación

book-delfincheckin.com/
└── src/app/
    └── [tenantId]/
        └── landing/
            └── [slug]/
                └── page.tsx                             ✅ Página renderizado landing
```

## 🚀 Estado Actual

- ✅ Migración SQL creada y ejecutada
- ✅ APIs de Radar creadas y funcionales
- ✅ APIs de Reach creadas y funcionales
- ✅ API de generación de contenido (básica, estructura lista para OpenAI)
- ✅ Interfaz de SuperAdmin completa y funcional
- ✅ Sistema de renderizado de landings completo
- ✅ Integración completa con reservas
- ✅ Añadido al menú de navegación del SuperAdmin

