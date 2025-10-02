#!/usr/bin/env python3
"""
Scraper para extraer emails y teléfonos de sitios web de alojamientos turísticos.
Uso: python main.py [URLs...] o python main.py --csv seeds.csv
"""

import argparse
import csv
import sys
from pathlib import Path
from typing import List, Set, Tuple

from utils import (
    build_session,
    candidate_contact_pages,
    extract_contacts,
    fetch_url,
    get_domain,
    normalize_url,
    parse_links,
    sleep_throttle,
    unique_preserve_order,
)


def scrape_site(session, url: str, max_pages: int = 5, delay: float = 1.0) -> Tuple[Set[str], Set[str]]:
    """Extrae emails y teléfonos de un sitio web."""
    url = normalize_url(url)
    domain = get_domain(url)
    
    print(f"🔍 Analizando: {url}")
    
    all_emails: Set[str] = set()
    all_phones: Set[str] = set()
    
    # Página principal
    status, ctype, html = fetch_url(session, url)
    if status != 200:
        print(f"❌ Error {status} en {url}")
        return all_emails, all_phones
    
    # Extraer contactos de la página principal
    emails, phones = extract_contacts(html)
    all_emails.update(emails)
    all_phones.update(phones)
    
    if emails or phones:
        print(f"✅ Encontrados en página principal: {len(emails)} emails, {len(phones)} teléfonos")
    
    # Buscar páginas de contacto
    links = parse_links(html, url)
    contact_pages = candidate_contact_pages(links, domain)[:max_pages-1]  # -1 porque ya procesamos la principal
    
    for i, contact_url in enumerate(contact_pages):
        if i >= max_pages - 1:
            break
            
        print(f"📄 Página de contacto {i+1}: {contact_url}")
        sleep_throttle(delay)
        
        status, ctype, html = fetch_url(session, contact_url)
        if status == 200:
            emails, phones = extract_contacts(html)
            all_emails.update(emails)
            all_phones.update(phones)
            
            if emails or phones:
                print(f"✅ Encontrados: {len(emails)} emails, {len(phones)} teléfonos")
        else:
            print(f"❌ Error {status}")
    
    return all_emails, all_phones


def main():
    parser = argparse.ArgumentParser(description="Scraper de contactos para alojamientos turísticos")
    parser.add_argument("urls", nargs="*", help="URLs a analizar")
    parser.add_argument("--csv", help="Archivo CSV con URLs (columna 'url' o primera columna)")
    parser.add_argument("--output", "-o", default="leads.csv", help="Archivo de salida (default: leads.csv)")
    parser.add_argument("--max-pages", type=int, default=5, help="Máximo páginas por sitio (default: 5)")
    parser.add_argument("--delay", type=float, default=1.0, help="Delay entre requests en segundos (default: 1.0)")
    parser.add_argument("--max-sites", type=int, help="Máximo sitios a procesar")
    
    args = parser.parse_args()
    
    # Recopilar URLs
    urls = []
    
    if args.urls:
        urls.extend(args.urls)
    
    if args.csv:
        csv_path = Path(args.csv)
        if not csv_path.exists():
            print(f"❌ Archivo CSV no encontrado: {csv_path}")
            sys.exit(1)
        
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Buscar columna 'url' o usar la primera columna
                url = row.get('url') or list(row.values())[0] if row else None
                if url and url.strip():
                    urls.append(url.strip())
    
    if not urls:
        print("❌ No se proporcionaron URLs. Usa: python main.py [URLs...] o --csv archivo.csv")
        sys.exit(1)
    
    if args.max_sites:
        urls = urls[:args.max_sites]
    
    print(f"🚀 Procesando {len(urls)} sitios...")
    
    # Configurar sesión
    session = build_session()
    
    # Procesar sitios
    results = []
    
    for i, url in enumerate(urls, 1):
        print(f"\n📍 [{i}/{len(urls)}] {url}")
        
        try:
            emails, phones = scrape_site(session, url, args.max_pages, args.delay)
            
            if emails or phones:
                results.append({
                    'url': url,
                    'emails': '; '.join(sorted(emails)),
                    'phones': '; '.join(sorted(phones)),
                    'email_count': len(emails),
                    'phone_count': len(phones),
                })
                print(f"✅ Total encontrado: {len(emails)} emails, {len(phones)} teléfonos")
            else:
                print("⚠️  No se encontraron contactos")
                results.append({
                    'url': url,
                    'emails': '',
                    'phones': '',
                    'email_count': 0,
                    'phone_count': 0,
                })
        
        except KeyboardInterrupt:
            print("\n⏹️  Interrumpido por el usuario")
            break
        except Exception as e:
            print(f"❌ Error procesando {url}: {e}")
            results.append({
                'url': url,
                'emails': '',
                'phones': '',
                'email_count': 0,
                'phone_count': 0,
            })
        
        # Delay entre sitios
        if i < len(urls):
            sleep_throttle(args.delay)
    
    # Guardar resultados
    output_path = Path(args.output)
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        if results:
            writer = csv.DictWriter(f, fieldnames=['url', 'emails', 'phones', 'email_count', 'phone_count'])
            writer.writeheader()
            writer.writerows(results)
    
    # Resumen
    total_emails = sum(r['email_count'] for r in results)
    total_phones = sum(r['phone_count'] for r in results)
    sites_with_contacts = sum(1 for r in results if r['email_count'] > 0 or r['phone_count'] > 0)
    
    print(f"\n📊 RESUMEN:")
    print(f"   Sitios procesados: {len(results)}")
    print(f"   Sitios con contactos: {sites_with_contacts}")
    print(f"   Total emails: {total_emails}")
    print(f"   Total teléfonos: {total_phones}")
    print(f"   Resultados guardados en: {output_path}")


if __name__ == "__main__":
    main()
