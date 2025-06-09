import os

def crear_proyecto_astro(nombre_carpeta, datos):
    os.makedirs(nombre_carpeta, exist_ok=True)

    # Crear package.json
    with open(os.path.join(nombre_carpeta, 'package.json'), 'w') as f:
        f.write('''{
  "name": "web-desarrollotech",
  "type": "module",
  "version": "0.0.1",
  "scripts": {
    "dev": "astro dev",
    "start": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro"
  },
  "dependencies": {
    "astro": "^4.0.0",
    "@astrojs/tailwind": "^5.0.0",
    "tailwindcss": "^3.0.24"
  }
}''')

    # Crear astro.config.mjs
    with open(os.path.join(nombre_carpeta, 'astro.config.mjs'), 'w') as f:
        f.write('''import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()]
});''')

    # Crear tailwind.config.mjs
    with open(os.path.join(nombre_carpeta, 'tailwind.config.mjs'), 'w') as f:
        f.write('''/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: '{{color1}}',
        secondary: '{{color2}}',
        accent: '{{color3}}'
      }
    },
  },
  plugins: [],
}'''.replace('{{color1}}', datos.get('color1_hex', '#000000'))
          .replace('{{color2}}', datos.get('color2_hex', '#ffffff'))
          .replace('{{color3}}', datos.get('color3_hex', '#cccccc')))

    # Crear estructura de carpetas
    src_path = os.path.join(nombre_carpeta, 'src')
    pages_path = os.path.join(src_path, 'pages')
    components_path = os.path.join(src_path, 'components')
    layouts_path = os.path.join(src_path, 'layouts')
    styles_path = os.path.join(src_path, 'styles')
    
    for path in [pages_path, components_path, layouts_path, styles_path]:
        os.makedirs(path, exist_ok=True)

    # Crear index.astro
    with open(os.path.join(pages_path, 'index.astro'), 'w') as f:
        f.write(f'''---
import Layout from '../layouts/Layout.astro';
---

<Layout title="{datos.get('nombre_proyecto', 'Proyecto sin título')}">
  <main class="container mx-auto px-4 py-8">
    <h1 class="text-4xl font-bold text-primary mb-4">{datos.get('nombre_proyecto', 'Proyecto sin título')}</h1>
    <p class="text-lg text-gray-700 mb-6">{datos.get('objetivo', 'Sin objetivo definido')}</p>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Aquí irán las secciones seleccionadas -->
      {datos.get('secciones', [])}
    </div>
  </main>
</Layout>''')

    # Crear Layout.astro
    with open(os.path.join(layouts_path, 'Layout.astro'), 'w') as f:
        f.write('''---
interface Props {
  title: string;
}

const { title } = Astro.props;
---

<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="generator" content={Astro.generator} />
    <title>{title}</title>
  </head>
  <body>
    <slot />
  </body>
</html>

<style is:global>
  :root {
    --accent: 136, 58, 234;
    --accent-light: 224, 204, 250;
    --accent-dark: 49, 10, 101;
    --accent-gradient: linear-gradient(
      45deg,
      rgb(var(--accent)),
      rgb(var(--accent-light)) 30%,
      white 60%
    );
  }
  html {
    font-family: system-ui, sans-serif;
    background: #f6f6f6;
    background-size: 224px;
  }
  code {
    font-family: Menlo, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono,
      Bitstream Vera Sans Mono, Courier New, monospace;
  }
</style>''')

    # Crear global.css
    with open(os.path.join(styles_path, 'global.css'), 'w') as f:
        f.write('''@tailwind base;
@tailwind components;
@tailwind utilities;''')

    return nombre_carpeta 