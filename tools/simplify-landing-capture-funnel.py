#!/usr/bin/env python3
"""Embudo público: MIR + prueba gratis (1 propiedad). Sin precios en landing."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "external" / "delfincheckin.com"

COPY: dict[str, dict[str, str]] = {
    "es": {
        "title": "Delfín Check‑in · Parte de viajeros al Ministerio del Interior (RD 933/2021)",
        "description": "Cumple la legalidad del parte de viajeros y el envío al Ministerio del Interior (MIR). Prueba gratis con 1 propiedad: formulario digital, XML y gestión del alojamiento. Solo email, sin tarjeta.",
        "og_title": "Delfín Check‑in · Parte de viajeros al Ministerio del Interior",
        "og_description": "Cumple el RD 933/2021: parte de viajeros y envío al MIR. Prueba gratis con 1 propiedad — solo email, sin tarjeta.",
        "header_cta": "Prueba gratis",
        "footer_cta": "Prueba gratis",
        "popup_title": "Prueba gratis con 1 propiedad",
        "popup_sub": "Digitaliza el <strong>parte de viajeros</strong> y cumple con el <strong>Ministerio del Interior</strong> (RD 933/2021). Solo email, sin tarjeta.",
        "popup_cta": "Prueba gratis con 1 propiedad",
        "popup_later": "Más tarde",
        "popup_close": "Cerrar",
    },
    "en": {
        "title": "Delfín Check‑in · Traveller registration for Spain's Ministry of the Interior",
        "description": "Comply with Spain's traveller registration (RD 933/2021) and MIR submission. Try free with 1 property: digital form, XML and property management. Email only, no card.",
        "og_title": "Delfín Check‑in · Traveller registration · Ministry of the Interior",
        "og_description": "RD 933/2021 compliance: traveller forms and MIR. Try free with 1 property — email only, no card.",
        "header_cta": "Try free",
        "footer_cta": "Try free",
        "popup_title": "Try free with 1 property",
        "popup_sub": "Digitise <strong>traveller registration</strong> and comply with Spain's <strong>Ministry of the Interior</strong> (RD 933/2021). Email only, no card.",
        "popup_cta": "Try free with 1 property",
        "popup_later": "Later",
        "popup_close": "Close",
    },
    "fr": {
        "title": "Delfín Check‑in · Fiche voyageurs · Ministère de l'Intérieur (RD 933/2021)",
        "description": "Conformité fiche voyageurs et envoi MIR (Espagne). Essai gratuit 1 propriété : formulaire, XML et gestion. Email seulement, sans carte.",
        "og_title": "Delfín Check‑in · Fiche voyageurs · Ministère de l'Intérieur",
        "og_description": "RD 933/2021 : fiche voyageurs et MIR. Essai gratuit 1 propriété — email seulement.",
        "header_cta": "Essai gratuit",
        "footer_cta": "Essai gratuit",
        "popup_title": "Essai gratuit avec 1 propriété",
        "popup_sub": "Digitalisez la <strong>fiche voyageurs</strong> et respectez le <strong>Ministère de l'Intérieur</strong> espagnol (RD 933/2021). Email seulement.",
        "popup_cta": "Essai gratuit avec 1 propriété",
        "popup_later": "Plus tard",
        "popup_close": "Fermer",
    },
    "it": {
        "title": "Delfín Check‑in · Scheda ospiti · Ministero dell'Interno (RD 933/2021)",
        "description": "Conformità scheda ospiti e invio MIR in Spagna. Prova gratis 1 proprietà: modulo digitale, XML e gestione. Solo email, senza carta.",
        "og_title": "Delfín Check‑in · Scheda ospiti · Ministero dell'Interno",
        "og_description": "RD 933/2021: scheda ospiti e MIR. Prova gratis con 1 proprietà — solo email.",
        "header_cta": "Prova gratis",
        "footer_cta": "Prova gratis",
        "popup_title": "Prova gratis con 1 proprietà",
        "popup_sub": "Digitalizza la <strong>scheda ospiti</strong> e rispetta il <strong>Ministero dell'Interno</strong> spagnolo (RD 933/2021). Solo email.",
        "popup_cta": "Prova gratis con 1 proprietà",
        "popup_later": "Più tardi",
        "popup_close": "Chiudi",
    },
    "pt": {
        "title": "Delfín Check‑in · Registo de viajantes · Ministério do Interior (RD 933/2021)",
        "description": "Cumpra o registo de viajantes e envio MIR em Espanha. Teste grátis 1 propriedade: formulário, XML e gestão. Só email, sem cartão.",
        "og_title": "Delfín Check‑in · Registo de viajantes · Ministério do Interior",
        "og_description": "RD 933/2021: registo de viajantes e MIR. Teste grátis com 1 propriedade — só email.",
        "header_cta": "Teste grátis",
        "footer_cta": "Teste grátis",
        "popup_title": "Teste grátis com 1 propriedade",
        "popup_sub": "Digitalize o <strong>registo de viajantes</strong> e cumpra o <strong>Ministério do Interior</strong> espanhol (RD 933/2021). Só email.",
        "popup_cta": "Teste grátis com 1 propriedade",
        "popup_later": "Mais tarde",
        "popup_close": "Fechar",
    },
    "fi": {
        "title": "Delfín Check‑in · Matkustajailmoitus · Espanjan sisäministeriö (RD 933/2021)",
        "description": "Matkustajailmoitus ja MIR-lähetys Espanjassa. Kokeile ilmaiseksi 1 majoitus: lomake, XML ja hallinta. Vain sähköposti.",
        "og_title": "Delfín Check‑in · Matkustajailmoitus · Sisäministeriö",
        "og_description": "RD 933/2021: matkustajailmoitus ja MIR. Kokeile ilmaiseksi 1 majoitus — vain sähköposti.",
        "header_cta": "Kokeile ilmaiseksi",
        "footer_cta": "Kokeile ilmaiseksi",
        "popup_title": "Kokeile ilmaiseksi 1 majoitus",
        "popup_sub": "Digitalisoi <strong>matkustajailmoitus</strong> ja täytä Espanjan <strong>sisäministeriön</strong> vaatimukset (RD 933/2021). Vain sähköposti.",
        "popup_cta": "Kokeile ilmaiseksi 1 majoitus",
        "popup_later": "Myöhemmin",
        "popup_close": "Sulje",
    },
    "sv": {
        "title": "Delfín Check‑in · Resenärsregistrering · Spaniens inrikesministerium (RD 933/2021)",
        "description": "Resenärsregistrering och MIR i Spanien. Prova gratis 1 boende: formulär, XML och hantering. Bara e-post, inget kort.",
        "og_title": "Delfín Check‑in · Resenärsregistrering · Inrikesministeriet",
        "og_description": "RD 933/2021: resenärsregistrering och MIR. Prova gratis med 1 boende — bara e-post.",
        "header_cta": "Prova gratis",
        "footer_cta": "Prova gratis",
        "popup_title": "Prova gratis med 1 boende",
        "popup_sub": "Digitalisera <strong>resenärsregistrering</strong> och följ Spaniens <strong>inrikesministerium</strong> (RD 933/2021). Bara e-post.",
        "popup_cta": "Prova gratis med 1 boende",
        "popup_later": "Senare",
        "popup_close": "Stäng",
    },
}

HERO: dict[str, str] = {
    "es": """
      <div class="badges">
        <span class="badge" style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); color: #1e40af; font-weight: 800;">⚖️ RD 933/2021</span>
        <span class="badge" style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); color: #166534; font-weight: 800;">🏛️ Ministerio del Interior</span>
        <span class="badge" style="background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%); color: #3730a3; font-weight: 800;">💯 Prueba gratis · 1 propiedad</span>
      </div>
      <h1>Cumple la legalidad del <strong style="color: var(--brand);">parte de viajeros</strong> al Ministerio del Interior</h1>
      <div style="margin: 18px 0 20px; max-width: 720px; padding: 18px 20px; border-radius: 16px; border: 1px solid rgba(99, 102, 241, 0.22); background: linear-gradient(135deg, rgba(238, 242, 255, 0.95) 0%, rgba(240, 253, 250, 0.92) 100%); box-shadow: 0 4px 24px rgba(37, 99, 235, 0.07);" role="note">
        <p style="margin: 0; font-size: clamp(15px, 2.5vw, 17px); font-weight: 650; color: #1e1b4b; line-height: 1.5;">
          Digitaliza el registro de huéspedes, genera el <strong>parte de viajeros (PV)</strong> y la <strong>reserva de hospedaje (RH)</strong> conforme al RD 933/2021.
        </p>
      </div>
      <p style="font-size: 20px; line-height: 1.6;">Software para alojamientos: <strong>cumplimiento legal primero</strong>, y además calendario, limpieza, reservas directas y facturación. <strong style="color: var(--accent);">Prueba gratis con 1 propiedad — solo email, sin tarjeta.</strong></p>
      <div style="display: flex; flex-wrap: wrap; gap: 12px; margin: 20px 0 8px;">
        <a href="#registro" data-landing-free-toggle="1" class="btn primary" style="padding: 14px 22px; font-size: 17px; font-weight: 800;">Prueba gratis con 1 propiedad</a>
        <a href="#instrucciones" class="btn" style="padding: 14px 22px; font-size: 16px;">Ver cómo funciona el envío MIR</a>
      </div>
      <div style="margin: 16px 0; padding: 14px 18px; background: #f8fafc; border: 1px solid var(--border); border-radius: 12px;">
        <p style="margin: 0; color: var(--muted); font-size: 13px; line-height: 1.55;">
          <strong style="color: var(--text);">Activación en minutos:</strong> recibes un email, registras tu propiedad y empiezas. Los planes de pago los ves en el panel cuando los necesites.
        </p>
      </div>
      <div class="hero-card" style="background: linear-gradient(135deg, rgba(68,192,255,0.1) 0%, rgba(124,240,124,0.1) 100%); border: 2px solid rgba(68,192,255,0.3);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0 0 10px; font-size: 24px; color: var(--brand);">🎯 Legalidad + gestión del alojamiento</h2>
          <p style="color: var(--muted); margin: 0;">Lo esencial para cumplir la normativa y operar el día a día</p>
        </div>
        <div class="checklist">
          <div class="check"><i>✔</i> <strong>Parte de viajeros y MIR</strong> — Formulario digital y XML para el Ministerio</div>
          <div class="check"><i>✔</i> <strong>RD 933/2021</strong> — PV y RH obligatorios en España</div>
          <div class="check"><i>✔</i> <strong>Calendario y reservas</strong> — Motor de reservas e iCal</div>
          <div class="check"><i>✔</i> <strong>Limpieza</strong> — Calendario de limpieza y operaciones</div>
          <div class="check"><i>✔</i> <strong>Reservas directas</strong> — Microsite y cobro directo</div>
          <div class="check"><i>✔</i> <strong>Prueba gratis</strong> — 1 propiedad, solo email, sin tarjeta</div>
        </div>
      </div>
""".strip(),
    "en": """
      <div class="badges">
        <span class="badge" style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); color: #1e40af; font-weight: 800;">⚖️ RD 933/2021</span>
        <span class="badge" style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); color: #166534; font-weight: 800;">🏛️ Ministry of the Interior</span>
        <span class="badge" style="background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%); color: #3730a3; font-weight: 800;">💯 Free trial · 1 property</span>
      </div>
      <h1>Comply with <strong style="color: var(--brand);">traveller registration</strong> for Spain's Ministry of the Interior</h1>
      <div style="margin: 18px 0 20px; max-width: 720px; padding: 18px 20px; border-radius: 16px; border: 1px solid rgba(99, 102, 241, 0.22); background: linear-gradient(135deg, rgba(238, 242, 255, 0.95) 0%, rgba(240, 253, 250, 0.92) 100%); box-shadow: 0 4px 24px rgba(37, 99, 235, 0.07);" role="note">
        <p style="margin: 0; font-size: clamp(15px, 2.5vw, 17px); font-weight: 650; color: #1e1b4b; line-height: 1.5;">
          Digitise guest registration, generate <strong>traveller forms (PV)</strong> and <strong>lodging reservations (RH)</strong> under RD 933/2021.
        </p>
      </div>
      <p style="font-size: 20px; line-height: 1.6;">Property software with <strong>legal compliance first</strong>, plus calendar, cleaning, direct bookings and invoicing. <strong style="color: var(--accent);">Try free with 1 property — email only, no card.</strong></p>
      <div style="display: flex; flex-wrap: wrap; gap: 12px; margin: 20px 0 8px;">
        <a href="#registro" data-landing-free-toggle="1" class="btn primary" style="padding: 14px 22px; font-size: 17px; font-weight: 800;">Try free with 1 property</a>
        <a href="#instrucciones" class="btn" style="padding: 14px 22px; font-size: 16px;">How MIR submission works</a>
      </div>
      <div style="margin: 16px 0; padding: 14px 18px; background: #f8fafc; border: 1px solid var(--border); border-radius: 12px;">
        <p style="margin: 0; color: var(--muted); font-size: 13px; line-height: 1.55;">
          <strong style="color: var(--text);">Activate in minutes:</strong> get an email, register your property and start. Paid plans appear in the panel when you need them.
        </p>
      </div>
      <div class="hero-card" style="background: linear-gradient(135deg, rgba(68,192,255,0.1) 0%, rgba(124,240,124,0.1) 100%); border: 2px solid rgba(68,192,255,0.3);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0 0 10px; font-size: 24px; color: var(--brand);">🎯 Compliance + property management</h2>
          <p style="color: var(--muted); margin: 0;">What you need for Spanish regulations and daily operations</p>
        </div>
        <div class="checklist">
          <div class="check"><i>✔</i> <strong>Traveller forms & MIR</strong> — Digital form and XML for the Ministry</div>
          <div class="check"><i>✔</i> <strong>RD 933/2021</strong> — PV and RH required in Spain</div>
          <div class="check"><i>✔</i> <strong>Calendar & bookings</strong> — Booking engine and iCal</div>
          <div class="check"><i>✔</i> <strong>Cleaning</strong> — Cleaning calendar and ops</div>
          <div class="check"><i>✔</i> <strong>Direct bookings</strong> — Microsite and direct pay</div>
          <div class="check"><i>✔</i> <strong>Free trial</strong> — 1 property, email only, no card</div>
        </div>
      </div>
""".strip(),
}

# fr/it/pt/fi/sv: hero basado en EN con textos traducidos (compacto)
for loc, h1, sub, lead, cta, cta2, note, card_title, card_sub, checks in [
    ("fr", "Respectez la <strong style=\"color: var(--brand);\">fiche voyageurs</strong> auprès du Ministère de l'Intérieur espagnol",
     "Digitalisez l'enregistrement, la <strong>fiche voyageurs (PV)</strong> et la <strong>réservation (RH)</strong> selon le RD 933/2021.",
     "Logiciel pour hébergements : <strong>conformité légale d'abord</strong>, plus calendrier, ménage et réservations directes. <strong style=\"color: var(--accent);\">Essai gratuit 1 propriété — email seulement.</strong>",
     "Essai gratuit avec 1 propriété", "Comment fonctionne l'envoi MIR",
     "<strong style=\"color: var(--text);\">Activation en minutes :</strong> email, propriété, c'est parti. Forfaits payants dans le panel.",
     "🎯 Conformité + gestion", "L'essentiel pour la réglementation espagnole",
     ["Fiche voyageurs & MIR", "RD 933/2021", "Calendrier & réservations", "Ménage", "Réservations directes", "Essai gratuit — 1 propriété"]),
    ("it", "Rispetta la <strong style=\"color: var(--brand);\">scheda ospiti</strong> presso il Ministero dell'Interno spagnolo",
     "Digitalizza registrazione, <strong>scheda ospiti (PV)</strong> e <strong>prenotazione (RH)</strong> secondo RD 933/2021.",
     "Software per alloggi: <strong>conformità legale prima</strong>, più calendario, pulizie e prenotazioni dirette. <strong style=\"color: var(--accent);\">Prova gratis 1 proprietà — solo email.</strong>",
     "Prova gratis con 1 proprietà", "Come funziona l'invio MIR",
     "<strong style=\"color: var(--text);\">Attivazione in minuti:</strong> email, proprietà, via. Piani a pagamento nel pannello.",
     "🎯 Conformità + gestione", "L'essenziale per la normativa spagnola",
     ["Scheda ospiti & MIR", "RD 933/2021", "Calendario & prenotazioni", "Pulizie", "Prenotazioni dirette", "Prova gratis — 1 proprietà"]),
    ("pt", "Cumpra o <strong style=\"color: var(--brand);\">registo de viajantes</strong> no Ministério do Interior espanhol",
     "Digitalize o registo, <strong>parte de viajantes (PV)</strong> e <strong>reserva (RH)</strong> conforme RD 933/2021.",
     "Software para alojamentos: <strong>conformidade legal primeiro</strong>, mais calendário, limpeza e reservas diretas. <strong style=\"color: var(--accent);\">Teste grátis 1 propriedade — só email.</strong>",
     "Teste grátis com 1 propriedade", "Como funciona o envio MIR",
     "<strong style=\"color: var(--text);\">Ativação em minutos:</strong> email, propriedade, pronto. Planos pagos no painel.",
     "🎯 Conformidade + gestão", "O essencial para a regulamentação espanhola",
     ["Registo & MIR", "RD 933/2021", "Calendário & reservas", "Limpeza", "Reservas diretas", "Teste grátis — 1 propriedade"]),
    ("fi", "Täytä <strong style=\"color: var(--brand);\">matkustajailmoitus</strong> Espanjan sisäministeriölle",
     "Digitalisoi ilmoitus, <strong>PV</strong> ja <strong>RH</strong> RD 933/2021 -asetuksen mukaan.",
     "Majoitusohjelmisto: <strong>lakisäädäntö ensin</strong>, plus kalenteri ja suorat varaukset. <strong style=\"color: var(--accent);\">Kokeile ilmaiseksi 1 majoitus — vain sähköposti.</strong>",
     "Kokeile ilmaiseksi 1 majoitus", "Miten MIR-lähetys toimii",
     "<strong style=\"color: var(--text);\">Aktivointi minuuteissa:</strong> sähköposti, majoitus, aloita. Maksulliset paketit paneelissa.",
     "🎯 Vaatimustenmukaisuus + hallinta", "Olennaista Espanjan säännöksille",
     ["Matkustajailmoitus & MIR", "RD 933/2021", "Kalenteri & varaukset", "Siivous", "Suorat varaukset", "Ilmainen kokeilu — 1 majoitus"]),
    ("sv", "Uppfyll <strong style=\"color: var(--brand);\">resenärsregistrering</strong> för Spaniens inrikesministerium",
     "Digitalisera registrering, <strong>PV</strong> och <strong>RH</strong> enligt RD 933/2021.",
     "Boendeprogramvara: <strong>efterlevnad först</strong>, plus kalender och direktbokningar. <strong style=\"color: var(--accent);\">Prova gratis 1 boende — bara e-post.</strong>",
     "Prova gratis med 1 boende", "Så fungerar MIR-överföring",
     "<strong style=\"color: var(--text);\">Aktivering på minuter:</strong> e-post, boende, kör. Betalplaner i panelen.",
     "🎯 Efterlevnad + hantering", "Det viktigaste för spanska regler",
     ["Resenärsregistrering & MIR", "RD 933/2021", "Kalender & bokningar", "Städning", "Direktbokningar", "Gratis prov — 1 boende"]),
]:
    badges = COPY[loc]["header_cta"]
    HERO[loc] = f"""
      <div class="badges">
        <span class="badge" style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); color: #1e40af; font-weight: 800;">⚖️ RD 933/2021</span>
        <span class="badge" style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); color: #166534; font-weight: 800;">🏛️ MIR</span>
        <span class="badge" style="background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%); color: #3730a3; font-weight: 800;">💯 {badges}</span>
      </div>
      <h1>{h1}</h1>
      <div style="margin: 18px 0 20px; max-width: 720px; padding: 18px 20px; border-radius: 16px; border: 1px solid rgba(99, 102, 241, 0.22); background: linear-gradient(135deg, rgba(238, 242, 255, 0.95) 0%, rgba(240, 253, 250, 0.92) 100%);" role="note">
        <p style="margin: 0; font-size: clamp(15px, 2.5vw, 17px); font-weight: 650; color: #1e1b4b; line-height: 1.5;">{sub}</p>
      </div>
      <p style="font-size: 20px; line-height: 1.6;">{lead}</p>
      <div style="display: flex; flex-wrap: wrap; gap: 12px; margin: 20px 0 8px;">
        <a href="#registro" data-landing-free-toggle="1" class="btn primary" style="padding: 14px 22px; font-size: 17px; font-weight: 800;">{cta}</a>
        <a href="#instrucciones" class="btn" style="padding: 14px 22px; font-size: 16px;">{cta2}</a>
      </div>
      <div style="margin: 16px 0; padding: 14px 18px; background: #f8fafc; border: 1px solid var(--border); border-radius: 12px;">
        <p style="margin: 0; color: var(--muted); font-size: 13px; line-height: 1.55;">{note}</p>
      </div>
      <div class="hero-card" style="background: linear-gradient(135deg, rgba(68,192,255,0.1) 0%, rgba(124,240,124,0.1) 100%); border: 2px solid rgba(68,192,255,0.3);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0 0 10px; font-size: 24px; color: var(--brand);">{card_title}</h2>
          <p style="color: var(--muted); margin: 0;">{card_sub}</p>
        </div>
        <div class="checklist">
          {''.join(f'<div class="check"><i>✔</i> <strong>{c}</strong></div>' for c in checks)}
        </div>
      </div>
""".strip()

PLANS_SECTION = {
    "es": """
    <section id="planes" class="section container">
      <h2 style="text-align: center; margin-bottom: 16px; font-size: 36px; font-weight: 800;">Prueba gratis con 1 propiedad</h2>
      <p class="lead" style="text-align: center; margin-bottom: 32px; font-size: 18px; max-width: 720px; margin-left: auto; margin-right: auto;">
        Cumple la legalidad del <strong>parte de viajeros</strong> y el envío al <strong>Ministerio del Interior</strong> (RD 933/2021). Sin tarjeta: solo tu email.
      </p>
      <article class="card" style="border: 2px solid #16a34a; max-width: 520px; margin: 0 auto; padding: 24px; border-radius: 16px;">
        <h3 style="text-align: center; font-size: 22px;">Plan Básico · Gratis</h3>
        <ul class="features" style="margin: 16px 0; font-size: 14px;">
          <li>✅ Parte de viajeros y formulario digital</li>
          <li>✅ XML para el Ministerio del Interior</li>
          <li>✅ Calendario, reservas y limpieza</li>
          <li>✅ Solo email — sin tarjeta</li>
        </ul>
        <a href="#registro" data-landing-free-toggle="1" class="btn primary" style="display:block;width:100%;text-align:center;padding:16px;font-weight:700;">Prueba gratis con 1 propiedad</a>
      </article>
    </section>
""".strip(),
    "en": """
    <section id="planes" class="section container">
      <h2 style="text-align: center; margin-bottom: 16px; font-size: 36px; font-weight: 800;">Try free with 1 property</h2>
      <p class="lead" style="text-align: center; margin-bottom: 32px; font-size: 18px; max-width: 720px; margin-left: auto; margin-right: auto;">
        Comply with <strong>traveller registration</strong> and Spain's <strong>Ministry of the Interior</strong> (RD 933/2021). Email only, no card.
      </p>
      <article class="card" style="border: 2px solid #16a34a; max-width: 520px; margin: 0 auto; padding: 24px; border-radius: 16px;">
        <h3 style="text-align: center; font-size: 22px;">Basic plan · Free</h3>
        <ul class="features" style="margin: 16px 0; font-size: 14px;">
          <li>✅ Traveller forms & digital check-in</li>
          <li>✅ XML for the Ministry of the Interior</li>
          <li>✅ Calendar, bookings & cleaning</li>
          <li>✅ Email only — no card</li>
        </ul>
        <a href="#registro" data-landing-free-toggle="1" class="btn primary" style="display:block;width:100%;text-align:center;padding:16px;font-weight:700;">Try free with 1 property</a>
      </article>
    </section>
""".strip(),
    "fr": """
    <section id="planes" class="section container">
      <h2 style="text-align: center; font-size: 36px; font-weight: 800;">Essai gratuit avec 1 propriété</h2>
      <p class="lead" style="text-align: center; margin-bottom: 32px; font-size: 18px; max-width: 720px; margin: 0 auto;">
        <strong>Fiche voyageurs</strong> et <strong>Ministère de l'Intérieur</strong> (RD 933/2021). Email seulement.
      </p>
      <article class="card" style="border: 2px solid #16a34a; max-width: 520px; margin: 0 auto; padding: 24px; border-radius: 16px;">
        <a href="#registro" data-landing-free-toggle="1" class="btn primary" style="display:block;width:100%;text-align:center;padding:16px;font-weight:700;">Essai gratuit avec 1 propriété</a>
      </article>
    </section>
""".strip(),
    "it": """
    <section id="planes" class="section container">
      <h2 style="text-align: center; font-size: 36px; font-weight: 800;">Prova gratis con 1 proprietà</h2>
      <article class="card" style="border: 2px solid #16a34a; max-width: 520px; margin: 0 auto; padding: 24px; border-radius: 16px;">
        <a href="#registro" data-landing-free-toggle="1" class="btn primary" style="display:block;width:100%;text-align:center;padding:16px;font-weight:700;">Prova gratis con 1 proprietà</a>
      </article>
    </section>
""".strip(),
    "pt": """
    <section id="planes" class="section container">
      <h2 style="text-align: center; font-size: 36px; font-weight: 800;">Teste grátis com 1 propriedade</h2>
      <article class="card" style="border: 2px solid #16a34a; max-width: 520px; margin: 0 auto; padding: 24px; border-radius: 16px;">
        <a href="#registro" data-landing-free-toggle="1" class="btn primary" style="display:block;width:100%;text-align:center;padding:16px;font-weight:700;">Teste grátis com 1 propriedade</a>
      </article>
    </section>
""".strip(),
    "fi": """
    <section id="planes" class="section container">
      <h2 style="text-align: center; font-size: 36px; font-weight: 800;">Kokeile ilmaiseksi 1 majoitus</h2>
      <article class="card" style="border: 2px solid #16a34a; max-width: 520px; margin: 0 auto; padding: 24px; border-radius: 16px;">
        <a href="#registro" data-landing-free-toggle="1" class="btn primary" style="display:block;width:100%;text-align:center;padding:16px;font-weight:700;">Kokeile ilmaiseksi 1 majoitus</a>
      </article>
    </section>
""".strip(),
    "sv": """
    <section id="planes" class="section container">
      <h2 style="text-align: center; font-size: 36px; font-weight: 800;">Prova gratis med 1 boende</h2>
      <article class="card" style="border: 2px solid #16a34a; max-width: 520px; margin: 0 auto; padding: 24px; border-radius: 16px;">
        <a href="#registro" data-landing-free-toggle="1" class="btn primary" style="display:block;width:100%;text-align:center;padding:16px;font-weight:700;">Prova gratis med 1 boende</a>
      </article>
    </section>
""".strip(),
}

HEADER_BTN_OLD = [
    "Registro Gratis", "Free registration", "Inscription gratuite", "Registrazione gratuita",
    "Registo gratuito", "Ilmainen rekisteröityminen", "Gratis registrering", "Prueba gratis", "Try free",
]

FOOTER_BTN_OLD = HEADER_BTN_OLD + ["Sign up free", "S'inscrire gratuitement"]

HERO_RE = re.compile(
    r'(<section\s+class="hero\s+container"\s+id="inicio">)\s*<div\s+class="badges">[\s\S]*?(<!--\s*Badges de confianza\s*-->)',
    re.IGNORECASE,
)
PLANS_RE = re.compile(r"<section\s+id=[\"']planes[\"'][^>]*>[\s\S]*?</section>\s*", re.IGNORECASE)


def popup_html(loc: str) -> str:
    c = COPY[loc]
    return f"""
<style>
  #delfin-soft-popup-overlay{{position:fixed;inset:0;background:rgba(2,6,23,.55);display:none;align-items:center;justify-content:center;z-index:999999;}}
  #delfin-soft-popup{{width:min(520px,calc(100vw - 32px));background:#fff;border-radius:18px;box-shadow:0 16px 48px rgba(2,6,23,.35);border:1px solid rgba(148,163,184,.6);overflow:hidden}}
  #delfin-soft-popup .hd{{padding:16px 16px 0 16px}}
  #delfin-soft-popup .ttl{{font-weight:950;font-size:20px;line-height:1.2;color:#0f172a;margin:0}}
  #delfin-soft-popup .sub{{margin:10px 0 0 0;color:#334155;font-size:14px;line-height:1.45}}
  #delfin-soft-popup .cta{{display:flex;gap:10px;padding:16px}}
  #delfin-soft-popup .btn{{display:inline-flex;align-items:center;justify-content:center;border-radius:12px;padding:12px 14px;font-weight:900;text-decoration:none;border:0;cursor:pointer;font-size:14px}}
  #delfin-soft-popup .btn-primary{{background:#16a34a;color:#fff;flex:1}}
  #delfin-soft-popup .btn-ghost{{background:#f1f5f9;color:#0f172a}}
  #delfin-soft-popup .x{{position:absolute;top:10px;right:10px;border:0;background:transparent;cursor:pointer;font-size:20px;color:#475569}}
  #delfin-soft-popup .wrap{{position:relative}}
</style>
<div id="delfin-soft-popup-overlay" role="dialog" aria-modal="true">
  <div class="wrap">
    <div id="delfin-soft-popup">
      <button class="x" type="button" aria-label="{c['popup_close']}" id="delfin-soft-popup-close">×</button>
      <div class="hd">
        <p class="ttl">{c['popup_title']}</p>
        <p class="sub">{c['popup_sub']}</p>
      </div>
      <div class="cta">
        <a class="btn btn-primary" id="delfin-soft-popup-cta" href="#registro" data-landing-free-toggle="1">{c['popup_cta']}</a>
        <button class="btn btn-ghost" type="button" id="delfin-soft-popup-later">{c['popup_later']}</button>
      </div>
    </div>
  </div>
</div>
<script>
(function(){{
  try {{
    var o=document.getElementById('delfin-soft-popup-overlay');
    if(!o) return;
    var k='delfin_landing_soft_popup_last', last=0;
    try{{ last=Number(localStorage.getItem(k)||'0'); }}catch(e){{}}
    if(last && Date.now()-last<604800000) return;
    function close(){{ o.style.display='none'; try{{ localStorage.setItem(k,String(Date.now())); }}catch(e){{}} }}
    document.getElementById('delfin-soft-popup-close').addEventListener('click', close);
    document.getElementById('delfin-soft-popup-later').addEventListener('click', close);
    o.addEventListener('click', function(e){{ if(e.target===o) close(); }});
    document.getElementById('delfin-soft-popup-cta').addEventListener('click', close);
    setTimeout(function(){{ o.style.display='flex'; }}, 15000);
  }}catch(e){{}}
}})();
</script>
""".strip()


def patch_meta(html: str, loc: str) -> str:
    c = COPY[loc]
    html = re.sub(r"<title>[^<]*</title>", f"<title>{c['title']}</title>", html, count=1, flags=re.I)
    html = re.sub(
        r'<meta[^>]+name=["\']description["\'][^>]*>',
        f'<meta name="description" content="{c["description"]}">',
        html,
        count=1,
        flags=re.I,
    )
    if 'property="og:title"' in html or "property='og:title'" in html:
        html = re.sub(
            r'<meta[^>]+property=["\']og:title["\'][^>]*>',
            f'<meta property="og:title" content="{c["og_title"]}">',
            html,
            count=1,
            flags=re.I,
        )
        html = re.sub(
            r'<meta[^>]+property=["\']og:description["\'][^>]*>',
            f'<meta property="og:description" content="{c["og_description"]}">',
            html,
            count=1,
            flags=re.I,
        )
    return html


def patch_header_footer(html: str, loc: str) -> str:
    c = COPY[loc]
    for old in HEADER_BTN_OLD:
        html = html.replace(
            f'class="btn primary" href="#registro" data-landing-free-toggle="1">{old}</a>',
            f'class="btn primary" href="#registro" data-landing-free-toggle="1">{c["header_cta"]}</a>',
        )
    for old in FOOTER_BTN_OLD:
        html = html.replace(f'>{old}</a>', f'>{c["footer_cta"]}</a>', 1)
    return html


def patch_hero(html: str, loc: str) -> str:
    hero = HERO.get(loc, HERO["en"])
    m = HERO_RE.search(html)
    if m:
        return HERO_RE.sub(rf"\1\n{hero}\n      \2", html, count=1)
    return html


def patch_plans(html: str, loc: str) -> str:
    block = PLANS_SECTION.get(loc, PLANS_SECTION["en"])
    if PLANS_RE.search(html):
        return PLANS_RE.sub(block + "\n\n    ", html, count=1)
    return html


def patch_popup(html: str, loc: str) -> str:
    if 'id="delfin-soft-popup-overlay"' in html:
        # Reemplazar popup completo si existe
        html = re.sub(
            r"<style>\s*#delfin-soft-popup-overlay[\s\S]*?</script>\s*",
            popup_html(loc) + "\n",
            html,
            count=1,
        )
        return html
    if "</body>" in html:
        return html.replace("</body>", popup_html(loc) + "\n</body>", 1)
    return html


def locale_for_path(path: Path) -> str:
    for loc in ("en", "fr", "it", "pt", "fi", "sv"):
        if f"/{loc}/" in str(path) or str(path).endswith(f"{loc}/index.html"):
            return loc
    return "es"


def main() -> None:
    targets = [ROOT / "index.html"]
    for loc in ("en", "fr", "it", "pt", "fi", "sv"):
        p = ROOT / loc / "index.html"
        if p.is_file():
            targets.append(p)

    for path in targets:
        loc = locale_for_path(path)
        text = path.read_text(encoding="utf-8")
        updated = text
        updated = patch_meta(updated, loc)
        updated = patch_header_footer(updated, loc)
        updated = patch_hero(updated, loc)
        updated = patch_plans(updated, loc)
        updated = patch_popup(updated, loc)
        if updated != text:
            path.write_text(updated, encoding="utf-8")
            print("ok", path.relative_to(ROOT))


if __name__ == "__main__":
    main()
