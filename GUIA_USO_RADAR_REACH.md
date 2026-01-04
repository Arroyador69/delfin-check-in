# 🎯 Guía de Uso: Sistema Radar Reach

Esta guía te explica cómo usar el sistema Radar Reach para crear señales de tendencias y landings dinámicas.

## 📋 Índice

1. [¿Qué es Radar Reach?](#qué-es-radar-reach)
2. [Acceso al Sistema](#acceso-al-sistema)
3. [Crear una Señal del Radar](#crear-una-señal-del-radar)
4. [Crear una Landing Dinámica](#crear-una-landing-dinámica)
5. [Ver las Landings Publicadas](#ver-las-landings-publicadas)
6. [Ejemplo Práctico Completo](#ejemplo-práctico-completo)

---

## ¿Qué es Radar Reach?

**Radar Reach** es un sistema que permite:
- **Radar**: Detectar tendencias de demanda (Google Trends, OTAs, eventos, etc.)
- **Reach**: Crear landings dinámicas optimizadas para convertir esas tendencias en reservas

### Flujo del Sistema

```
Tendencia Detectada → Señal del Radar → Landing Dinámica → Conversión en Reserva
```

---

## Acceso al Sistema

1. Inicia sesión como **SuperAdmin**
2. Ve al menú de navegación y selecciona **"Radar Reach"**
3. O accede directamente a: `/superadmin/radar-reach`

---

## Crear una Señal del Radar

Las señales del Radar representan tendencias de demanda detectadas.

### Paso 1: Abrir el Modal

1. En la pestaña **"Radar"**, haz clic en el botón **"Nueva Señal"**
2. Se abrirá un modal con el formulario

### Paso 2: Rellenar el Formulario

#### Campos Obligatorios:

- **Propiedad** (*): Selecciona la propiedad/hostal para la que se detecta la señal
- **Tipo de Señal** (*): Selecciona el tipo:
  - `Google Trends`: Tendencia en búsquedas de Google
  - `OTA Demand`: Demanda detectada en OTAs (Booking, Airbnb, etc.)
  - `Estacional`: Tendencia estacional (verano, invierno, etc.)
  - `Basado en Eventos`: Eventos locales (festivales, conciertos, etc.)
  - `Competencia`: Análisis de competencia
  - `Personalizado`: Señal personalizada
- **Intensidad**: Desliza el slider (0-100%) para indicar la intensidad de la señal
- **Datos de la Señal (JSON)** (*): Datos estructurados en formato JSON

#### Campos Opcionales:

- **Fecha de Expiración**: Cuándo expira esta señal (opcional)
- **Señal activa**: Marca si la señal está activa (por defecto sí)

### Paso 3: Ejemplo de JSON para "Datos de la Señal"

```json
{
  "keywords": ["fuengirola", "playa", "semana santa 2025"],
  "source": "google_trends",
  "trend_percentage": 150,
  "dates": {
    "start": "2025-04-13",
    "end": "2025-04-20"
  },
  "location": "Fuengirola, Málaga",
  "metrics": {
    "search_volume": 5000,
    "competition": "medium"
  }
}
```

### Paso 4: Guardar

Haz clic en **"Crear"** para guardar la señal.

---

## Crear una Landing Dinámica

Las landings dinámicas son páginas optimizadas para convertir tendencias en reservas.

### Paso 1: Abrir el Modal

1. En la pestaña **"Reach"**, haz clic en el botón **"Nueva Landing"**
2. Se abrirá un modal con el formulario

### Paso 2: Rellenar el Formulario

#### Campos Obligatorios:

- **Propiedad** (*): Selecciona la propiedad/hostal
- **Slug** (*): URL amigable única (ej: `fuengirola-playa-semana-santa-2025`)
- **Contenido (JSON)** (*): Contenido estructurado en formato JSON

#### Campos Opcionales:

- **Señal del Radar**: Si la landing se basa en una señal específica
- **Keywords objetivo**: Palabras clave separadas por comas (ej: `fuengirola, playa, semana santa`)
- **Fecha inicio objetivo**: Fecha de inicio del período objetivo
- **Fecha fin objetivo**: Fecha de fin del período objetivo
- **Audiencia objetivo**: Tipo de audiencia (ej: `familias`, `parejas`, `grupos`)
- **Publicado**: Marca si la landing está publicada (por defecto no)

### Paso 3: Generar Contenido con IA (Opcional)

Si has seleccionado una **Señal del Radar** y has añadido **Keywords**, puedes:

1. Hacer clic en el botón **"🤖 Generar Contenido con IA"**
2. El sistema generará contenido estructurado automáticamente
3. El contenido se rellenará en el campo "Contenido (JSON)"

### Paso 4: Ejemplo de JSON para "Contenido"

```json
{
  "title": "Alojamiento en Fuengirola para Semana Santa 2025",
  "meta_description": "Reserva tu alojamiento en Fuengirola para Semana Santa 2025. Habitaciones cerca de la playa, precios especiales.",
  "hero": {
    "headline": "Semana Santa en Fuengirola 2025",
    "subheadline": "Disfruta de la playa y el sol en Semana Santa",
    "cta_text": "Reservar Ahora"
  },
  "sections": [
    {
      "type": "description",
      "title": "Por qué elegir Fuengirola en Semana Santa",
      "content": "Fuengirola ofrece el clima perfecto para disfrutar de la playa en Semana Santa..."
    },
    {
      "type": "features",
      "title": "Ventajas de nuestro alojamiento",
      "items": [
        "A solo 5 minutos de la playa",
        "WiFi gratuito",
        "Recepción 24 horas",
        "Aire acondicionado"
      ]
    }
  ],
  "faqs": [
    {
      "question": "¿Hay cancelación gratuita?",
      "answer": "Sí, ofrecemos cancelación gratuita hasta 48 horas antes de la llegada."
    },
    {
      "question": "¿Está cerca de la playa?",
      "answer": "Sí, nuestro alojamiento está a solo 5 minutos caminando de la playa."
    }
  ],
  "seo": {
    "keywords": ["fuengirola", "semana santa", "playa", "alojamiento"],
    "json_ld": {
      "@context": "https://schema.org",
      "@type": "Hotel",
      "name": "Alojamiento en Fuengirola",
      "description": "Alojamiento cerca de la playa en Fuengirola"
    }
  }
}
```

### Paso 5: Guardar y Publicar

1. Haz clic en **"Crear"** para guardar la landing
2. Para publicarla, edítala y marca la casilla **"Publicado"**
3. La landing estará disponible en: `https://book.delfincheckin.com/[tenant-id]/landing/[slug]`

---

## Ver las Landings Publicadas

Una vez que hayas creado y publicado una landing:

1. Ve a la pestaña **"Reach"**
2. Busca la landing en la tabla
3. Verás métricas como:
   - **Vistas**: Cuántas veces se ha visto
   - **Conversiones**: Cuántas reservas se han generado
   - **Tasa de conversión**: Porcentaje de conversión

### Ver la Landing en Acción

La URL de la landing será:
```
https://book.delfincheckin.com/[TU-TENANT-ID]/landing/[SLUG]
```

Ejemplo:
```
https://book.delfincheckin.com/abc123/landing/fuengirola-playa-semana-santa-2025
```

---

## Ejemplo Práctico Completo

### Escenario: Semana Santa 2025 en Fuengirola

#### 1. Crear la Señal del Radar

- **Propiedad**: Tu hostal en Fuengirola
- **Tipo**: `Estacional`
- **Intensidad**: 75%
- **Datos JSON**:
```json
{
  "keywords": ["fuengirola", "semana santa", "abril 2025"],
  "source": "google_trends",
  "trend_percentage": 200,
  "dates": {
    "start": "2025-04-13",
    "end": "2025-04-20"
  }
}
```
- **Fecha de Expiración**: 2025-04-21
- **Señal activa**: ✅

#### 2. Crear la Landing

- **Propiedad**: Tu hostal en Fuengirola
- **Señal del Radar**: La señal que acabas de crear
- **Slug**: `fuengirola-semana-santa-2025`
- **Keywords**: `fuengirola, semana santa, playa, abril 2025`
- **Fecha inicio**: 2025-04-13
- **Fecha fin**: 2025-04-20
- **Audiencia**: `familias`
- **Publicado**: ✅

#### 3. Generar Contenido con IA

1. Haz clic en **"🤖 Generar Contenido con IA"**
2. El sistema generará contenido optimizado automáticamente
3. Revisa y ajusta si es necesario

#### 4. Publicar y Compartir

1. Guarda la landing
2. Comparte la URL: `https://book.delfincheckin.com/[tenant-id]/landing/fuengirola-semana-santa-2025`
3. La landing mostrará **TODAS las habitaciones activas** de tu hostal

---

## 💡 Consejos y Mejores Prácticas

1. **Slugs únicos**: Asegúrate de que cada slug sea único y descriptivo
2. **Keywords relevantes**: Usa keywords que realmente busquen tus clientes
3. **Contenido optimizado**: El contenido debe ser relevante para la audiencia objetivo
4. **Fechas objetivo**: Define claramente el período objetivo de la landing
5. **Métricas**: Revisa regularmente las métricas (vistas, conversiones) para optimizar

---

## ❓ Preguntas Frecuentes

### ¿Cuántas habitaciones se muestran en la landing?

Se muestran **TODAS las habitaciones activas** del hostal/propiedad asociada al tenant.

### ¿Puedo crear una landing sin una señal del Radar?

Sí, las señales del Radar son opcionales. Puedes crear landings manualmente.

### ¿Cómo se calculan las conversiones?

Las conversiones se registran cuando un usuario hace clic en "Reservar ahora" desde la landing y completa una reserva.

### ¿Puedo editar una landing después de publicarla?

Sí, puedes editar cualquier landing en cualquier momento desde la pestaña "Reach".

---

## 📞 Soporte

Si tienes dudas o problemas, contacta con el equipo de desarrollo.

