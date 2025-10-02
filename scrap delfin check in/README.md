# 🐬 Scraper Delfín Check-in

> **Herramienta para captar clientes del PMS Delfín Check-in**  
> Extrae emails y teléfonos de sitios web de alojamientos turísticos para identificar propietarios sin channel manager.

[![Python](https://img.shields.io/badge/Python-3.7+-blue.svg)](https://python.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)]()

## 🎯 Objetivo

Identificar propietarios de alojamientos turísticos que aún no usan channel manager y ofrecerles el **PMS Delfín Check-in** para:
- ✅ Registro automático de viajeros
- ✅ Envío directo de datos al Ministerio
- ✅ Gestión centralizada de reservas

## 🚀 Instalación Rápida

```bash
# 1. Clonar el repositorio
git clone https://github.com/Arroyador69/scrap-delfin-check-in.git
cd scrap-delfin-check-in

# 2. Crear entorno virtual
python3 -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# 3. Instalar dependencias
pip install -r requirements.txt
```

## 📖 Uso

### 🎯 Ejemplo Básico
```bash
# Activar entorno virtual
source venv/bin/activate

# Analizar sitios directos
python main.py https://apartamentos-malaga.com https://casa-rural-sevilla.es
```

### 📊 Desde Archivo CSV
```bash
# Usar el archivo de ejemplo incluido
python main.py --csv seeds_example.csv

# O tu propio CSV
python main.py --csv mi_lista_alojamientos.csv
```

### ⚙️ Opciones Avanzadas
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

### 📈 Ejemplo de Resultados
```csv
url,emails,phones,email_count,phone_count
https://apartamentos-malaga.com,info@apartamentos-malaga.com; reservas@apartamentos-malaga.com,+34612345678; +34687654321,2,2
https://casa-rural-sevilla.es,contacto@casa-rural-sevilla.es,+34955123456,1,1
```

### 🎯 Resultados Reales (Prueba con HostelWorld)
- ✅ **7 emails** encontrados
- ✅ **527 teléfonos** extraídos
- ✅ **Normalización automática** con prefijo +34

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

## 🎯 Casos de Uso para Delfín Check-in

### 🏛️ **Registros Públicos CCAA**
- Procesar listados oficiales de alojamientos registrados
- Andalucía, Cataluña, C. Valenciana, Baleares, etc.
- URLs directas a sitios web de propietarios

### 🏨 **Análisis de OTAs**
- Identificar propietarios en Airbnb/Booking sin channel manager
- Detectar señales de gestión manual vs. automatizada
- Extraer sitios web oficiales para contacto directo

### 🏢 **Directorios Sectoriales**
- Asociaciones de hostelería y turismo
- Cámaras de comercio locales
- Portales de licencias municipales

### 📈 **Lead Generation Estratégico**
- Identificar propietarios sin channel manager
- Priorizar por probabilidad de conversión
- Integrar con CRM para secuencias de outreach

## ⚠️ Limitaciones

- No maneja JavaScript (solo HTML estático)
- Depende de la estructura de cada sitio web
- Puede necesitar ajustes de regex para diferentes formatos
- Requiere conexión a internet estable
