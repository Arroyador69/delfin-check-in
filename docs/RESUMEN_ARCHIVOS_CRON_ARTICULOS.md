# Resumen: archivos del cron de artículos SEO

## Archivos NUEVOS (se usan)

| Archivo | Qué hace |
|--------|-----------|
| `database/migration-add-programmatic-type-article.sql` | Migración BD: añade el tipo `article` a `programmatic_pages` para que los artículos generados por cron aparezcan en Páginas Programáticas. **Ejecutar una vez en Neon.** |
| `database/insert-articulo-normativa-alquiler-turistico-2027.sql` | Insert del artículo manual "Nueva normativa alquiler turístico 2027" en `blog_articles` (para SuperAdmin). Opcional si ya lo insertaste. |
| `src/lib/cron-articles.ts` | Lógica del cron: 10 temas, `generateArticleWithOpenAI`, `buildFullArticleHTML` (header, footer, popup, waitlist completa, FAQ), `pickRandomTopics`. |
| `src/app/api/superadmin/programmatic/cron-articles/route.ts` | API GET/POST: genera 2 artículos con OpenAI, guarda en `blog_articles` + `programmatic_pages` (type article), publica en GitHub `articulos/{slug}.html` usando **GITHUB_TOKEN_LANDING**. |

## Archivos MODIFICADOS (qué hacían → qué hacen ahora)

| Archivo | Antes | Ahora |
|--------|--------|--------|
| `vercel.json` | Cron programático a 9h y 17h UTC; daily/weekly report. | **Añadido:** cron de artículos a **8:00 UTC** (9:00 Madrid) y **17:00 UTC** (18:00 Madrid), 2 ejecuciones/día. |
| `src/middleware.ts` | Rutas públicas sin `cron-articles`. | **Añadido:** `/api/superadmin/programmatic/cron-articles` como ruta pública para que Vercel Cron (o CRON_SECRET) pueda llamarla sin tenant_id. |
| `src/app/superadmin/programmatic/page.tsx` | Solo enlace "Gestionar Plantillas". | **Añadido:** enlace "Artículos / Blog", card **Cron de artículos SEO** con botón "Generar 2 artículos ahora" y resultado (creados, fallidos, enlaces). |

## Archivos que NO tocamos (siguen igual)

- **`/api/superadmin/programmatic/cron/route.ts`** – Sigue publicando páginas programáticas ya programadas (local, problem-solution, etc.) a `programmatic/*.html`. Usa `process.env.GITHUB_TOKEN` (no GITHUB_TOKEN_LANDING). **No eliminamos:** se usa para el flujo de páginas programáticas clásicas.
- **`/api/superadmin/programmatic/generate/route.ts`** – Genera una página desde plantilla + variables (OpenAI) y opcionalmente publica. **No eliminamos:** se usa desde "Gestionar Plantillas".
- **`/api/superadmin/programmatic/publish/route.ts`** – Publica una página concreta a GitHub. **No eliminamos.**
- Resto de rutas y libs de programático sin cambios.

## ¿Algo obsoleto para eliminar?

**No.** No hemos dejado ningún archivo obsoleto. El cron antiguo (`/api/superadmin/programmatic/cron`) sigue siendo necesario para publicar las páginas programáticas no-artículo (local, problem-solution, feature, comparison, pillar). El nuevo cron de artículos es un flujo adicional que escribe en `blog_articles`, `programmatic_pages` (type article) y en `articulos/*.html` con el mismo layout que el resto de artículos (header, footer, popup, waitlist completa, FAQ).

## Horario del cron de artículos (24 feb)

- **Mañana Madrid:** 8:00 UTC = **9:00 Madrid** (1 ejecución).
- **Tarde Madrid:** 17:00 UTC = **18:00 Madrid** (1 ejecución).

Cada ejecución genera **2 artículos** (temas aleatorios de los 10).
