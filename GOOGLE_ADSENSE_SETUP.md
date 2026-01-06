# 📢 Configuración de Google AdSense

## Pasos para obtener los códigos de anuncios

### 1. Crear cuenta en Google AdSense

1. Ve a https://www.google.com/adsense/
2. Inicia sesión con tu cuenta de Google
3. Si no tienes cuenta, créala

### 2. Añadir tu sitio web

1. En el panel de AdSense, ve a **"Sitios"** o **"Sites"**
2. Haz clic en **"Añadir sitio"** o **"Add site"**
3. Ingresa tu dominio: `delfincheckin.com` (y `admin.delfincheckin.com` si quieres)
4. Selecciona el país (España)
5. Acepta los términos y condiciones

### 3. Esperar aprobación

- Google revisará tu sitio (puede tardar días o semanas)
- Necesitas tener contenido suficiente y cumplir políticas
- Recibirás un email cuando esté aprobado

### 4. Crear unidades de anuncios

Una vez aprobado:

1. Ve a **"Anuncios"** > **"Por unidad de anuncios"** o **"Ads"** > **"By ad unit"**
2. Haz clic en **"Crear unidad de anuncios"** o **"Create ad unit"**

#### Unidad 1: Banner Superior (Responsive)
- **Nombre**: `Banner Superior - Dashboard`
- **Tipo**: Display ads
- **Tamaño**: Responsive (auto)
- **Ubicación**: Banner superior del dashboard
- Copia el **Ad unit ID** (formato: `ca-pub-XXXXXXXXXX-XXXXXXXXXX`)

#### Unidad 2: Sidebar (300x250)
- **Nombre**: `Sidebar - Listados`
- **Tipo**: Display ads
- **Tamaño**: 300x250 (Rectangle)
- **Ubicación**: Sidebar en páginas de listados
- Copia el **Ad unit ID**

#### Unidad 3: Footer (Responsive)
- **Nombre**: `Footer - Páginas principales`
- **Tipo**: Display ads
- **Tamaño**: Responsive (auto)
- **Ubicación**: Footer de páginas principales
- Copia el **Ad unit ID**

### 5. Obtener Publisher ID

1. Ve a **"Configuración"** > **"Cuenta"** o **"Settings"** > **"Account"**
2. Busca **"Publisher ID"** o **"Publisher ID"**
3. Copia el ID (formato: `ca-pub-XXXXXXXXXX`)

### 6. Configurar variables de entorno

Añade estas variables en Vercel (o tu archivo `.env.local`):

```bash
NEXT_PUBLIC_ADSENSE_PUBLISHER_ID=ca-pub-XXXXXXXXXX
NEXT_PUBLIC_ADSENSE_BANNER_ID=ca-pub-XXXXXXXXXX-XXXXXXXXXX
NEXT_PUBLIC_ADSENSE_SIDEBAR_ID=ca-pub-XXXXXXXXXX-XXXXXXXXXX
NEXT_PUBLIC_ADSENSE_FOOTER_ID=ca-pub-XXXXXXXXXX-XXXXXXXXXX
```

### 7. Verificar implementación

1. Los anuncios aparecerán automáticamente en:
   - Banner superior (si `ads_enabled = true`)
   - Sidebar en listados (si `ads_enabled = true`)
   - Footer en páginas principales (si `ads_enabled = true`)

2. Los anuncios solo se muestran a usuarios con `ads_enabled = true`:
   - Plan Gratis: ✅ Anuncios activos
   - Plan Check-in: ✅ Anuncios activos
   - Plan Pro: ❌ Sin anuncios

### 8. Políticas importantes

- **No hacer clic en tus propios anuncios** (puede resultar en baneo permanente)
- **No pedir a otros que hagan clic** (viola políticas)
- **Contenido apropiado**: Tu sitio debe tener contenido real y útil
- **Tráfico orgánico**: No uses tráfico artificial

### 9. Monitoreo

- Ve a **"Informes"** o **"Reports"** en AdSense para ver:
  - Impresiones
  - Clics
  - Ingresos estimados
  - CTR (Click-Through Rate)

### 10. Pagos

- Google paga cuando acumulas mínimo 70€ (o equivalente)
- Los pagos son mensuales (entre el 21-26 de cada mes)
- Puedes configurar método de pago en **"Pagos"** o **"Payments"**

## Notas importantes

- **Aprobación puede tardar**: No te desanimes si tarda semanas
- **Ingresos variables**: Los ingresos dependen del tráfico y CTR
- **Anuncios contextuales**: Google muestra anuncios relevantes automáticamente
- **Responsive**: Los anuncios se adaptan al tamaño de pantalla

## Troubleshooting

### Los anuncios no aparecen

1. Verifica que las variables de entorno estén configuradas
2. Verifica que `ads_enabled = true` para el tenant
3. Espera unos minutos (puede tardar en cargar)
4. Verifica la consola del navegador por errores
5. Asegúrate de que AdSense esté aprobado

### Errores en consola

- `adsbygoogle.push() error`: Normal si no hay anuncios disponibles
- `Invalid ad unit ID`: Verifica que los IDs sean correctos
- `AdSense not approved`: Espera a la aprobación de Google

## Alternativas mientras esperas aprobación

Mientras esperas la aprobación de AdSense, puedes:

1. Mostrar banner de upgrade a Plan Pro (ya implementado)
2. Usar anuncios propios de partners
3. Mostrar contenido promocional de Delfín Check-in

