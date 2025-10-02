import re
import time
import urllib.parse
from typing import Iterable, List, Set, Tuple, Optional

import requests
import tldextract
from bs4 import BeautifulSoup


USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/126.0.0.0 Safari/537.36"
)


def build_session(timeout_seconds: float = 20.0) -> requests.Session:
    session = requests.Session()
    session.headers.update({
        "User-Agent": USER_AGENT,
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Connection": "close",
    })
    session.timeout = timeout_seconds  # type: ignore[attr-defined]
    return session


def normalize_url(url_or_domain: str) -> str:
    url_or_domain = url_or_domain.strip()
    if not url_or_domain:
        return url_or_domain
    if not re.match(r"^https?://", url_or_domain, re.I):
        return f"https://{url_or_domain}"
    return url_or_domain


def get_domain(url: str) -> str:
    parsed = urllib.parse.urlparse(url)
    host = parsed.netloc or parsed.path
    return host.lower()


def same_domain(url: str, domain: str) -> bool:
    return get_domain(url).endswith(domain)


def sleep_throttle(delay_seconds: float) -> None:
    if delay_seconds > 0:
        time.sleep(delay_seconds)


def fetch_url(session: requests.Session, url: str, timeout: float = 20.0) -> Tuple[int, str, str]:
    try:
        resp = session.get(url, timeout=timeout, allow_redirects=True)
        text = resp.text or ""
        ctype = resp.headers.get("Content-Type", "")
        return resp.status_code, ctype, text
    except requests.RequestException:
        return 0, "", ""


def parse_links(html: str, base_url: str) -> List[str]:
    soup = BeautifulSoup(html, "lxml")
    links: List[str] = []
    for a in soup.find_all("a", href=True):
        href = urllib.parse.urljoin(base_url, a["href"])  # absolutiza
        links.append(href)
    return links


CONTACT_KEYWORDS = [
    "contact", "contacto", "contact-us", "about", "sobre", "quienes-somos",
    "quienesomos", "aviso-legal", "avisolegal", "legal", "privacidad", "privacy",
]


def score_contact_url(url: str) -> int:
    url_l = url.lower()
    score = 0
    for kw in CONTACT_KEYWORDS:
        if kw in url_l:
            score += 2
    if url_l.endswith("/contact") or url_l.endswith("/contacto"):
        score += 1
    return score


EMAIL_REGEX = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I)

# Busca teléfonos españoles habituales (móvil/fiijo) con separadores comunes
PHONE_REGEX = re.compile(
    r"(?:\+34\s*)?(?:\(?0?\)?\s*)?(?:[6789]\d{2}|9\d{2}|8\d{2})(?:[\s.-]?\d{2}){3}",
    re.I,
)


def extract_contacts(text: str) -> Tuple[Set[str], Set[str]]:
    emails = set(EMAIL_REGEX.findall(text or ""))
    raw_phones = set(PHONE_REGEX.findall(text or ""))
    phones = {normalize_es_phone(p) for p in raw_phones if p}
    phones = {p for p in phones if p}
    return emails, phones


def normalize_es_phone(phone: str) -> str:
    digits = re.sub(r"\D+", "", phone)
    if not digits:
        return ""
    # Añade prefijo +34 si parece número nacional de 9 dígitos
    if len(digits) == 9:
        return "+34" + digits
    if len(digits) == 11 and digits.startswith("34"):
        return "+" + digits
    if len(digits) == 12 and digits.startswith("034"):
        return "+" + digits[1:]
    if digits.startswith("+"):
        return digits
    # fallback: devuelve con + si parece internacional
    return "+" + digits if digits else ""


def unique_preserve_order(values: Iterable[str]) -> List[str]:
    seen: Set[str] = set()
    out: List[str] = []
    for v in values:
        if v and v not in seen:
            seen.add(v)
            out.append(v)
    return out


def candidate_contact_pages(links: List[str], base_domain: str) -> List[str]:
    same_domain_links = [u for u in links if same_domain(u, base_domain)]
    ranked = sorted(same_domain_links, key=lambda u: score_contact_url(u), reverse=True)
    return unique_preserve_order(ranked)


# Heurísticas simples para España y CCAA
SPAIN_KEYWORDS = [
    "españa", "spain", "es-es", "+34", ".es", "es_ES",
]

CCAA_KEYWORDS = {
    # Andalucía
    "andalucía": "Andalucía", "sevilla": "Andalucía", "málaga": "Andalucía", "granada": "Andalucía",
    "córdoba": "Andalucía", "cádiz": "Andalucía", "huelva": "Andalucía", "almería": "Andalucía", "jaén": "Andalucía",
    # Aragón
    "aragón": "Aragón", "zaragoza": "Aragón", "huesca": "Aragón", "teruel": "Aragón",
    # Asturias
    "asturias": "Principado de Asturias", "oviedo": "Principado de Asturias", "gijón": "Principado de Asturias",
    # Illes Balears
    "illes balears": "Illes Balears", "islas baleares": "Illes Balears", "mallorca": "Illes Balears",
    "menorca": "Illes Balears", "ibiza": "Illes Balears", "eivissa": "Illes Balears",
    # Canarias
    "canarias": "Canarias", "tenerife": "Canarias", "gran canaria": "Canarias", "lanzarote": "Canarias", "fuerteventura": "Canarias",
    # Cantabria
    "cantabria": "Cantabria", "santander": "Cantabria",
    # Castilla y León
    "castilla y león": "Castilla y León", "castilla y leon": "Castilla y León", "valladolid": "Castilla y León",
    "burgos": "Castilla y León", "león": "Castilla y León", "soria": "Castilla y León", "zamora": "Castilla y León",
    "salamanca": "Castilla y León", "ávila": "Castilla y León", "palencia": "Castilla y León", "segovia": "Castilla y León",
    # Castilla-La Mancha
    "castilla-la mancha": "Castilla-La Mancha", "castilla la mancha": "Castilla-La Mancha",
    "albacete": "Castilla-La Mancha", "ciudad real": "Castilla-La Mancha", "cuenca": "Castilla-La Mancha",
    "guadalajara": "Castilla-La Mancha", "toledo": "Castilla-La Mancha",
    # Cataluña (a excluir)
    "cataluña": "Cataluña", "catalunya": "Cataluña", "barcelona": "Cataluña", "girona": "Cataluña",
    "lleida": "Cataluña", "tarragona": "Cataluña",
    # Comunidad Valenciana
    "comunitat valenciana": "Comunitat Valenciana", "comunidad valenciana": "Comunitat Valenciana",
    "valencia": "Comunitat Valenciana", "castellón": "Comunitat Valenciana", "castellon": "Comunitat Valenciana",
    "alicante": "Comunitat Valenciana",
    # Extremadura
    "extremadura": "Extremadura", "cáceres": "Extremadura", "caceres": "Extremadura", "badajoz": "Extremadura",
    # Galicia
    "galicia": "Galicia", "a coruña": "Galicia", "lugo": "Galicia", "ourense": "Galicia", "pontevedra": "Galicia",
    # La Rioja
    "la rioja": "La Rioja", "logroño": "La Rioja", "logrono": "La Rioja",
    # Comunidad de Madrid
    "comunidad de madrid": "Comunidad de Madrid", "madrid": "Comunidad de Madrid",
    # Región de Murcia
    "región de murcia": "Región de Murcia", "region de murcia": "Región de Murcia", "murcia": "Región de Murcia",
    # Navarra
    "navarra": "Comunidad Foral de Navarra", "pamplona": "Comunidad Foral de Navarra",
    # País Vasco (a excluir)
    "país vasco": "País Vasco", "pais vasco": "País Vasco", "euskadi": "País Vasco", "bizkaia": "País Vasco",
    "vizcaya": "País Vasco", "gipuzkoa": "País Vasco", "guipúzcoa": "País Vasco", "araba": "País Vasco", "álava": "País Vasco", "alava": "País Vasco",
    # Ceuta y Melilla
    "ceuta": "Ceuta", "melilla": "Melilla",
}


def detect_is_spain(url: str, html: str) -> bool:
    url_l = url.lower()
    html_l = (html or "").lower()
    if any(k in url_l for k in SPAIN_KEYWORDS):
        return True
    if any(k in html_l for k in SPAIN_KEYWORDS):
        return True
    # dominio .es
    ext = tldextract.extract(url)
    if ext.suffix == "es":
        return True
    # presencia de prefijo +34 en teléfonos ya sugiere España
    if "+34" in html_l:
        return True
    return False


def detect_ccaa(html: str) -> Optional[str]:
    html_l = (html or "").lower()
    # Buscar por keywords de CCAA y provincias
    for kw, ccaa in CCAA_KEYWORDS.items():
        if kw in html_l:
            return ccaa
    return None



