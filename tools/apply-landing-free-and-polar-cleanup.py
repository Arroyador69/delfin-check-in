#!/usr/bin/env python3
"""Reemplaza bloque Polar en landings, añade formulario plan gratis y corrige enlaces de pago."""
from __future__ import annotations

import re
from pathlib import Path

_script = Path(__file__).resolve()
# Repo marketing junto a delfin-check-in: …/delfincheckin.com/delfincheckin.com-repo
ROOT = _script.parents[2] / "delfincheckin.com-repo"
if not (ROOT / "index.html").is_file():
    # Copia del script dentro del repo marketing: …/delfincheckin.com-repo/tools/…
    ROOT = _script.parents[1]

# (ruta relativa, locale en URL admin ej. es/en/it, locale API para Polar y signup-free)
FILES: list[tuple[str, str, str]] = [
    ("index.html", "es", "es"),
    ("en/index.html", "en", "en"),
    ("it/index.html", "it", "it"),
    ("pt/index.html", "pt", "pt"),
    ("fr/index.html", "fr", "fr"),
    ("fi/index.html", "fi", "fi"),
    ("sv/index.html", "sv", "es"),
]

BLOCKS: dict[str, str] = {
    "es": """    <!-- Plan gratuito: email → onboarding -->
    <section id="registro" class="section container" style="max-width: 640px; margin: 48px auto;">
      <div class="card" style="padding: 28px;">
        <h2 style="margin-top: 0; font-size: 26px;">Empezar con el plan gratuito</h2>
        <p class="lead" style="margin-bottom: 20px;">Introduce tu email y te enviamos el enlace para activar tu cuenta y completar el onboarding.</p>
        <form id="landingFreeSignupForm" data-signup-locale="es" style="display: grid; gap: 16px;">
          <label>
            <span style="display:block;font-weight:600;margin-bottom:6px;">Email *</span>
            <input id="landingFreeSignupEmail" type="email" required placeholder="tu@email.com" style="width:100%;height:48px;border-radius:10px;border:2px solid rgba(15,23,42,.2);padding:0 14px;font-size:16px;">
          </label>
          <label>
            <span style="display:block;font-weight:600;margin-bottom:6px;">Nombre (opcional)</span>
            <input id="landingFreeSignupName" type="text" placeholder="Tu nombre" style="width:100%;height:48px;border-radius:10px;border:2px solid rgba(15,23,42,.2);padding:0 14px;font-size:16px;">
          </label>
          <button type="submit" id="landingFreeSignupSubmit" class="btn primary" style="width:100%;padding:14px;font-size:17px;font-weight:700;">
            <span id="landingFreeSignupSubmitText">Enviar enlace al email</span>
            <span id="landingFreeSignupLoading" style="display:none;">Enviando…</span>
          </button>
          <div id="landingFreeSignupMessage" role="status" style="display:none;padding:12px;border-radius:8px;font-size:15px;"></div>
        </form>
      </div>
    </section>

""",
    "en": """    <!-- Free plan: email → onboarding -->
    <section id="registro" class="section container" style="max-width: 640px; margin: 48px auto;">
      <div class="card" style="padding: 28px;">
        <h2 style="margin-top: 0; font-size: 26px;">Start with the free plan</h2>
        <p class="lead" style="margin-bottom: 20px;">Enter your email and we will send you a link to activate your account and finish onboarding.</p>
        <form id="landingFreeSignupForm" data-signup-locale="en" style="display: grid; gap: 16px;">
          <label>
            <span style="display:block;font-weight:600;margin-bottom:6px;">Email *</span>
            <input id="landingFreeSignupEmail" type="email" required placeholder="you@email.com" style="width:100%;height:48px;border-radius:10px;border:2px solid rgba(15,23,42,.2);padding:0 14px;font-size:16px;">
          </label>
          <label>
            <span style="display:block;font-weight:600;margin-bottom:6px;">Name (optional)</span>
            <input id="landingFreeSignupName" type="text" placeholder="Your name" style="width:100%;height:48px;border-radius:10px;border:2px solid rgba(15,23,42,.2);padding:0 14px;font-size:16px;">
          </label>
          <button type="submit" id="landingFreeSignupSubmit" class="btn primary" style="width:100%;padding:14px;font-size:17px;font-weight:700;">
            <span id="landingFreeSignupSubmitText">Email me the link</span>
            <span id="landingFreeSignupLoading" style="display:none;">Sending…</span>
          </button>
          <div id="landingFreeSignupMessage" role="status" style="display:none;padding:12px;border-radius:8px;font-size:15px;"></div>
        </form>
      </div>
    </section>

""",
    "it": """    <!-- Piano gratuito: email → onboarding -->
    <section id="registro" class="section container" style="max-width: 640px; margin: 48px auto;">
      <div class="card" style="padding: 28px;">
        <h2 style="margin-top: 0; font-size: 26px;">Inizia con il piano gratuito</h2>
        <p class="lead" style="margin-bottom: 20px;">Inserisci la tua email e ti inviamo il link per attivare l’account e completare l’onboarding.</p>
        <form id="landingFreeSignupForm" data-signup-locale="it" style="display: grid; gap: 16px;">
          <label>
            <span style="display:block;font-weight:600;margin-bottom:6px;">Email *</span>
            <input id="landingFreeSignupEmail" type="email" required placeholder="tu@email.com" style="width:100%;height:48px;border-radius:10px;border:2px solid rgba(15,23,42,.2);padding:0 14px;font-size:16px;">
          </label>
          <label>
            <span style="display:block;font-weight:600;margin-bottom:6px;">Nome (opzionale)</span>
            <input id="landingFreeSignupName" type="text" placeholder="Il tuo nome" style="width:100%;height:48px;border-radius:10px;border:2px solid rgba(15,23,42,.2);padding:0 14px;font-size:16px;">
          </label>
          <button type="submit" id="landingFreeSignupSubmit" class="btn primary" style="width:100%;padding:14px;font-size:17px;font-weight:700;">
            <span id="landingFreeSignupSubmitText">Inviami il link</span>
            <span id="landingFreeSignupLoading" style="display:none;">Invio in corso…</span>
          </button>
          <div id="landingFreeSignupMessage" role="status" style="display:none;padding:12px;border-radius:8px;font-size:15px;"></div>
        </form>
      </div>
    </section>

""",
    "pt": """    <!-- Plano grátis: email → onboarding -->
    <section id="registro" class="section container" style="max-width: 640px; margin: 48px auto;">
      <div class="card" style="padding: 28px;">
        <h2 style="margin-top: 0; font-size: 26px;">Comece com o plano grátis</h2>
        <p class="lead" style="margin-bottom: 20px;">Introduza o seu email e enviaremos a ligação para ativar a conta e concluir o onboarding.</p>
        <form id="landingFreeSignupForm" data-signup-locale="pt" style="display: grid; gap: 16px;">
          <label>
            <span style="display:block;font-weight:600;margin-bottom:6px;">Email *</span>
            <input id="landingFreeSignupEmail" type="email" required placeholder="seu@email.com" style="width:100%;height:48px;border-radius:10px;border:2px solid rgba(15,23,42,.2);padding:0 14px;font-size:16px;">
          </label>
          <label>
            <span style="display:block;font-weight:600;margin-bottom:6px;">Nome (opcional)</span>
            <input id="landingFreeSignupName" type="text" placeholder="O seu nome" style="width:100%;height:48px;border-radius:10px;border:2px solid rgba(15,23,42,.2);padding:0 14px;font-size:16px;">
          </label>
          <button type="submit" id="landingFreeSignupSubmit" class="btn primary" style="width:100%;padding:14px;font-size:17px;font-weight:700;">
            <span id="landingFreeSignupSubmitText">Enviar ligação por email</span>
            <span id="landingFreeSignupLoading" style="display:none;">A enviar…</span>
          </button>
          <div id="landingFreeSignupMessage" role="status" style="display:none;padding:12px;border-radius:8px;font-size:15px;"></div>
        </form>
      </div>
    </section>

""",
    "fr": """    <!-- Plan gratuit : e-mail → onboarding -->
    <section id="registro" class="section container" style="max-width: 640px; margin: 48px auto;">
      <div class="card" style="padding: 28px;">
        <h2 style="margin-top: 0; font-size: 26px;">Commencer avec le plan gratuit</h2>
        <p class="lead" style="margin-bottom: 20px;">Saisissez votre e-mail : nous vous enverrons un lien pour activer votre compte et terminer l’onboarding.</p>
        <form id="landingFreeSignupForm" data-signup-locale="fr" style="display: grid; gap: 16px;">
          <label>
            <span style="display:block;font-weight:600;margin-bottom:6px;">E-mail *</span>
            <input id="landingFreeSignupEmail" type="email" required placeholder="vous@email.com" style="width:100%;height:48px;border-radius:10px;border:2px solid rgba(15,23,42,.2);padding:0 14px;font-size:16px;">
          </label>
          <label>
            <span style="display:block;font-weight:600;margin-bottom:6px;">Nom (facultatif)</span>
            <input id="landingFreeSignupName" type="text" placeholder="Votre nom" style="width:100%;height:48px;border-radius:10px;border:2px solid rgba(15,23,42,.2);padding:0 14px;font-size:16px;">
          </label>
          <button type="submit" id="landingFreeSignupSubmit" class="btn primary" style="width:100%;padding:14px;font-size:17px;font-weight:700;">
            <span id="landingFreeSignupSubmitText">Recevoir le lien par e-mail</span>
            <span id="landingFreeSignupLoading" style="display:none;">Envoi en cours…</span>
          </button>
          <div id="landingFreeSignupMessage" role="status" style="display:none;padding:12px;border-radius:8px;font-size:15px;"></div>
        </form>
      </div>
    </section>

""",
    "fi": """    <!-- Ilmainen suunnitelma: sähköposti → onboarding -->
    <section id="registro" class="section container" style="max-width: 640px; margin: 48px auto;">
      <div class="card" style="padding: 28px;">
        <h2 style="margin-top: 0; font-size: 26px;">Aloita ilmaisella suunnitelmalla</h2>
        <p class="lead" style="margin-bottom: 20px;">Syötä sähköpostiosoitteesi, niin lähetämme linkin tilin aktivointiin ja onboardingin viimeistelyyn.</p>
        <form id="landingFreeSignupForm" data-signup-locale="fi" style="display: grid; gap: 16px;">
          <label>
            <span style="display:block;font-weight:600;margin-bottom:6px;">Sähköposti *</span>
            <input id="landingFreeSignupEmail" type="email" required placeholder="sinä@email.com" style="width:100%;height:48px;border-radius:10px;border:2px solid rgba(15,23,42,.2);padding:0 14px;font-size:16px;">
          </label>
          <label>
            <span style="display:block;font-weight:600;margin-bottom:6px;">Nimi (valinnainen)</span>
            <input id="landingFreeSignupName" type="text" placeholder="Nimesi" style="width:100%;height:48px;border-radius:10px;border:2px solid rgba(15,23,42,.2);padding:0 14px;font-size:16px;">
          </label>
          <button type="submit" id="landingFreeSignupSubmit" class="btn primary" style="width:100%;padding:14px;font-size:17px;font-weight:700;">
            <span id="landingFreeSignupSubmitText">Lähetä linkki sähköpostiin</span>
            <span id="landingFreeSignupLoading" style="display:none;">Lähetetään…</span>
          </button>
          <div id="landingFreeSignupMessage" role="status" style="display:none;padding:12px;border-radius:8px;font-size:15px;"></div>
        </form>
      </div>
    </section>

""",
    "sv": """    <!-- Gratisplan: e-post → onboarding -->
    <section id="registro" class="section container" style="max-width: 640px; margin: 48px auto;">
      <div class="card" style="padding: 28px;">
        <h2 style="margin-top: 0; font-size: 26px;">Börja med gratisplanen</h2>
        <p class="lead" style="margin-bottom: 20px;">Ange din e-postadress så skickar vi en länk för att aktivera kontot och slutföra onboarding.</p>
        <form id="landingFreeSignupForm" data-signup-locale="es" style="display: grid; gap: 16px;">
          <label>
            <span style="display:block;font-weight:600;margin-bottom:6px;">E-post *</span>
            <input id="landingFreeSignupEmail" type="email" required placeholder="du@email.com" style="width:100%;height:48px;border-radius:10px;border:2px solid rgba(15,23,42,.2);padding:0 14px;font-size:16px;">
          </label>
          <label>
            <span style="display:block;font-weight:600;margin-bottom:6px;">Namn (valfritt)</span>
            <input id="landingFreeSignupName" type="text" placeholder="Ditt namn" style="width:100%;height:48px;border-radius:10px;border:2px solid rgba(15,23,42,.2);padding:0 14px;font-size:16px;">
          </label>
          <button type="submit" id="landingFreeSignupSubmit" class="btn primary" style="width:100%;padding:14px;font-size:17px;font-weight:700;">
            <span id="landingFreeSignupSubmitText">Skicka länken till min e-post</span>
            <span id="landingFreeSignupLoading" style="display:none;">Skickar…</span>
          </button>
          <div id="landingFreeSignupMessage" role="status" style="display:none;padding:12px;border-radius:8px;font-size:15px;"></div>
        </form>
      </div>
    </section>

""",
}

POLAR_RE = re.compile(
    r"\s*<!-- Contratar / Polar \(sin waitlist\) -->.*?(?=<!-- Formulario de Contacto -->)",
    re.DOTALL,
)

REDIRECT = "https://admin.delfincheckin.com/api/polar/subscribe-redirect"


def paid_replacements(path_locale: str, api_loc: str) -> list[tuple[str, str]]:
    base = f"https://admin.delfincheckin.com/{path_locale}/subscribe?source=delfincheckin"
    return [
        (
            f'{base}" style="width: 100%; text-align: center; padding: 16px; font-size: 18px; font-weight: 700; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);',
            f'{REDIRECT}?plan=checkin&locale={api_loc}&seats=1&interval=month" style="width: 100%; text-align: center; padding: 16px; font-size: 18px; font-weight: 700; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);',
        ),
        (
            f'{base}" style="width: 100%; text-align: center; padding: 16px; font-size: 18px; font-weight: 700; background: linear-gradient(135deg, #d97706 0%, #b45309 100%);',
            f'{REDIRECT}?plan=standard&locale={api_loc}&seats=1&interval=month" style="width: 100%; text-align: center; padding: 16px; font-size: 18px; font-weight: 700; background: linear-gradient(135deg, #d97706 0%, #b45309 100%);',
        ),
        (
            f'{base}" style="width: 100%; text-align: center; padding: 16px; font-size: 18px; font-weight: 700; background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);',
            f'{REDIRECT}?plan=pro&locale={api_loc}&seats=1&interval=month" style="width: 100%; text-align: center; padding: 16px; font-size: 18px; font-weight: 700; background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);',
        ),
    ]


def main() -> None:
    for rel, path_lc, api_lc in FILES:
        p = ROOT / rel
        text = p.read_text(encoding="utf-8")
        block_lang = "sv" if path_lc == "sv" else api_lc
        new_block = BLOCKS.get(block_lang, BLOCKS["es"])
        text_new, n = POLAR_RE.subn("\n" + new_block, text, count=1)
        if n == 1:
            text = text_new
        elif "landingFreeSignupForm" in text:
            print("skip (sin bloque Polar; ya está el formulario gratuito)", rel)
        else:
            raise SystemExit(f"{rel}: bloque Polar no encontrado y sin formulario gratuito (n={n})")

        for old, new in paid_replacements(path_lc, api_lc):
            if old in text:
                text = text.replace(old, new)

        free_href = f"https://admin.delfincheckin.com/{path_lc}/subscribe?source=delfincheckin"
        text = text.replace(f'href="{free_href}"', 'href="#registro"')
        text = text.replace(f"href='{free_href}'", "href='#registro'")

        p.write_text(text, encoding="utf-8")
        print("OK", rel)


if __name__ == "__main__":
    main()
