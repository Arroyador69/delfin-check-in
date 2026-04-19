#!/usr/bin/env python3
"""
Genera messages/fi.json desde messages/en.json usando Google Translate (deep-translator).

Reanudación: las traducciones se guardan en scripts/fi_translate_cache.json (clave = texto EN
con marcadores __PH_n__). Solo se piden a la API las claves que faltan.

Si tienes un fi.json parcial (misma estructura que en.json), se importan al caché al inicio.

Uso:
  .venv-i18n/bin/python scripts/build_fi_from_en.py
  .venv-i18n/bin/python scripts/build_fi_from_en.py --rebuild-only   # solo reensambla fi.json desde caché
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path

from deep_translator import GoogleTranslator

ROOT = Path(__file__).resolve().parents[1]
EN_PATH = ROOT / "messages" / "en.json"
OUT_PATH = ROOT / "messages" / "fi.json"
CACHE_PATH = ROOT / "scripts" / "fi_translate_cache.json"

SPECIAL_BY_PATH: dict[str, str] = {
    "dashboard.unitsAvailableToAdd": (
        "{remaining, plural, one {✅ # yksikkö voidaan lisätä} other {✅ # yksikköä voidaan lisätä}}"
    ),
    "directReservations.table.nights": "{count} yö | {count} yötä",
    "plans.roomsIncludedHint": (
        "{count, plural, one {# huone sisältyy perushintaan} other {# huonetta sisältyy perushintaan}}"
    ),
}

PLACEHOLDER_DOUBLE = re.compile(r"\{\{[^}]+\}\}")
PLACEHOLDER_SINGLE = re.compile(r"\{[a-zA-Z_][a-zA-Z0-9_.]*\}")

_translator: GoogleTranslator | None = None


def get_tr() -> GoogleTranslator:
    global _translator
    if _translator is None:
        _translator = GoogleTranslator(source="en", target="fi")
    return _translator


def protect(s: str) -> tuple[str, list[str]]:
    parts: list[str] = []

    def sub(m: re.Match[str]) -> str:
        parts.append(m.group(0))
        return f"__PH_{len(parts) - 1}__"

    t = PLACEHOLDER_DOUBLE.sub(sub, s)
    t = PLACEHOLDER_SINGLE.sub(sub, t)
    return t, parts


def unprotect(s: str, parts: list[str]) -> str:
    for i, p in enumerate(parts):
        s = s.replace(f"__PH_{i}__", p)
    return s


def fi_leaf_to_cache_value(en_s: str, fi_s: str) -> str | None:
    """Convierte par EN/FI en el valor guardado en caché (con __PH_n__)."""
    protected, parts = protect(en_s)
    if not parts:
        return fi_s
    s = fi_s
    for i, part in enumerate(parts):
        if part not in s:
            return None
        s = s.replace(part, f"__PH_{i}__", 1)
    return s


def bootstrap_cache_from_fi_json(en: object, fi: object, path: str, out: dict[str, str]) -> None:
    """Rellena out[protected] desde un fi.json existente (parcial o completo)."""
    if type(en) is not type(fi):
        return
    if isinstance(en, dict):
        for k in en:
            if k not in fi:
                continue
            bootstrap_cache_from_fi_json(en[k], fi[k], f"{path}.{k}" if path else k, out)
    elif isinstance(en, list):
        n = min(len(en), len(fi))
        for i in range(n):
            bootstrap_cache_from_fi_json(en[i], fi[i], f"{path}[{i}]", out)
    elif isinstance(en, str):
        if path in SPECIAL_BY_PATH:
            return
        en_s, fi_s = en, fi
        protected, _parts = protect(en_s)
        if fi_s == en_s:
            return
        v = fi_leaf_to_cache_value(en_s, fi_s)
        if v is not None and protected not in out:
            out[protected] = v


def rebuild_fi(en: object, path: str, ph_to_fi: dict[str, str]) -> object:
    if isinstance(en, dict):
        return {k: rebuild_fi(v, f"{path}.{k}" if path else k, ph_to_fi) for k, v in en.items()}
    if isinstance(en, list):
        return [rebuild_fi(v, f"{path}[{i}]", ph_to_fi) for i, v in enumerate(en)]
    if isinstance(en, str):
        if path in SPECIAL_BY_PATH:
            return SPECIAL_BY_PATH[path]
        protected, parts = protect(en)
        raw = ph_to_fi.get(protected, protected)
        return unprotect(raw, parts)
    return en


def load_cache() -> dict[str, str]:
    if not CACHE_PATH.exists():
        return {}
    try:
        raw = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
        if not isinstance(raw, dict):
            return {}
        return {str(k): str(v) for k, v in raw.items()}
    except json.JSONDecodeError:
        print(f"Aviso: {CACHE_PATH} no es JSON válido; se ignora.", file=sys.stderr)
        return {}


def save_cache(ph_to_fi: dict[str, str]) -> None:
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp = CACHE_PATH.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(ph_to_fi, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    tmp.replace(CACHE_PATH)


def collect_protected_list(en: object) -> list[str]:
    protected_list: list[str] = []
    seen: set[str] = set()

    def collect(obj: object, p: str) -> None:
        if isinstance(obj, dict):
            for k, v in obj.items():
                collect(v, f"{p}.{k}" if p else k)
        elif isinstance(obj, list):
            for i, v in enumerate(obj):
                collect(v, f"{p}[{i}]")
        elif isinstance(obj, str):
            if p in SPECIAL_BY_PATH:
                return
            pr, _ = protect(obj)
            if pr not in seen:
                seen.add(pr)
                protected_list.append(pr)

    collect(en, "")
    return protected_list


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--rebuild-only",
        action="store_true",
        help="Solo escribe messages/fi.json desde el caché (sin llamar a la API).",
    )
    args = ap.parse_args()

    en = json.loads(EN_PATH.read_text(encoding="utf-8"))
    protected_list = collect_protected_list(en)

    ph_to_fi: dict[str, str] = load_cache()
    bootstrapped = 0
    if OUT_PATH.exists():
        try:
            fi_existing = json.loads(OUT_PATH.read_text(encoding="utf-8"))
            before = len(ph_to_fi)
            bootstrap_cache_from_fi_json(en, fi_existing, "", ph_to_fi)
            bootstrapped = len(ph_to_fi) - before
            if bootstrapped:
                print(f"Importadas ~{bootstrapped} entradas desde {OUT_PATH.name} al caché.")
                save_cache(ph_to_fi)
        except (json.JSONDecodeError, OSError) as e:
            print(f"Aviso: no se pudo leer {OUT_PATH}: {e}", file=sys.stderr)

    missing = [p for p in protected_list if p not in ph_to_fi]

    if args.rebuild_only:
        if missing:
            print(
                f"Faltan {len(missing)} claves en caché; no se puede reensamblar completo. "
                f"Ejecuta sin --rebuild-only para traducir.",
                file=sys.stderr,
            )
            sys.exit(1)
        fi = rebuild_fi(en, "", ph_to_fi)
        OUT_PATH.write_text(json.dumps(fi, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Solo reensamblado: {OUT_PATH} ({len(ph_to_fi)} claves)")
        return

    print(
        f"Caché ({CACHE_PATH.name}): {len(ph_to_fi)} claves · "
        f"únicas EN: {len(protected_list)} · "
        f"pendientes de traducir: {len(missing)}"
    )
    if CACHE_PATH.exists() and len(ph_to_fi) == 0:
        print(
            f"Aviso: existe {CACHE_PATH} pero 0 claves cargadas (¿vacío o corrupto?).",
            file=sys.stderr,
        )

    if not missing:
        fi = rebuild_fi(en, "", ph_to_fi)
        OUT_PATH.write_text(json.dumps(fi, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Nada pendiente. Escrito {OUT_PATH}")
        return

    tr = get_tr()
    batch_size = 32
    for i in range(0, len(missing), batch_size):
        chunk = missing[i : i + batch_size]
        for attempt in range(6):
            try:
                out = tr.translate_batch(chunk)
                if len(out) != len(chunk):
                    raise RuntimeError("batch length mismatch")
                for a, b in zip(chunk, out):
                    ph_to_fi[a] = b if b is not None and str(b).strip() != "" else a
                save_cache(ph_to_fi)
                break
            except Exception as e:
                wait = 3 + attempt * 5
                print(f"batch {i // batch_size} retry {attempt + 1}: {e} (sleep {wait}s)")
                time.sleep(wait)
        else:
            raise RuntimeError(f"Failed batch at offset {i}")
        time.sleep(1.2)
        print(f"traducido {min(i + batch_size, len(missing))}/{len(missing)} pendientes · caché total {len(ph_to_fi)}")

    for k in protected_list:
        if k not in ph_to_fi:
            ph_to_fi[k] = k
    save_cache(ph_to_fi)

    fi = rebuild_fi(en, "", ph_to_fi)
    OUT_PATH.write_text(json.dumps(fi, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Listo: {OUT_PATH}")


if __name__ == "__main__":
    main()
