#!/usr/bin/env python3
"""Formulario + popup de captación (visible, estilo Delfín)."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "external" / "delfincheckin.com"

UI: dict[str, dict[str, str]] = {
    "es": {
        "badge": "🐬 Pruébalo ahora · sin tarjeta",
        "title": "En 2 minutos puedes estar usándolo",
        "sub": "Cumple el <strong>parte de viajeros</strong> al <strong>Ministerio del Interior</strong> (RD 933/2021). Solo tu email para empezar.",
        "s1": "Tu email", "s2": "Revisa el correo", "s3": "Registra 1 propiedad",
        "email_ph": "tu@email.com", "name_ph": "Tu nombre (opcional)", "name_l": "Nombre (opcional)",
        "email_l": "Email", "fine": "Te enviamos el enlace de acceso al sistema. Revisa spam si no lo ves.",
        "popup_title": "Pruébalo ahora — gratis",
        "popup_sub": "Digitaliza el parte de viajeros y cumple con el Ministerio del Interior. <strong>En ~2 minutos</strong> puedes entrar al panel.",
        "popup_highlight": "⏱️ Solo email · 1 propiedad · sin tarjeta",
        "popup_ph": "tu@email.com",
        "popup_later": "Más tarde",
        "popup_scroll": "Ir al formulario en la página",
        "popup_close": "Cerrar",
        "locale": "es",
    },
    "en": {
        "badge": "🐬 Try now · no card required",
        "title": "Up and running in 2 minutes",
        "sub": "Comply with <strong>traveller registration</strong> for Spain's <strong>Ministry of the Interior</strong> (RD 933/2021). Just your email to start.",
        "s1": "Your email", "s2": "Check inbox", "s3": "Add 1 property",
        "email_ph": "you@email.com", "name_ph": "Your name (optional)", "name_l": "Name (optional)",
        "email_l": "Email", "fine": "We email you the access link. Check spam if you don't see it.",
        "popup_title": "Try it now — free",
        "popup_sub": "Digitise traveller forms for the Ministry of the Interior. <strong>In ~2 minutes</strong> you can access the panel.",
        "popup_highlight": "⏱️ Email only · 1 property · no card",
        "popup_ph": "you@email.com",
        "popup_later": "Later",
        "popup_scroll": "Go to the form on page",
        "popup_close": "Close",
        "locale": "en",
    },
    "fr": {
        "badge": "🐬 Essayez maintenant",
        "title": "Opérationnel en 2 minutes",
        "sub": "Fiche voyageurs et <strong>Ministère de l'Intérieur</strong> (RD 933/2021). Email seulement.",
        "s1": "Votre email", "s2": "Vérifiez la boîte", "s3": "1 propriété",
        "email_ph": "vous@email.com", "name_ph": "Votre nom", "name_l": "Nom (optionnel)",
        "email_l": "E-mail", "fine": "Lien d'accès par email. Vérifiez les indésirables.",
        "popup_title": "Essayez maintenant — gratuit",
        "popup_sub": "Conformité fiche voyageurs. <strong>~2 minutes</strong> pour accéder au panel.",
        "popup_highlight": "⏱️ Email seulement · 1 propriété",
        "popup_ph": "vous@email.com",
        "popup_later": "Plus tard",
        "popup_scroll": "Voir le formulaire",
        "popup_close": "Fermer",
        "locale": "fr",
    },
    "it": {
        "badge": "🐬 Prova ora",
        "title": "Attivo in 2 minuti",
        "sub": "Scheda ospiti e <strong>Ministero dell'Interno</strong> (RD 933/2021). Solo email.",
        "s1": "La tua email", "s2": "Controlla la posta", "s3": "1 proprietà",
        "email_ph": "tu@email.com", "name_ph": "Il tuo nome", "name_l": "Nome (opzionale)",
        "email_l": "Email", "fine": "Ti inviamo il link di accesso. Controlla lo spam.",
        "popup_title": "Prova ora — gratis",
        "popup_sub": "Conformità scheda ospiti. <strong>~2 minuti</strong> per entrare nel pannello.",
        "popup_highlight": "⏱️ Solo email · 1 proprietà",
        "popup_ph": "tu@email.com",
        "popup_later": "Più tardi",
        "popup_scroll": "Vai al modulo",
        "popup_close": "Chiudi",
        "locale": "it",
    },
    "pt": {
        "badge": "🐬 Experimente agora",
        "title": "A usar em 2 minutos",
        "sub": "Registo de viajantes e <strong>Ministério do Interior</strong> (RD 933/2021). Só email.",
        "s1": "O seu email", "s2": "Verifique o email", "s3": "1 propriedade",
        "email_ph": "seu@email.com", "name_ph": "O seu nome", "name_l": "Nome (opcional)",
        "email_l": "Email", "fine": "Enviamos o link de acesso. Verifique o spam.",
        "popup_title": "Experimente agora — grátis",
        "popup_sub": "Conformidade legal. <strong>~2 minutos</strong> para aceder ao painel.",
        "popup_highlight": "⏱️ Só email · 1 propriedade",
        "popup_ph": "seu@email.com",
        "popup_later": "Mais tarde",
        "popup_scroll": "Ir ao formulário",
        "popup_close": "Fechar",
        "locale": "pt",
    },
    "fi": {
        "badge": "🐬 Kokeile nyt",
        "title": "Käytössä 2 minuutissa",
        "sub": "Matkustajailmoitus ja <strong>sisäministeriö</strong> (RD 933/2021). Vain sähköposti.",
        "s1": "Sähköposti", "s2": "Tarkista posti", "s3": "1 majoitus",
        "email_ph": "sinä@email.com", "name_ph": "Nimesi", "name_l": "Nimi (valinnainen)",
        "email_l": "Sähköposti", "fine": "Lähetämme käyttölinkin. Tarkista roskaposti.",
        "popup_title": "Kokeile nyt — ilmainen",
        "popup_sub": "Lakisäädäntö kuntoon. <strong>~2 minuutissa</strong> paneeliin.",
        "popup_highlight": "⏱️ Vain sähköposti · 1 majoitus",
        "popup_ph": "sinä@email.com",
        "popup_later": "Myöhemmin",
        "popup_scroll": "Siirry lomakkeeseen",
        "popup_close": "Sulje",
        "locale": "fi",
    },
    "sv": {
        "badge": "🐬 Prova nu",
        "title": "Igång på 2 minuter",
        "sub": "Resenärsregistrering och <strong>inrikesministeriet</strong> (RD 933/2021). Bara e-post.",
        "s1": "Din e-post", "s2": "Kolla inkorgen", "s3": "1 boende",
        "email_ph": "du@email.com", "name_ph": "Ditt namn", "name_l": "Namn (valfritt)",
        "email_l": "E-post", "fine": "Vi skickar åtkomstlänken. Kolla skräppost.",
        "popup_title": "Prova nu — gratis",
        "popup_sub": "Uppfyll lagkraven. <strong>~2 minuter</strong> till panelen.",
        "popup_highlight": "⏱️ Bara e-post · 1 boende",
        "popup_ph": "du@email.com",
        "popup_later": "Senare",
        "popup_scroll": "Gå till formuläret",
        "popup_close": "Stäng",
        "locale": "sv",
    },
}


def signup_section(loc: str) -> str:
    c = UI[loc]
    return f"""
    <!-- Captación: registro visible -->
    <section id="registro" class="section container landing-capture-section" aria-label="Registro gratis">
      <div class="landing-capture-card">
        <span class="landing-capture-badge">{c['badge']}</span>
        <h2 class="landing-capture-title">{c['title']}</h2>
        <p class="landing-capture-sub">{c['sub']}</p>
        <ol class="landing-capture-steps">
          <li><strong>1</strong>{c['s1']}</li>
          <li><strong>2</strong>{c['s2']}</li>
          <li><strong>3</strong>{c['s3']}</li>
        </ol>
        <form id="landingFreeSignupForm" class="landing-capture-form" data-signup-locale="{c['locale']}">
          <div>
            <label class="landing-capture-label" for="landingFreeSignupEmail">{c['email_l']} *</label>
            <input id="landingFreeSignupEmail" class="landing-capture-input" type="email" required placeholder="{c['email_ph']}" autocomplete="email">
          </div>
          <div>
            <label class="landing-capture-label" for="landingFreeSignupName">{c['name_l']}</label>
            <input id="landingFreeSignupName" class="landing-capture-input" type="text" placeholder="{c['name_ph']}" autocomplete="name">
          </div>
          <button type="submit" id="landingFreeSignupSubmit" class="landing-capture-submit">
            <span id="landingFreeSignupSubmitText">…</span>
            <span id="landingFreeSignupLoading" style="display:none;">…</span>
          </button>
          <div id="landingFreeSignupMessage" class="landing-capture-msg" role="status"></div>
          <p class="landing-capture-fine">{c['fine']}</p>
        </form>
      </div>
    </section>

    <script data-landing-free-scroll>
    (function () {{
      function goRegistro() {{
        var reg = document.getElementById('registro');
        if (reg) reg.scrollIntoView({{ behavior: 'smooth', block: 'start' }});
        var input = document.getElementById('landingFreeSignupEmail');
        if (input) window.setTimeout(function () {{ input.focus(); }}, 400);
      }}
      document.querySelectorAll('[data-landing-free-toggle]').forEach(function (el) {{
        el.addEventListener('click', function (e) {{
          var href = el.getAttribute('href') || '';
          if (href === '#registro' || href.indexOf('#registro') === 0) {{
            e.preventDefault();
            goRegistro();
          }}
        }});
      }});
      if (location.hash === '#registro') goRegistro();
    }})();
    </script>
""".strip()


def popup_block(loc: str) -> str:
    c = UI[loc]
    return f"""
<div id="delfin-soft-popup-overlay" role="dialog" aria-modal="true" aria-label="Delfín Check-in">
  <div class="wrap" style="position:relative">
    <div id="delfin-soft-popup">
      <button class="x" type="button" aria-label="{c['popup_close']}" id="delfin-soft-popup-close">×</button>
      <div class="popup-hero">
        <div class="popup-emoji">🐬</div>
        <p class="ttl">{c['popup_title']}</p>
        <p class="sub">{c['popup_sub']}</p>
        <span class="popup-highlight">{c['popup_highlight']}</span>
      </div>
      <div class="cta">
        <input type="email" id="delfin-popup-email" placeholder="{c['popup_ph']}" autocomplete="email" aria-label="Email">
        <button type="button" id="delfin-popup-submit" class="btn btn-primary">…</button>
        <div id="delfin-popup-msg"></div>
        <button type="button" id="delfin-soft-popup-scroll" class="btn btn-ghost">{c['popup_scroll']}</button>
        <button type="button" id="delfin-soft-popup-later" class="btn btn-ghost">{c['popup_later']}</button>
      </div>
    </div>
  </div>
</div>
""".strip()


CAPTURE_RE = re.compile(
    r"<!--\s*Planes[\s\S]*?<script\s+data-landing-free-(?:collapse|scroll)>[\s\S]*?</script>\s*",
    re.IGNORECASE,
)

POPUP_RE = re.compile(
    r"<style>\s*#delfin-soft-popup-overlay[\s\S]*?</script>\s*(?=</body>)",
    re.IGNORECASE,
)


def ensure_head_assets(html: str) -> str:
    if "landing-capture.css" not in html:
        html = html.replace(
            "</head>",
            '  <link rel="stylesheet" href="/landing-capture.css" />\n</head>',
            1,
        )
    return html


def ensure_body_scripts(html: str) -> str:
    if "landing-free-signup.js" in html:
        return html
    needle = '<script src="/landing-tracking.js"></script>'
    if needle in html:
        return html.replace(
            needle,
            needle + '\n  <script src="/landing-free-signup.js" defer></script>',
            1,
        )
    return html.replace("</body>", '  <script src="/landing-free-signup.js" defer></script>\n</body>', 1)


def locale_for_path(path: Path) -> str:
    for loc in ("en", "fr", "it", "pt", "fi", "sv"):
        if f"/{loc}/" in str(path):
            return loc
    return "es"


def patch_file(path: Path) -> bool:
    loc = locale_for_path(path)
    text = path.read_text(encoding="utf-8")
    updated = text

    if CAPTURE_RE.search(updated):
        updated = CAPTURE_RE.sub(signup_section(loc) + "\n\n    ", updated, count=1)
    elif 'id="registro"' in updated and "landing-capture-card" not in updated:
        # fallback: replace hidden registro block
        updated = re.sub(
            r'<div id="registro"[\s\S]*?<script data-landing-free-collapse>[\s\S]*?</script>\s*',
            signup_section(loc) + "\n\n    ",
            updated,
            count=1,
        )

    if POPUP_RE.search(updated):
        updated = POPUP_RE.sub(popup_block(loc) + "\n", updated, count=1)
    elif "delfin-soft-popup-overlay" not in updated:
        updated = updated.replace("</body>", popup_block(loc) + "\n</body>", 1)

    updated = ensure_head_assets(updated)
    updated = ensure_body_scripts(updated)

    if updated != text:
        path.write_text(updated, encoding="utf-8")
        return True
    return False


def main() -> None:
    targets = [ROOT / "landing-capture.css", ROOT / "landing-free-signup.js"]
    for loc in ("", "en", "fr", "it", "pt", "fi", "sv"):
        p = (ROOT / loc / "index.html") if loc else ROOT / "index.html"
        if p.is_file():
            targets.append(p)

    for p in targets:
        if p.suffix == ".html":
            if patch_file(p):
                print("patched", p.relative_to(ROOT))
        else:
            print("asset", p.name)


if __name__ == "__main__":
    main()
