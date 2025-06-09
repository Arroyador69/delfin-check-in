import os

def crear_proyecto_astro(nombre_carpeta, datos):
    os.makedirs(nombre_carpeta, exist_ok=True)

    # Crear package.json con Astro y Tailwind
    with open(os.path.join(nombre_carpeta, 'package.json'), 'w') as f:
        f.write("""
{
  "name": "web-desarrollotech",
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "astro": "^4.0.0",
    "tailwindcss": "^3.3.0"
  },
  "devDependencies": {
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
""")

    # astro.config.mjs
    with open(os.path.join(nombre_carpeta, 'astro.config.mjs'), 'w') as f:
        f.write("import { defineConfig } from 'astro/config';\nexport default defineConfig({});")

    # tailwind.config.js
    with open(os.path.join(nombre_carpeta, 'tailwind.config.js'), 'w') as f:
        f.write("""
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,vue}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
""")

    # Crear carpeta de páginas
    src_path = os.path.join(nombre_carpeta, 'src', 'pages')
    os.makedirs(src_path, exist_ok=True)

    # Extraer datos del formulario
    nombre_completo = datos.get('nombre_completo', '')
    email = datos.get('email', '')
    telefono = datos.get('telefono', '')
    nombre = datos.get('nombre_proyecto', 'Proyecto sin título')
    sector = datos.get('sector', '')
    sector_otro = datos.get('sector_otro', '')
    estilos = datos.get('estilos', [])
    colores = [datos.get('color1_hex', ''), datos.get('color2_hex', ''), datos.get('color3_hex', '')]
    tipografias = datos.get('fuentes', [])
    logo_idea = datos.get('logo_idea', '')
    secciones = datos.get('secciones', [])
    menu = datos.get('menu_seleccionado', '')
    objetivo = datos.get('objetivo', '')
    redes = datos.get('redes', '')
    referencias = [datos.get('ref1', ''), datos.get('ref2', ''), datos.get('ref3', '')]
    plantilla = datos.get('plantilla_seleccionada', '')
    footer = datos.get('footer_seleccionado', '')
    presupuesto = datos.get('presupuesto', '')
    observaciones = datos.get('observaciones', '')
    fuente_descubrimiento = datos.get('fuente_descubrimiento', '')
    fecha_entrega_deseada = datos.get('fecha_entrega_deseada', '')
    autoriza_portafolio = datos.get('autoriza_portafolio', False)
    publicar_testimonio = datos.get('publicar_testimonio', False)

    # Generar HTML con todos los datos
    secciones_html = ''.join([f"<section class='my-8'><h3 class='text-xl font-semibold'>{sec}</h3><p>Contenido pendiente...</p></section>" for sec in secciones])
    estilos_html = ''.join([f"<li>{e}</li>" for e in estilos])
    referencias_html = ''.join([f"<li>{r}</li>" for r in referencias if r])

    contenido = f"""---
---
<html lang="es">
  <head>
    <meta charset='UTF-8' />
    <title>{nombre}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body {{
        background-color: {colores[1]};
        color: {colores[0]};
        font-family: {', '.join(tipografias) if tipografias else 'sans-serif'};
      }}
    </style>
  </head>
  <body class="p-6">
    <header class="mb-8">
      <h1 class="text-4xl font-bold">{nombre}</h1>
      <p class="text-lg italic">{objetivo}</p>
      <p class="text-sm">Sector: {sector} {sector_otro}</p>
    </header>

    <section class="mb-6">
      <h2 class="text-2xl font-semibold">Información del cliente</h2>
      <p><strong>Nombre:</strong> {nombre_completo}</p>
      <p><strong>Email:</strong> {email}</p>
      <p><strong>Teléfono:</strong> {telefono}</p>
    </section>

    <section class="mb-6">
      <h2 class="text-2xl font-semibold">Estilo visual deseado</h2>
      <ul class="list-disc pl-5">{estilos_html}</ul>
    </section>

    <section class="mb-6">
      <h2 class="text-2xl font-semibold">Logo</h2>
      <p>{logo_idea}</p>
    </section>

    <section class="mb-6">
      <h2 class="text-2xl font-semibold">Redes sociales</h2>
      <p>{redes}</p>
    </section>

    <section class="mb-6">
      <h2 class="text-2xl font-semibold">Referencias visuales</h2>
      <ul class="list-disc pl-5">{referencias_html}</ul>
    </section>

    <section class="mb-6">
      <h2 class="text-2xl font-semibold">Observaciones del cliente</h2>
      <p>{observaciones}</p>
    </section>

    <section class="mb-6">
      <h2 class="text-2xl font-semibold">Diseño seleccionado</h2>
      <p><strong>Menú:</strong> {menu}</p>
      <p><strong>Footer:</strong> {footer}</p>
      <p><strong>Plantilla:</strong> {plantilla}</p>
    </section>

    <section class="mb-6">
      <h2 class="text-2xl font-semibold">Información adicional</h2>
      <p><strong>Presupuesto estimado:</strong> {presupuesto}</p>
      <p><strong>Fuente de descubrimiento:</strong> {fuente_descubrimiento}</p>
      <p><strong>Fecha de entrega deseada:</strong> {fecha_entrega_deseada}</p>
      <p><strong>Autoriza portafolio:</strong> {'Sí' if autoriza_portafolio else 'No'}</p>
      <p><strong>Desea publicar testimonio:</strong> {'Sí' if publicar_testimonio else 'No'}</p>
    </section>

    <section class="mt-10">
      <h2 class="text-2xl font-bold">Estructura de la web</h2>
      {secciones_html}
    </section>

    <footer class="mt-10 border-t pt-4 text-sm text-gray-600">
      <p>Web generada automáticamente según preferencias del cliente</p>
    </footer>
  </body>
</html>
"""

    with open(os.path.join(src_path, 'index.astro'), 'w') as f:
        f.write(contenido)

    return nombre_carpeta

