# Scraper de Contactos para Alojamientos Turísticos

Herramienta para extraer emails y teléfonos de sitios web de alojamientos turísticos, diseñada para captar clientes para el PMS "Delfín Check-in".

## 🚀 Instalación

```bash
# Instalar dependencias
pip install -r requirements.txt
```

## 📖 Uso

### Opción 1: URLs directas
```bash
python main.py https://ejemplo-alojamiento.com https://otro-alojamiento.es
```

### Opción 2: Desde archivo CSV
```bash
python main.py --csv seeds.csv
```

El CSV debe tener una columna `url` o usar la primera columna para las URLs.

### Opciones avanzadas
```bash
python main.py --csv seeds.csv \
  --output resultados.csv \
  --max-pages 3 \
  --delay 2.0 \
  --max-sites 10
```

## 📋 Parámetros

- `--csv`: Archivo CSV con URLs a procesar
- `--output, -o`: Archivo de salida (default: `leads.csv`)
- `--max-pages`: Máximo páginas por sitio (default: 5)
- `--delay`: Delay entre requests en segundos (default: 1.0)
- `--max-sites`: Máximo sitios a procesar

## 📊 Salida

El archivo CSV generado contiene:
- `url`: URL del sitio analizado
- `emails`: Emails encontrados (separados por `;`)
- `phones`: Teléfonos encontrados (separados por `;`)
- `email_count`: Número de emails encontrados
- `phone_count`: Número de teléfonos encontrados

## 🔍 Funcionamiento

1. **Página principal**: Analiza la URL proporcionada
2. **Páginas de contacto**: Busca automáticamente páginas como `/contact`, `/contacto`, `/about`, etc.
3. **Extracción**: Usa regex para encontrar emails y teléfonos españoles
4. **Normalización**: Formatea teléfonos con prefijo +34
5. **Deduplicación**: Elimina contactos duplicados

## ⚖️ Consideraciones legales

- Respeta robots.txt (implementar si es necesario)
- Usa delays entre requests para no sobrecargar servidores
- Solo extrae información públicamente disponible
- Cumple con GDPR para uso B2B legítimo

## 📝 Ejemplo de CSV de entrada

```csv
url,name
https://apartamentos-malaga.com,Apartamentos Málaga Centro
https://casa-rural-sevilla.es,Casa Rural Sevilla
https://hostal-madrid.com,Hostal Madrid Centro
```

## 🎯 Casos de uso

- **Registros públicos**: Procesar listados de CCAA con URLs de alojamientos
- **OTAs**: Analizar sitios web de propietarios encontrados en Airbnb/Booking
- **Directorios**: Extraer contactos de asociaciones de hostelería
- **Lead generation**: Identificar propietarios sin channel manager

## ⚠️ Limitaciones

- No maneja JavaScript (solo HTML estático)
- Depende de la estructura de cada sitio web
- Puede necesitar ajustes de regex para diferentes formatos
- Requiere conexión a internet estable
