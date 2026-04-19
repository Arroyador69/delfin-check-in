#!/usr/bin/env python3
"""
Sustituye el bloque `ru` por `it`, `pt`, `fi` en _formulario_publico_update/index.html
(traducción automática desde el bloque `en`).
Requiere: deep-translator, node en PATH.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FORM = ROOT / "_formulario_publico_update" / "index.html"
VENV_PY = (ROOT / ".venv-formulario" / "bin" / "python3").resolve()

if VENV_PY.exists() and Path(sys.executable).resolve() != VENV_PY:
    os.execv(str(VENV_PY), [str(VENV_PY), str(Path(__file__).resolve())] + sys.argv[1:])  # noqa: S606


def extract_inner_braces(html: str, label: str) -> str | None:
    needle = f"\n            {label}: {{"
    i = html.find(needle)
    if i < 0:
        return None
    brace_start = html.find("{", i)
    depth = 0
    for j in range(brace_start, len(html)):
        c = html[j]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return html[brace_start : j + 1]
    return None


def js_object_to_pairs(obj_src: str) -> dict[str, str]:
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".txt", delete=False, encoding="utf-8"
    ) as tmp:
        tmp.write(obj_src)
        path = tmp.name
    node = r"""
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync(process.argv[1], 'utf8').trim();
const o = vm.runInNewContext('(' + src + ')', Object.create(null));
console.log(JSON.stringify(o));
"""
    r = subprocess.run(
        ["node", "-e", node, path],
        capture_output=True,
        text=True,
        cwd=str(ROOT),
    )
    Path(path).unlink(missing_ok=True)
    if r.returncode != 0:
        print(r.stderr, file=sys.stderr)
        raise RuntimeError("node eval failed")
    return json.loads(r.stdout.strip())


def format_lang_block(lang: str, pairs: dict[str, str]) -> str:
    inner = "                "
    lines = [f'{inner}"{k}": {json.dumps(v, ensure_ascii=False)}' for k, v in pairs.items()]
    return (
        "            "
        + lang
        + ": {\n"
        + ",\n".join(lines)
        + "\n            }"
    )


def replace_ru_block(html: str, new_middle: str) -> str:
    marker = "\n            ru: {"
    start = html.find(marker)
    if start < 0:
        raise ValueError("No se encontró el bloque ru")
    brace_open = start + len(marker) - 1
    depth = 0
    for j in range(brace_open, len(html)):
        c = html[j]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                end = j + 1
                return html[:start] + new_middle + html[end:]
    raise ValueError("Llaves desbalanceadas en ru")


def ensure_deep_translator():
    try:
        from deep_translator import GoogleTranslator  # noqa: F401
    except ImportError:
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "deep-translator==1.11.4", "-q"],
            cwd=str(ROOT),
        )


def main() -> None:
    if not FORM.exists():
        print("Falta", FORM, file=sys.stderr)
        sys.exit(1)

    html = FORM.read_text(encoding="utf-8")

    en_inner = extract_inner_braces(html, "en")
    if not en_inner:
        sys.exit("No se pudo leer el bloque en")

    pairs_en = js_object_to_pairs(en_inner)
    unique_vals = list(dict.fromkeys(pairs_en.values()))

    ensure_deep_translator()
    from deep_translator import GoogleTranslator

    def translate_all(target: str) -> dict[str, str]:
        t = GoogleTranslator(source="en", target=target)
        out: dict[str, str] = {}
        for v in unique_vals:
            try:
                out[v] = t.translate(v)
            except Exception:
                time.sleep(1.2)
                out[v] = t.translate(v)
            time.sleep(0.15)
        return out

    print(f"Traduciendo {len(unique_vals)} cadenas únicas → it, pt, fi…")
    m_it = translate_all("it")
    m_pt = translate_all("pt")
    m_fi = translate_all("fi")

    pairs_it = {k: m_it[v] for k, v in pairs_en.items()}
    pairs_pt = {k: m_pt[v] for k, v in pairs_en.items()}
    pairs_fi = {k: m_fi[v] for k, v in pairs_en.items()}

    new_middle = (
        "\n"
        + format_lang_block("it", pairs_it)
        + ",\n"
        + format_lang_block("pt", pairs_pt)
        + ",\n"
        + format_lang_block("fi", pairs_fi)
    )

    new_html = replace_ru_block(html, new_middle)

    old_btns = """                <div class="flex flex-wrap items-center gap-2">
                    <button class="language-btn active" data-lang="es" onclick="changeLanguage('es')">
                        🇪🇸 ES
                    </button>
                    <button class="language-btn" data-lang="en" onclick="changeLanguage('en')">
                        🇬🇧 EN
                    </button>
                    <button class="language-btn" data-lang="fr" onclick="changeLanguage('fr')">
                        🇫🇷 FR
                    </button>
                    <button class="language-btn" data-lang="ru" onclick="changeLanguage('ru')">
                        🇷🇺 RU
                    </button>
                </div>"""
    new_btns = """                <div class="flex flex-wrap items-center gap-2">
                    <button class="language-btn active" data-lang="es" onclick="changeLanguage('es')">
                        🇪🇸 ES
                    </button>
                    <button class="language-btn" data-lang="en" onclick="changeLanguage('en')">
                        🇬🇧 EN
                    </button>
                    <button class="language-btn" data-lang="it" onclick="changeLanguage('it')">
                        🇮🇹 IT
                    </button>
                    <button class="language-btn" data-lang="pt" onclick="changeLanguage('pt')">
                        🇵🇹 PT
                    </button>
                    <button class="language-btn" data-lang="fr" onclick="changeLanguage('fr')">
                        🇫🇷 FR
                    </button>
                    <button class="language-btn" data-lang="fi" onclick="changeLanguage('fi')">
                        🇫🇮 FI
                    </button>
                </div>"""
    if old_btns not in new_html:
        raise ValueError("Bloque de botones de idioma no coincide; revisa index.html")
    new_html = new_html.replace(old_btns, new_btns, 1)

    new_html = new_html.replace(
        "language === 'ru' ? 'ru' : 'es'",
        "({ es: 'es', en: 'en', fr: 'fr', it: 'it', pt: 'pt-PT', fi: 'fi' })[language] || 'en'",
    )

    new_html = new_html.replace(
        """emptyOption.textContent = language === 'es' ? 'Seleccione país' : 
                                       language === 'en' ? 'Select country' :
                                       language === 'fr' ? 'Sélectionnez le pays' : 'Выберите страну';""",
        """emptyOption.textContent = language === 'es' ? 'Seleccione país' :
                                       language === 'en' ? 'Select country' :
                                       language === 'fr' ? 'Sélectionnez le pays' :
                                       language === 'it' ? 'Seleziona paese' :
                                       language === 'pt' ? 'Selecione o país' :
                                       language === 'fi' ? 'Valitse maa' : 'Select country';""",
    )
    new_html = new_html.replace(
        """emptyOption.textContent = language === 'es' ? 'Seleccione nacionalidad' : 
                                       language === 'en' ? 'Select nationality' :
                                       language === 'fr' ? 'Sélectionnez la nationalité' : 'Выберите национальность';""",
        """emptyOption.textContent = language === 'es' ? 'Seleccione nacionalidad' :
                                       language === 'en' ? 'Select nationality' :
                                       language === 'fr' ? 'Sélectionnez la nationalité' :
                                       language === 'it' ? 'Seleziona nazionalità' :
                                       language === 'pt' ? 'Selecione a nacionalidade' :
                                       language === 'fi' ? 'Valitse kansallisuus' : 'Select nationality';""",
    )

    new_html = new_html.replace(
        """const technicalContactLabel = lang === 'es' ? 'Contacto técnico' : 
                                            lang === 'en' ? 'Technical contact' :
                                            lang === 'fr' ? 'Contact technique' : 'Технический контакт';""",
        """const technicalContactLabel = lang === 'es' ? 'Contacto técnico' :
                                            lang === 'en' ? 'Technical contact' :
                                            lang === 'fr' ? 'Contact technique' :
                                            lang === 'it' ? 'Contatto tecnico' :
                                            lang === 'pt' ? 'Contacto técnico' :
                                            lang === 'fi' ? 'Tekninen tuki' : 'Technical contact';""",
    )

    new_html = new_html.replace(
        """                name: country.name[language] || country.name.es || country.name.en""",
        """                name: country.name[['it','pt','fi'].includes(language) ? 'en' : language] || country.name[language] || country.name.en || country.name.es""",
    )

    FORM.write_text(new_html, encoding="utf-8")
    print("OK:", FORM)


if __name__ == "__main__":
    main()
