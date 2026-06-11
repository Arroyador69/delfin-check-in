/** Bloques HTML de captación (solo plan gratis) para artículos del blog y popup. */

const APP_BASE = 'https://admin.delfincheckin.com';
const LANDING_SIGNUP = 'https://delfincheckin.com/#registro';
const SUPPORT_EMAIL = 'contacto@delfincheckin.com';

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

const CAPTURE_STYLES = `
<style>
  .delfin-capture-wrap{max-width:560px;margin:2rem auto;padding:0 4px}
  .delfin-capture-card{position:relative;overflow:hidden;border-radius:22px;border:2px solid rgba(68,192,255,.4);background:linear-gradient(145deg,#f0f9ff 0%,#fff 45%,#f0fdf4 100%);box-shadow:0 20px 50px rgba(37,99,235,.12);padding:24px}
  .delfin-capture-badge{display:inline-block;font-size:12px;font-weight:900;padding:8px 12px;border-radius:999px;background:linear-gradient(135deg,#dcfce7,#bbf7d0);color:#166534;margin-bottom:12px}
  .delfin-capture-title{margin:0 0 8px;font-size:1.65rem;font-weight:950;line-height:1.15;color:#0f172a}
  .delfin-capture-sub{margin:0 0 16px;color:#475569;font-size:15px;line-height:1.55}
  .delfin-capture-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 0 18px;padding:0;list-style:none}
  .delfin-capture-steps li{text-align:center;padding:10px 8px;border-radius:12px;background:#fff;border:1px solid #e2e8f0;font-size:11px;font-weight:700;color:#334155;line-height:1.35}
  .delfin-capture-steps strong{display:block;font-size:16px;color:#2563eb;margin-bottom:2px}
  .delfin-capture-input{width:100%;box-sizing:border-box;height:48px;padding:0 14px;border-radius:12px;border:2px solid #cbd5e1;font-size:15px;margin-top:6px}
  .delfin-capture-input:focus{outline:none;border-color:#44c0ff;box-shadow:0 0 0 3px rgba(68,192,255,.25)}
  .delfin-capture-label{display:block;font-weight:800;font-size:13px;color:#0f172a}
  .delfin-capture-btn{width:100%;margin-top:14px;padding:14px 16px;border:0;border-radius:12px;cursor:pointer;font-weight:900;font-size:15px;color:#fff;background:linear-gradient(135deg,#44c0ff,#2563eb,#16a34a);box-shadow:0 8px 22px rgba(37,99,235,.3)}
  .delfin-capture-msg{margin-top:12px;padding:14px;border-radius:12px;font-size:13px;line-height:1.55;display:none}
  .delfin-capture-msg.ok{display:block;background:#ecfdf5;border:2px solid #6ee7b7;color:#065f46}
  .delfin-capture-msg.err{display:block;background:#fef2f2;border:2px solid #fca5a5;color:#991b1b}
  .delfin-capture-msg a{color:#047857;font-weight:700}
  @media(max-width:520px){.delfin-capture-steps{grid-template-columns:1fr}}
</style>`.trim();

function signupSuccessHtml(): string {
  return (
    '<strong>¡Revisa tu correo!</strong> Te hemos enviado el enlace para <strong>entrar al sistema</strong> y completar el onboarding. En unos <strong>2 minutos</strong> puedes estar usándolo.<br><br>' +
    'Si no lo ves, busca en <strong>spam, correo no deseado o promociones</strong>. ¿Nada? Escríbenos a ' +
    `<a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.`
  );
}

export function freePlanCaptureCard(opts: { signupFreeUrl?: string; locale?: string } = {}): string {
  const signupFreeUrl = opts.signupFreeUrl ?? `${APP_BASE}/api/public/signup-free`;
  const locale = opts.locale ?? 'es';
  const uid = `dcf-${Math.random().toString(36).slice(2, 9)}`;

  return `
<div class="delfin-capture-wrap">
  <div class="delfin-capture-card">
    <span class="delfin-capture-badge">🐬 Pruébalo ahora · en 2 minutos lo usas</span>
    <h3 class="delfin-capture-title">Prueba gratis con 1 propiedad</h3>
    <p class="delfin-capture-sub">
      Cumple el <strong>parte de viajeros</strong> y el envío al <strong>Ministerio del Interior</strong> (RD 933/2021).
      Solo tu email — sin tarjeta. Te enviamos el acceso al panel para registrar tu alojamiento.
    </p>
    <ol class="delfin-capture-steps">
      <li><strong>1</strong>Tu email</li>
      <li><strong>2</strong>Revisa el correo</li>
      <li><strong>3</strong>1 propiedad</li>
    </ol>
    <label class="delfin-capture-label" for="${uid}-email">Email *</label>
    <input id="${uid}-email" class="delfin-capture-input" type="email" placeholder="tu@email.com" autocomplete="email" />
    <button type="button" id="${uid}-submit" class="delfin-capture-btn">Empezar ahora — es gratis</button>
    <div id="${uid}-msg" class="delfin-capture-msg" role="status"></div>
  </div>
</div>
<script>
  (function(){
    try {
      var email = document.getElementById('${uid}-email');
      var submit = document.getElementById('${uid}-submit');
      var msg = document.getElementById('${uid}-msg');
      if (!email || !submit || !msg) return;
      var successHtml = ${JSON.stringify(signupSuccessHtml())};

      submit.addEventListener('click', async function() {
        var v = String(email.value || '').trim();
        if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v)) {
          msg.innerHTML = 'Introduce un email válido.';
          msg.className = 'delfin-capture-msg err';
          return;
        }
        submit.disabled = true;
        msg.innerHTML = 'Enviando…';
        msg.className = 'delfin-capture-msg ok';
        try {
          var res = await fetch('${escapeAttr(signupFreeUrl)}', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: v, locale: '${escapeAttr(locale)}' })
          });
          var data = await res.json().catch(function(){ return {}; });
          if (!res.ok || data.success === false) {
            msg.innerHTML = (data && data.error) ? String(data.error) : 'No se pudo completar el registro. Inténtalo más tarde.';
            msg.className = 'delfin-capture-msg err';
            return;
          }
          msg.innerHTML = successHtml;
          msg.className = 'delfin-capture-msg ok';
          email.value = '';
        } catch (e) {
          msg.innerHTML = 'No se pudo completar el registro. Inténtalo más tarde.';
          msg.className = 'delfin-capture-msg err';
        } finally {
          submit.disabled = false;
        }
      });
    } catch (e) {}
  })();
</script>`.trim();
}

export function plansHtmlBlock(): string {
  return `
${CAPTURE_STYLES}
<section style="margin: 2.5rem 0;">
  <div style="text-align:center;margin-bottom:1.25rem;">
    <h2 style="font-size: 2rem; line-height: 1.2; font-weight: 900; color: #0f172a; margin: 0;">
      Pruébalo ahora — en 2 minutos puedes estar usándolo
    </h2>
    <p style="margin: 0.75rem auto 0; max-width: 640px; color: #475569; font-size: 1rem; line-height: 1.55;">
      Registro de viajeros y cumplimiento del <strong>Ministerio del Interior</strong> (RD 933/2021).
      <strong>1 propiedad gratis</strong> — solo email, sin tarjeta.
    </p>
  </div>
  ${freePlanCaptureCard()}
</section>
`.trim();
}

export function softPopupHtml(): string {
  return `
<style>
  #delfin-soft-popup-overlay{position:fixed;inset:0;background:rgba(2,6,23,.62);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;z-index:999999;padding:16px}
  #delfin-soft-popup{position:relative;width:min(560px,calc(100vw - 32px));background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 28px 80px rgba(2,6,23,.35);border:2px solid rgba(68,192,255,.35)}
  #delfin-soft-popup .popup-hero{padding:22px;background:linear-gradient(135deg,#e0f2fe,#dcfce7);border-bottom:1px solid rgba(148,163,184,.3)}
  #delfin-soft-popup .popup-emoji{font-size:34px;margin-bottom:6px}
  #delfin-soft-popup .ttl{font-weight:950;font-size:22px;line-height:1.2;color:#0f172a;margin:0}
  #delfin-soft-popup .sub{margin:10px 0 0;color:#334155;font-size:14px;line-height:1.5}
  #delfin-soft-popup .popup-highlight{display:inline-block;margin-top:10px;padding:8px 12px;border-radius:10px;background:rgba(255,255,255,.8);font-size:12px;font-weight:800;color:#1d4ed8}
  #delfin-soft-popup .cta{padding:16px 18px 18px;display:grid;gap:10px}
  #delfin-soft-popup .btn{display:inline-flex;align-items:center;justify-content:center;border-radius:12px;padding:12px 14px;font-weight:800;font-size:14px;text-decoration:none;border:0;cursor:pointer}
  #delfin-soft-popup .btn-primary{background:linear-gradient(135deg,#44c0ff,#2563eb);color:#fff}
  #delfin-soft-popup .btn-ghost{background:#f1f5f9;color:#475569}
  #delfin-soft-popup .x{position:absolute;top:10px;right:10px;border:0;background:#fff;width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:20px;color:#475569;z-index:2}
  #delfin-popup-email{width:100%;box-sizing:border-box;height:46px;padding:0 12px;border-radius:12px;border:2px solid #cbd5e1;font-size:14px}
  #delfin-popup-msg{font-size:12px;line-height:1.45;display:none}
  #delfin-popup-msg.ok{display:block;color:#047857}
  #delfin-popup-msg.err{display:block;color:#b91c1c}
</style>
<div id="delfin-soft-popup-overlay" role="dialog" aria-modal="true" aria-label="Delfín Check-in">
  <div style="position:relative">
    <div id="delfin-soft-popup">
      <button class="x" type="button" aria-label="Cerrar" id="delfin-soft-popup-close">×</button>
      <div class="popup-hero">
        <div class="popup-emoji">🐬</div>
        <p class="ttl">Pruébalo ahora — gratis</p>
        <p class="sub">Parte de viajeros al <strong>Ministerio del Interior</strong>. <strong>En ~2 minutos</strong> puedes entrar al panel con 1 propiedad.</p>
        <span class="popup-highlight">⏱️ Solo email · sin tarjeta</span>
      </div>
      <div class="cta">
        <input type="email" id="delfin-popup-email" placeholder="tu@email.com" autocomplete="email" />
        <a class="btn btn-primary" id="delfin-soft-popup-cta" href="${LANDING_SIGNUP}" target="_blank" rel="noreferrer">Empezar ahora con mi email</a>
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

      setTimeout(open, 10000);
    } catch (e) {}
  })();
</script>`.trim();
}

export const PLANS_CAPTURE_MARKER = 'Pruébalo ahora — en 2 minutos';
export const PLANS_CAPTURE_MARKER_LEGACY = 'Prueba gratis con 1 propiedad';
export const PLANS_CAPTURE_MARKER_EN = 'Try free with 1 property';
const LEGACY_PLANS_MARKER = 'Planes claros y transparentes';

/** Solo artículos nuevos sin bloque de planes previo (no toca publicados). */
export function injectPlansCaptureBlock(html: string): string {
  if (
    html.includes(PLANS_CAPTURE_MARKER) ||
    html.includes(PLANS_CAPTURE_MARKER_LEGACY) ||
    html.includes(PLANS_CAPTURE_MARKER_EN) ||
    html.includes(LEGACY_PLANS_MARKER)
  ) {
    return html;
  }
  if (html.includes('</article>')) {
    return html.replace('</article>', `${plansHtmlBlock()}\n</article>`);
  }
  if (html.includes('</body>')) {
    return html.replace('</body>', `${plansHtmlBlock()}\n</body>`);
  }
  return `${html}\n${plansHtmlBlock()}`;
}

function upgradeExistingSoftPopup(html: string): string {
  return html
    .replace(/https:\/\/delfincheckin\.com\/#precios/g, LANDING_SIGNUP)
    .replace(/>Ver planes y empezar</g, '>Empezar ahora — es gratis<')
    .replace(/Prueba Delfín Check-in gratis \(1 propiedad\)/g, 'Pruébalo ahora — gratis');
}

export function injectSoftPopup(html: string): string {
  const marker = 'id="delfin-soft-popup"';
  if (html.includes(marker)) return upgradeExistingSoftPopup(html);
  const popupHtml = softPopupHtml();
  if (html.includes('</body>')) return html.replace('</body>', `${popupHtml}\n</body>`);
  return `${html}\n${popupHtml}`;
}
