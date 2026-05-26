import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { getOpenAI } from '@/lib/openai-server';
import { Octokit } from '@octokit/rest';

type Batch = 'morning' | 'afternoon';

const TOPICS: Array<{ key: string; title: string }> = [
  { key: 'mir-config', title: 'Cómo configurar el MIR (Ministerio del Interior) en Delfín Check-in paso a paso (2026)' },
  { key: 'rd933-guia', title: 'RD 933/2021 explicado: obligaciones, plazos y cómo cumplir con Delfín Check-in (Actualizado 2026)' },
  { key: 'errores-ses', title: 'Errores frecuentes al enviar partes al SES Hospedajes y cómo solucionarlos (Guía 2026)' },
  { key: 'airbnb-booking', title: 'Airbnb y Booking: ¿quién registra a los viajeros? Qué exige el Ministerio (Actualizado 2026)' },
  { key: 'checkin-digital', title: 'Check-in digital: cómo automatizar el registro de viajeros y evitar multas (Guía práctica 2026)' },
  { key: 'ical-sync', title: 'Sincronización iCal: evita overbooking y mantén calendarios al día (tutorial con Delfín Check-in)' },
  { key: 'reservas-directas', title: 'Reservas directas: cómo reducir comisiones con el microsite de Delfín Check-in (paso a paso)' },
  { key: 'limpieza', title: 'Gestión de limpieza en alquiler vacacional: checklist, horarios y automatización con Delfín Check-in' },
  { key: 'facturas', title: 'Cómo emitir facturas a huéspedes en alquiler vacacional (y automatizarlo) - Guía 2026' },
  { key: 'multas', title: 'Multas por no registrar viajeros en España: importes, casos reales y cómo evitarlas (2026)' },
];

const BLOG_SYSTEM_PROMPT = `Eres un redactor SEO experto en contenido para Delfín Check-in (software de registro de viajeros y gestión de alquiler vacacional en España).

Objetivo:
- Crear artículos largos, útiles y accionables, para posicionar en Google.
- Incluir micro-tutoriales de uso del software (pasos numerados) cuando aplique.

Requisitos:
- Longitud mínima: 1300 palabras aproximadas.
- HTML limpio: <p>, <h2>, <h3>, <ul>/<ol>, <strong>.
- Meta description 150-160 caracteres con keywords.
- Sin formularios/waitlist ni popups en el HTML (la plantilla pública se encarga de CTAs).
- Responde ÚNICAMENTE con JSON válido (sin markdown), con estructura:
{
  "slug": "...",
  "title": "...",
  "meta_description": "...",
  "meta_keywords": "...",
  "excerpt": "...",
  "content": "<p>...</p>..."
}`;

const GITHUB_OWNER = 'Arroyador69';
const GITHUB_REPO = 'delfincheckin.com';
const GITHUB_BRANCH = 'main';
const TEMPLATE_URL = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/articulos/_template.html`;

function escapeAttr(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function estimateReadTimeMinutes(htmlContent: string): number {
  const text = htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text ? text.split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / 200));
}

function plansHtmlBlock(): string {
  // Planes en artículos: 1 click a Polar (público). Plan gratis: solo email (onboarding).
  const appBase = 'https://admin.delfincheckin.com';
  const baseMonth = `${appBase}/api/polar/subscribe-redirect?locale=es&seats=1&interval=month`;
  const baseYear = `${appBase}/api/polar/subscribe-redirect?locale=es&seats=1&interval=year`;
  const hrefCheckinM = `${baseMonth}&plan=checkin`;
  const hrefStandardM = `${baseMonth}&plan=standard`;
  const hrefProM = `${baseMonth}&plan=pro`;
  const hrefCheckinY = `${baseYear}&plan=checkin`;
  const hrefStandardY = `${baseYear}&plan=standard`;
  const hrefProY = `${baseYear}&plan=pro`;
  const signupFreeUrl = `${appBase}/api/public/signup-free`;

  return `
<section style="margin: 2.5rem 0;">
  <div style="text-align:center;margin-bottom:1.25rem;">
    <h2 style="font-size: 2rem; line-height: 1.2; font-weight: 900; color: #0f172a; margin: 0;">
      Planes claros y transparentes
    </h2>
    <p style="margin: 0.5rem 0 0; color: #475569; font-size: 1rem;">
      Sin sorpresas, sin letra pequeña. Sabes exactamente qué obtienes y qué cuesta.
    </p>
  </div>

  <div style="max-width: 980px; margin: 0 auto; border-radius: 18px; background: #eef6ff; padding: 14px;">
    <div style="display:flex; justify-content:center; margin-bottom: 12px;">
      <div style="display:inline-flex; gap: 6px; background:#e2e8f0; padding: 6px; border-radius: 999px;">
        <button type="button" id="delfin-billing-month" style="border:0; cursor:pointer; padding: 8px 12px; border-radius: 999px; font-weight: 900; font-size: 12px; background:#ffffff; color:#0f172a;">
          Mensual
        </button>
        <button type="button" id="delfin-billing-year" style="border:0; cursor:pointer; padding: 8px 12px; border-radius: 999px; font-weight: 900; font-size: 12px; background:transparent; color:#0f172a;">
          Anual <span style="opacity:0.8; font-weight:900;">(2 meses gratis)</span>
        </button>
      </div>
    </div>
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
      ${freePlanCard({ signupFreeUrl, locale: 'es' })}

      ${pricingCard({
        badge: 'Más popular',
        title: 'Plan Check-in',
        price: '2€',
        priceSuffix: '/mes + 2€/propiedad',
        subtitle: 'Propiedades ilimitadas. Con anuncios.',
        border: '#93c5fd',
        buttonText: 'Contratar Check-in',
        buttonColor: '#2563eb',
        href: hrefCheckinM,
        hrefMonth: hrefCheckinM,
        hrefYear: hrefCheckinY,
        bullets: [
          '✅ Envío automático al Ministerio (MIR)',
          '✅ Check-in digital y registro de viajeros',
          '✅ Reservas directas (9% comisión)',
          '✅ Cumplimiento RD 933/2021',
          '✅ Anuncios discretos',
        ],
      })}

      ${pricingCard({
        title: 'Plan Standard',
        price: '9,99€',
        priceSuffix: '/mes',
        subtitle: '1 propiedad incluida. Sin anuncios.',
        border: '#fdba74',
        buttonText: 'Contratar Standard',
        buttonColor: '#c2410c',
        href: hrefStandardM,
        hrefMonth: hrefStandardM,
        hrefYear: hrefStandardY,
        bullets: [
          '✅ Todo lo del Check-in',
          '✅ Sin anuncios',
          '✅ 1 propiedad incluida, luego 2€/mes por cada nueva',
          '✅ Reservas directas (9% comisión)',
          '✅ Instrucciones de check-in por email al huésped (seguimiento de apertura)',
        ],
      })}

      ${pricingCard({
        title: 'Plan Pro',
        price: '29,99€',
        priceSuffix: '/mes',
        subtitle: '1 propiedad incluida, luego 2€/mes por cada adicional. Sin anuncios.',
        border: '#c4b5fd',
        buttonText: 'Contratar Pro',
        buttonColor: '#7c3aed',
        href: hrefProM,
        hrefMonth: hrefProM,
        hrefYear: hrefProY,
        bullets: [
          '✅ Todo lo del Standard',
          '✅ 1 propiedad incluida, luego 2€/mes por cada nueva',
          '✅ Reservas directas con solo 5% comisión',
          '✅ Instrucciones de check-in por email al huésped (seguimiento de apertura)',
          '✅ Reseñas Google + microsite en tu ficha (más visibilidad y reservas directas fuera de Airbnb/Booking)',
          '✅ Sin anuncios, soporte prioritario y copia de seguridad',
        ],
      })}
    </div>
  </div>
</section>
`.trim();
}

function freePlanCard(opts: { signupFreeUrl: string; locale: string }): string {
  return `
<div style="background:#ffffff;border:3px solid #a7f3d0;border-radius:16px;padding:16px;box-shadow:0 10px 22px rgba(15,23,42,0.08);">
  <div style="text-align:center;">
    <div style="display:inline-block; font-size: 11px; font-weight: 900; padding: 6px 10px; border-radius: 999px; background: #e2e8f0; color:#0f172a; margin-bottom: 10px;">Plan Gratis</div>
    <div style="font-size: 18px; font-weight: 950; color:#0f172a; margin: 0;">Plan Básico</div>
    <div style="margin-top: 10px;">
      <span style="font-size: 40px; font-weight: 950; color:#0f172a;">0€</span>
      <span style="color:#475569; font-weight: 800; font-size: 13px;">/mes</span>
    </div>
    <div style="margin-top: 8px; color:#475569; font-size: 13px; font-weight: 700;">Hasta 1 propiedad. Con anuncios.</div>
  </div>
  <ul style="list-style:none; padding: 14px 0 0 0; margin: 14px 0 0 0; border-top: 1px solid #e2e8f0;">
    <li style="display:flex; gap: 8px; align-items:flex-start; margin: 0 0 8px 0; color:#334155; font-size: 13px; line-height: 1.35;">✅ Formulario y listado de viajeros</li>
    <li style="display:flex; gap: 8px; align-items:flex-start; margin: 0 0 8px 0; color:#334155; font-size: 13px; line-height: 1.35;">✅ Descarga XML (subida manual al Ministerio)</li>
    <li style="display:flex; gap: 8px; align-items:flex-start; margin: 0 0 8px 0; color:#334155; font-size: 13px; line-height: 1.35;">✅ Reservas directas (9% comisión)</li>
    <li style="display:flex; gap: 8px; align-items:flex-start; margin: 0 0 8px 0; color:#334155; font-size: 13px; line-height: 1.35;">✅ Anuncios discretos</li>
    <li style="display:flex; gap: 8px; align-items:flex-start; margin: 0 0 8px 0; color:#334155; font-size: 13px; line-height: 1.35;">❌ Envío automático MIR (no incluido)</li>
  </ul>

  <button type="button" id="delfin-free-toggle" style="width:100%; margin-top: 14px; text-align:center; background:#16a34a; color:#fff; padding: 12px 14px; border-radius: 12px; font-weight: 900; border: 0; cursor: pointer;">
    Empezar Gratis
  </button>

  <div id="delfin-free-form-wrap" style="display:none; margin-top: 12px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
    <label for="delfin-free-email" style="display:block; font-weight: 900; font-size: 13px; color:#0f172a; margin-bottom: 6px;">Email</label>
    <input id="delfin-free-email" type="email" placeholder="tu@email.com" style="width: 100%; box-sizing: border-box; padding: 12px 14px; border-radius: 12px; border: 2px solid #cbd5e1; font-size: 14px;" />
    <button type="button" id="delfin-free-submit" style="width:100%; margin-top: 10px; text-align:center; background:#0f172a; color:#fff; padding: 12px 14px; border-radius: 12px; font-weight: 900; border: 0; cursor: pointer;">
      Enviar acceso por email
    </button>
    <div id="delfin-free-msg" style="margin-top: 10px; font-size: 12px; color:#334155;"></div>
  </div>

  <script>
    (function(){
      try {
        var toggle = document.getElementById('delfin-free-toggle');
        var wrap = document.getElementById('delfin-free-form-wrap');
        var email = document.getElementById('delfin-free-email');
        var submit = document.getElementById('delfin-free-submit');
        var msg = document.getElementById('delfin-free-msg');
        if (!toggle || !wrap || !email || !submit || !msg) return;

        toggle.addEventListener('click', function() {
          wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
          if (wrap.style.display === 'block') email.focus();
        });

        submit.addEventListener('click', async function() {
          var v = String(email.value || '').trim();
          if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v)) {
            msg.textContent = 'Introduce un email válido.';
            msg.style.color = '#b91c1c';
            return;
          }
          msg.textContent = 'Enviando...';
          msg.style.color = '#334155';
          try {
            var res = await fetch('${escapeAttr(opts.signupFreeUrl)}', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: v, locale: '${escapeAttr(opts.locale)}' })
            });
            var data = await res.json().catch(function(){ return {}; });
            if (!res.ok || data.success === false) {
              msg.textContent = (data && data.error) ? String(data.error) : 'No se pudo completar el registro. Inténtalo más tarde.';
              msg.style.color = '#b91c1c';
              return;
            }
            msg.textContent = 'Listo. Revisa tu correo para continuar con el acceso.';
            msg.style.color = '#047857';
          } catch (e) {
            msg.textContent = 'No se pudo completar el registro. Inténtalo más tarde.';
            msg.style.color = '#b91c1c';
          }
        });
      } catch (e) {}
    })();
  </script>
</div>`.trim();
}

function pricingCard(opts: {
  badge?: string;
  title: string;
  price: string;
  priceSuffix: string;
  subtitle: string;
  bullets: string[];
  buttonText: string;
  buttonColor: string;
  border: string;
  href: string;
  hrefMonth?: string;
  hrefYear?: string;
}): string {
  const badge = opts.badge
    ? `<div style="display:inline-block; font-size: 11px; font-weight: 900; padding: 6px 10px; border-radius: 999px; background: #e2e8f0; color:#0f172a; margin-bottom: 10px;">${escapeAttr(opts.badge)}</div>`
    : '';
  const bullets = opts.bullets
    .map(
      (b) =>
        `<li style="display:flex; gap: 8px; align-items:flex-start; margin: 0 0 8px 0; color:#334155; font-size: 13px; line-height: 1.35;">${escapeAttr(
          b
        )}</li>`
    )
    .join('');
  return `
<div style="background:#ffffff;border:3px solid ${opts.border};border-radius:16px;padding:16px;box-shadow:0 10px 22px rgba(15,23,42,0.08);">
  <div style="text-align:center;">
    ${badge}
    <div style="font-size: 18px; font-weight: 950; color:#0f172a; margin: 0;">${escapeAttr(opts.title)}</div>
    <div style="margin-top: 10px;">
      <span style="font-size: 40px; font-weight: 950; color:#0f172a;">${escapeAttr(opts.price)}</span>
      <span style="color:#475569; font-weight: 800; font-size: 13px;">${escapeAttr(opts.priceSuffix)}</span>
    </div>
    <div style="margin-top: 8px; color:#475569; font-size: 13px; font-weight: 700;">${escapeAttr(opts.subtitle)}</div>
  </div>
  <ul style="list-style:none; padding: 14px 0 0 0; margin: 14px 0 0 0; border-top: 1px solid #e2e8f0;">
    ${bullets}
  </ul>
  <a
    href="${opts.href}"
    data-href-month="${escapeAttr(opts.hrefMonth || opts.href)}"
    data-href-year="${escapeAttr(opts.hrefYear || opts.href)}"
    data-delfin-billing-link="1"
    style="display:block; margin-top: 14px; text-align:center; background:${opts.buttonColor}; color:#fff; padding: 12px 14px; border-radius: 12px; font-weight: 900; text-decoration:none;"
  >
    ${escapeAttr(opts.buttonText)}
  </a>
</div>`.trim();
}

function replaceWaitlistWithPlans(html: string): string {
  let out = html;

  out = out.replace(/<section[^>]*class="waitlist-section"[\s\S]*?<\/section>/gi, '');
  // Plantilla histórica: sección grande con id="registro" (sin class waitlist-section).
  out = out.replace(
    /<section\b[^>]*id=["']registro["'][^>]*>[\s\S]*?(waitlistForm|lista de espera|acceso permanente|Quiero acceso anticipado)[\s\S]*?<\/section>/gi,
    ''
  );
  // El popup tiene divs anidados: eliminar solo hasta el primer </div> rompe el HTML.
  out = out.replace(/<div[^>]*id="popupWaitlist"[\s\S]*?<\/div>\s*<\/div>/gi, '');
  out = out.replace(/<div[^>]*class="popup-overlay"[\s\S]*?<\/div>/gi, '');
  out = out.replace(/<form[^>]*>[\s\S]*?(waitlist|popupWaitlist)[\s\S]*?<\/form>/gi, '');
  // Script inline antiguo (plantilla): endpoint /blog/waitlist
  out = out.replace(
    /<script\b[^>]*>(?:(?!<\/script>)[\s\S])*?\/blog\/waitlist(?:(?!<\/script>)[\s\S])*?<\/script>/gi,
    ''
  );
  // No cruzar límites de </script> para no borrar HTML fuera del script.
  out = out.replace(
    /<script\b[^>]*>(?:(?!<\/script>)[\s\S])*?(waitlist|popupWaitlist)(?:(?!<\/script>)[\s\S])*?<\/script>/gi,
    ''
  );

  const marker = 'Planes claros y transparentes';
  if (!out.includes(marker)) {
    if (out.includes('</article>')) {
      out = out.replace('</article>', `${plansHtmlBlock()}\n</article>`);
    } else if (out.includes('</body>')) {
      out = out.replace('</body>', `${plansHtmlBlock()}\n</body>`);
    } else {
      out = `${out}\n${plansHtmlBlock()}`;
    }
  }

  return out;
}

function injectBillingToggleScript(html: string): string {
  const script = `<script>
  (function(){
    try {
      var bM = document.getElementById('delfin-billing-month');
      var bY = document.getElementById('delfin-billing-year');
      if (!bM || !bY) return;
      var links = document.querySelectorAll('[data-delfin-billing-link=\"1\"]');
      function setMode(mode){
        try { localStorage.setItem('delfin_billing_interval', mode); } catch (e) {}
        links.forEach(function(a){
          var h = (mode === 'year') ? a.getAttribute('data-href-year') : a.getAttribute('data-href-month');
          if (h) a.setAttribute('href', h);
        });
        if (mode === 'year') {
          bY.style.background = '#ffffff';
          bM.style.background = 'transparent';
        } else {
          bM.style.background = '#ffffff';
          bY.style.background = 'transparent';
        }
      }
      bM.addEventListener('click', function(){ setMode('month'); });
      bY.addEventListener('click', function(){ setMode('year'); });
      var saved = 'month';
      try { saved = localStorage.getItem('delfin_billing_interval') || 'month'; } catch (e2) {}
      setMode(saved === 'year' ? 'year' : 'month');
    } catch (e) {}
  })();
  </script>`;

  if (html.includes('delfin-billing-month') && !html.includes('delfin_billing_interval')) {
    if (html.includes('</body>')) return html.replace('</body>', `${script}\n</body>`);
    return `${html}\n${script}`;
  }
  return html;
}

function injectSoftPopup(html: string): string {
  const marker = 'id="delfin-soft-popup"';
  if (html.includes(marker)) return html;

  const popupHtml = `
<style>
  #delfin-soft-popup-overlay{position:fixed;inset:0;background:rgba(2,6,23,.55);display:none;align-items:center;justify-content:center;z-index:999999;}
  #delfin-soft-popup{width:min(520px,calc(100vw - 32px));background:#fff;border-radius:18px;box-shadow:0 16px 48px rgba(2,6,23,.35);border:1px solid rgba(148,163,184,.6);overflow:hidden}
  #delfin-soft-popup .hd{padding:16px 16px 0 16px}
  #delfin-soft-popup .ttl{font-weight:950;font-size:20px;line-height:1.2;color:#0f172a;margin:0}
  #delfin-soft-popup .sub{margin:10px 0 0 0;color:#334155;font-size:14px;line-height:1.45}
  #delfin-soft-popup .cta{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:16px}
  #delfin-soft-popup .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;padding:12px 14px;font-weight:900;text-decoration:none}
  #delfin-soft-popup .btn-primary{background:#0f172a;color:#fff;flex:1}
  #delfin-soft-popup .btn-ghost{background:#f1f5f9;color:#0f172a}
  #delfin-soft-popup .x{position:absolute;top:10px;right:10px;border:0;background:transparent;cursor:pointer;font-size:20px;line-height:1;color:#475569}
  #delfin-soft-popup .wrap{position:relative}
</style>
<div id="delfin-soft-popup-overlay" role="dialog" aria-modal="true" aria-label="Delfín Check-in">
  <div class="wrap">
    <div id="delfin-soft-popup">
      <button class="x" type="button" aria-label="Cerrar" id="delfin-soft-popup-close">×</button>
      <div class="hd">
        <p class="ttl">Prueba Delfín Check-in gratis (1 propiedad)</p>
        <p class="sub">
          Automatiza el <strong>registro de viajeros</strong> y el <strong>envío de partes</strong> al Gobierno de España (MIR).
          En minutos lo tienes listo.
        </p>
      </div>
      <div class="cta">
        <a class="btn btn-primary" id="delfin-soft-popup-cta" href="https://delfincheckin.com/#precios" target="_blank" rel="noreferrer">
          Ver planes y empezar
        </a>
        <button class="btn btn-ghost" type="button" id="delfin-soft-popup-later">Más tarde</button>
      </div>
    </div>
  </div>
</div>
<script>
  (function(){
    try {
      var overlay = document.getElementById('delfin-soft-popup-overlay');
      var closeBtn = document.getElementById('delfin-soft-popup-close');
      var laterBtn = document.getElementById('delfin-soft-popup-later');
      var cta = document.getElementById('delfin-soft-popup-cta');
      if (!overlay || !closeBtn || !laterBtn || !cta) return;

      function safeGet(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
      function safeSet(k,v){ try { localStorage.setItem(k,v); } catch(e){} }

      var KEY = 'delfin_soft_popup_last';
      var last = Number(safeGet(KEY) || '0');
      var now = Date.now();
      var COOLDOWN_MS = 1000 * 60 * 60 * 24 * 7;
      if (last && (now - last) < COOLDOWN_MS) return;

      function getSessionId(){
        var k = 'delfin_blog_session_id';
        var v = safeGet(k);
        if (v) return v;
        v = (Math.random().toString(16).slice(2) + Date.now().toString(16)).slice(0, 32);
        safeSet(k, v);
        return v;
      }

      function track(eventType){
        try {
          var slug = (typeof ARTICLE_SLUG === 'string' && ARTICLE_SLUG) ? ARTICLE_SLUG : null;
          if (!slug) return;
          fetch('https://admin.delfincheckin.com/api/blog/analytics/track', {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              article_slug: slug,
              session_id: getSessionId(),
              event_type: eventType,
              event_data: { source: 'soft_popup' }
            })
          }).catch(function(){});
        } catch(e) {}
      }

      function open(){
        overlay.style.display = 'flex';
        safeSet(KEY, String(Date.now()));
        track('popup_view');
      }
      function close(){
        overlay.style.display = 'none';
        track('popup_close');
      }

      closeBtn.addEventListener('click', close);
      laterBtn.addEventListener('click', close);
      overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
      cta.addEventListener('click', function(){ track('popup_click'); });

      setTimeout(open, 12000);
    } catch(e) {}
  })();
</script>
`.trim();

  if (html.includes('</body>')) return html.replace('</body>', `${popupHtml}\n</body>`);
  return `${html}\n${popupHtml}`;
}

function toSlug(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

async function pickTopicKeyForToday(batch: Batch): Promise<{ key: string; title: string }> {
  // 1) No repetir en el mismo día/batch
  const day = utcDayKey();
  const usedToday = await sql`
    SELECT meta_keywords
    FROM blog_articles
    WHERE created_at >= ${`${day}T00:00:00.000Z`}::timestamptz
      AND created_at <  ${`${day}T23:59:59.999Z`}::timestamptz
      AND meta_keywords ILIKE ${`%auto_topic:${batch}:%`}
  `;
  if (usedToday.rows.length > 0) {
    // ya generamos para ese batch hoy
    throw new Error(`already_generated:${batch}`);
  }

  // 2) Evitar repetir keys recientes (últimos 30 posts)
  const recent = await sql`
    SELECT meta_keywords
    FROM blog_articles
    ORDER BY created_at DESC
    LIMIT 30
  `;
  const recentKeys = new Set<string>();
  for (const r of recent.rows as any[]) {
    const mk = String(r.meta_keywords || '');
    const m = mk.match(/auto_topic_key:([a-z0-9-]+)/i);
    if (m?.[1]) recentKeys.add(m[1]);
  }

  const candidates = TOPICS.filter(t => !recentKeys.has(t.key));
  const pool = candidates.length > 0 ? candidates : TOPICS;

  // simple reparto: morning usa pares, afternoon impares, pero cae a pool si no hay
  const filtered = pool.filter((_, idx) => (batch === 'morning' ? idx % 2 === 0 : idx % 2 === 1));
  const finalPool = filtered.length > 0 ? filtered : pool;
  return finalPool[Math.floor(Math.random() * finalPool.length)];
}

async function generateArticle(topicTitle: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no configurada');
  }

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: BLOG_SYSTEM_PROMPT },
      { role: 'user', content: `Tema: "${topicTitle}". Genera un artículo nuevo siguiendo los requisitos.` },
    ],
    temperature: 0.6,
    max_tokens: 5000,
  });

  const raw = completion.choices[0]?.message?.content?.trim() || '';
  if (!raw) throw new Error('OpenAI devolvió contenido vacío');
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = codeBlock ? codeBlock[1].trim() : raw;
  const data = JSON.parse(jsonStr) as {
    slug?: string;
    title?: string;
    meta_description?: string;
    meta_keywords?: string;
    excerpt?: string;
    content?: string;
  };

  const slugBase = toSlug(data.slug || data.title || topicTitle) || `articulo-${Date.now()}`;
  const title = String(data.title || topicTitle).slice(0, 500);
  const meta_description = String(data.meta_description || '').slice(0, 500);
  const meta_keywords = String(data.meta_keywords || '').slice(0, 1000);
  const excerpt = String(data.excerpt || '').slice(0, 1000);
  const content = String(data.content || '<p>Contenido pendiente.</p>');

  return { slugBase, title, meta_description, meta_keywords, excerpt, content };
}

async function insertDraft(args: {
  slugBase: string;
  title: string;
  meta_description: string;
  meta_keywords: string;
  excerpt: string;
  content: string;
  batch: Batch;
  topicKey: string;
}) {
  // Asegurar slug único
  let finalSlug = args.slugBase;
  const existing = await sql`SELECT id FROM blog_articles WHERE slug = ${finalSlug}`;
  if (existing.rows.length > 0) {
    finalSlug = `${args.slugBase}-${Date.now().toString(36)}`;
  }

  const schema_json = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: args.title,
    description: args.meta_description,
    datePublished: new Date().toISOString().split('T')[0],
    dateModified: new Date().toISOString().split('T')[0],
    author: { '@type': 'Organization', name: 'Delfín Check-in' },
    publisher: { '@type': 'Organization', name: 'Delfín Check-in' },
  };

  // Metemos marcas internas en meta_keywords para deduplicar sin tocar esquema de BD:
  const mk = [args.meta_keywords, `auto_topic:${args.batch}:1`, `auto_topic_key:${args.topicKey}`]
    .filter(Boolean)
    .join(', ')
    .slice(0, 1000);

  const result = await sql`
    INSERT INTO blog_articles (
      slug, title, meta_description, meta_keywords,
      content, excerpt, canonical_url, schema_json,
      status, is_published, author_name
    ) VALUES (
      ${finalSlug}, ${args.title}, ${args.meta_description}, ${mk},
      ${args.content}, ${args.excerpt}, ${`https://delfincheckin.com/articulos/${finalSlug}.html`},
      ${JSON.stringify(schema_json)}::jsonb,
      'draft', false, 'Delfín Check-in'
    )
    RETURNING id, slug, title, created_at
  `;
  return result.rows[0] as { id: string; slug: string; title: string; created_at: string };
}

async function publishToGithub(slug: string): Promise<string> {
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_TOKEN_LANDING;
  if (!token) throw new Error('GITHUB_TOKEN (o GITHUB_TOKEN_LANDING) no configurado');

  const articleResult = await sql`
    SELECT id, slug, title, meta_description, meta_keywords, content, excerpt,
           published_at, updated_at, is_published, status
    FROM blog_articles
    WHERE slug = ${slug}
    LIMIT 1
  `;
  if (articleResult.rows.length === 0) throw new Error('Artículo no encontrado en BD');
  const article = articleResult.rows[0] as any;

  const publishedAt = article.published_at ? new Date(article.published_at) : new Date();
  const updatedAt = article.updated_at ? new Date(article.updated_at) : publishedAt;
  const publishedDate = publishedAt.toISOString().split('T')[0];
  const modifiedDate = updatedAt.toISOString().split('T')[0];
  const readTime = estimateReadTimeMinutes(article.content || '');

  async function fetchTemplateWithRetry(): Promise<string> {
    let lastErr: any = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(TEMPLATE_URL, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.text();
      } catch (e: any) {
        lastErr = e;
        // Pequeño backoff lineal (no bloquea demasiado el cron)
        await new Promise((r) => setTimeout(r, attempt * 250));
      }
    }
    throw new Error(
      `No se pudo descargar plantilla (${TEMPLATE_URL}). Último error: ${String(lastErr?.message || lastErr)}`
    );
  }

  let html = await fetchTemplateWithRetry();

  const replacements: [string, string][] = [
    ['{{ARTICLE_TITLE}}', escapeAttr(article.title || '')],
    ['{{META_DESCRIPTION}}', escapeAttr(article.meta_description || '')],
    ['{{META_KEYWORDS}}', escapeAttr(article.meta_keywords || '')],
    ['{{ARTICLE_SLUG}}', article.slug],
    ['{{PUBLISHED_DATE}}', publishedDate],
    ['{{MODIFIED_DATE}}', modifiedDate],
    ['{{PUBLISH_DATE}}', publishedDate],
    ['{{READ_TIME}}', String(readTime)],
    ['{{ARTICLE_CONTENT}}', article.content || ''],
  ];
  for (const [from, to] of replacements) html = html.split(from).join(to);

  const scriptSlugLiteral = "const ARTICLE_SLUG = 'multas-por-no-registrar-viajeros-espana';";
  if (html.includes(scriptSlugLiteral)) {
    html = html.replace(scriptSlugLiteral, `const ARTICLE_SLUG = '${article.slug}';`);
  }

  // IMPORTANTE: eliminar waitlist/popup y colocar CTA de planes también en generación automática.
  html = replaceWaitlistWithPlans(html);
  html = injectBillingToggleScript(html);
  html = injectSoftPopup(html);

  const octokit = new Octokit({
    auth: token,
    request: { headers: { 'X-GitHub-Api-Version': '2022-11-28' } },
  });
  const filePath = `articulos/${article.slug}.html`;

  const contentBase64 = Buffer.from(html, 'utf-8').toString('base64');
  // Evitar 404 ruidoso: primero intentamos crear sin leer sha.
  // Si ya existe, GitHub devuelve 409 y entonces hacemos update con sha.
  try {
    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: filePath,
      message: `Publicar artículo: ${article.title}`,
      content: contentBase64,
      branch: GITHUB_BRANCH,
    });
  } catch (e: any) {
    if (e?.status !== 409) {
      const msg = String(e?.message || e);
      throw new Error(`GitHub createOrUpdate falló (status ${e?.status || 'unknown'}): ${msg}`);
    }
    const { data } = await octokit.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: filePath,
      ref: GITHUB_BRANCH,
    });
    const sha = !Array.isArray(data) && (data as any).sha ? String((data as any).sha) : undefined;
    if (!sha) throw new Error('No se pudo obtener sha del fichero existente en GitHub');
    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: filePath,
      message: `Actualizar artículo: ${article.title}`,
      content: contentBase64,
      branch: GITHUB_BRANCH,
      sha,
    });
  }

  return `https://delfincheckin.com/articulos/${article.slug}.html`;
}

async function markPublished(id: string) {
  const now = new Date().toISOString();
  await sql`
    UPDATE blog_articles
    SET is_published = true,
        status = 'published',
        published_at = COALESCE(published_at, ${now}),
        updated_at = ${now}
    WHERE id = ${id}::uuid
  `;
}

export async function GET(req: NextRequest) {
  try {
    const isVercelCron = req.headers.get('x-vercel-cron') === '1';
    const authHeader = req.headers.get('authorization');

    const { searchParams } = new URL(req.url);
    const batch = (searchParams.get('batch') || 'morning') as Batch;
    const mode = (searchParams.get('mode') || '').toLowerCase(); // 'test' para smoke
    if (batch !== 'morning' && batch !== 'afternoon') {
      return NextResponse.json({ error: 'batch inválido (morning|afternoon)' }, { status: 400 });
    }

    // Auth: Vercel cron es público por diseño (solo Vercel lo llama).
    // Manual: requiere superadmin o Bearer CRON_SECRET.
    if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      const { error } = await verifySuperAdmin(req);
      if (error) return error;
    }

    // Límite duro: 2 artículos/día (1 morning + 1 afternoon)
    // En mode=test, NO aplicamos cuota (sirve para probar el cron sin esperar al día siguiente).
    const day = utcDayKey();
    if (mode !== 'test') {
      const countToday = await sql`
        SELECT COUNT(*)::int AS c
        FROM blog_articles
        WHERE created_at >= ${`${day}T00:00:00.000Z`}::timestamptz
          AND created_at <  ${`${day}T23:59:59.999Z`}::timestamptz
          AND meta_keywords ILIKE '%auto_topic:%'
      `;
      const c = Number(countToday.rows[0]?.c ?? 0);
      if (c >= 2) {
        return NextResponse.json({ success: true, skipped: 'daily_quota_reached', today: c });
      }
    }

    // Modo prueba: crea un artículo corto controlado (sin OpenAI) y lo publica.
    if (mode === 'test') {
      const slugBase = `test-cron-${Date.now().toString(36)}`;
      const title = `TEST Cron Blog (${batch}) — ${day}`;
      const meta_description = 'Artículo de prueba para validar el cron de publicación a GitHub.';
      const meta_keywords = `test, auto_topic:${batch}:1, auto_topic_key:test`;
      const excerpt = 'Prueba de cron (sin OpenAI).';
      const content = `<p>Artículo de prueba para validar que el cron publica correctamente y que el bloque de planes no incluye waitlist.</p>`;
      const draft = await insertDraft({
        slugBase,
        title,
        meta_description,
        meta_keywords,
        excerpt,
        content,
        batch,
        topicKey: 'test',
      });
      const url = await publishToGithub(draft.slug);
      await markPublished(draft.id);
      return NextResponse.json({ success: true, mode: 'test', batch, slug: draft.slug, url });
    }

    let topic;
    try {
      topic = await pickTopicKeyForToday(batch);
    } catch (e: any) {
      if (String(e?.message || '').startsWith('already_generated:')) {
        return NextResponse.json({ success: true, skipped: 'already_generated', batch });
      }
      throw e;
    }

    const generated = await generateArticle(topic.title);
    const draft = await insertDraft({
      ...generated,
      batch,
      topicKey: topic.key,
    });

    const url = await publishToGithub(draft.slug);
    await markPublished(draft.id);

    return NextResponse.json({
      success: true,
      batch,
      topic: topic.title,
      slug: draft.slug,
      url,
    });
  } catch (err: any) {
    console.error('[blog-cron]', err);
    return NextResponse.json({ error: err?.message || 'Error interno' }, { status: 500 });
  }
}

