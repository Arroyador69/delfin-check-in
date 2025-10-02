#!/usr/bin/env python3
"""
Ejemplo de uso del scraper Delfín Check-in
Muestra cómo usar el scraper programáticamente
"""

import subprocess
import sys
from pathlib import Path

def ejemplo_basico():
    """Ejemplo básico de uso del scraper"""
    print("🐬 Ejemplo de uso del Scraper Delfín Check-in")
    print("=" * 50)
    
    # Verificar que el entorno virtual esté activo
    if not Path("venv").exists():
        print("❌ No se encontró el entorno virtual. Ejecuta:")
        print("   python3 -m venv venv")
        print("   source venv/bin/activate")
        print("   pip install -r requirements.txt")
        return
    
    print("✅ Entorno virtual encontrado")
    
    # Ejemplo 1: URLs directas
    print("\n📝 Ejemplo 1: Analizar URLs directas")
    print("Comando: python main.py https://www.hostelworld.com --max-pages 2")
    
    # Ejemplo 2: Desde CSV
    print("\n📝 Ejemplo 2: Desde archivo CSV")
    print("Comando: python main.py --csv seeds_example.csv --max-sites 3")
    
    # Ejemplo 3: Opciones avanzadas
    print("\n📝 Ejemplo 3: Con opciones avanzadas")
    print("Comando: python main.py --csv test_sites.csv --output resultados.csv --delay 2.0")
    
    print("\n🚀 Para ejecutar cualquiera de estos ejemplos:")
    print("1. Activa el entorno virtual: source venv/bin/activate")
    print("2. Ejecuta el comando deseado")
    print("3. Revisa el archivo leads.csv o resultados.csv")

def crear_csv_ejemplo():
    """Crea un CSV de ejemplo con sitios reales"""
    csv_content = """url,name,region
https://www.hostelworld.com,HostelWorld,Global
https://www.airbnb.es,Airbnb España,España
https://www.booking.com,Booking.com,Global
"""
    
    with open("ejemplo_sitios_reales.csv", "w", encoding="utf-8") as f:
        f.write(csv_content)
    
    print("✅ Creado archivo: ejemplo_sitios_reales.csv")
    print("   Puedes usarlo con: python main.py --csv ejemplo_sitios_reales.csv")

if __name__ == "__main__":
    ejemplo_basico()
    print("\n" + "=" * 50)
    crear_csv_ejemplo()
