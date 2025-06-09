from flask import Flask, request, jsonify
import os
import shutil
from utils import crear_proyecto_astro
from datetime import datetime
import subprocess

app = Flask(__name__)

@app.route('/generar', methods=['POST'])
def generar_web():
    datos = request.json
    nombre = datos.get('nombre_proyecto', 'web')
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    carpeta = f"{nombre.replace(' ', '_')}_{timestamp}"

    try:
        # Crear proyecto
        path = crear_proyecto_astro(carpeta, datos)

        # Deploy a Vercel
        comando = f"npx vercel --prod --yes --cwd {path}"
        print("Ejecutando comando:", comando)
        resultado = subprocess.run(comando, shell=True, capture_output=True, text=True)
        print("STDOUT:", resultado.stdout)
        print("STDERR:", resultado.stderr)

        # Extraer URL del output
        salida = resultado.stdout
        url = None
        for linea in salida.splitlines():
            if 'https' in linea and '.vercel.app' in linea:
                url = linea.strip()
                break

        if url:
            return jsonify({"status": "ok", "url": url})
        else:
            return jsonify({
                "status": "error",
                "stdout": resultado.stdout,
                "stderr": resultado.stderr
            }), 500
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port) 
   
