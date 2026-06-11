/** Bloques HTML de captación (solo plan gratis) para artículos del blog y popup. */

const APP_BASE = 'https://admin.delfincheckin.com';
const LANDING_SIGNUP = 'https://delfincheckin.com/#registro';

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function freePlanCaptureCard(opts: { signupFreeUrl?: string; locale?: string } = {}): string {
  const signupFreeUrl = opts.signupFreeUrl ?? `${APP_BASE}/api/public/signup-free`;
  const locale = opts.locale ?? 'es';

  return `
<div style="max-width: 520px; margin: 0 auto; background:#ffffff;border:3px solid #a7f3d0;border-radius:20px;padding:24px;box-shadow:0 12px 32px rgba(15,23,42,0.1);">
  <div style="text-align:center;">
    <div style="display:inline-block; font-size: 11px; font-weight: 900; padding: 6px 12px; border-radius: 999px; background: #dcfce7; color:#166534; margin-bottom: 12px;">Sin tarjeta · Solo email</div>
    <div style="font-size: 22px; font-weight: 950; color:#0f172a; margin: 0;">Plan Básico gratis</div>
    <p style="margin: 10px 0 0; color:#475569; font-size: 14px; line-height: 1.5;">
      <strong>1 propiedad</strong> para probar el registro de viajeros y el cumplimiento del <strong>RD 933/2021</strong> con el Ministerio del Interior.
    </p>
  </div>
  <ul style="list-style:none; padding: 16px 0 0 0; margin: 16px 0 0 0; border-top: 1px solid #e2e8f0; text-align:left;">
    <li style="margin: 0 0 10px 0; color:#334155; font-size: 14px; line-height: 1.45;">✅ <strong>Parte de viajeros</strong> y formulario digital para huéspedes</li>
    <li style="margin: 0 0 10px 0; color:#334155; font-size: 14px; line-height: 1.45;">✅ Descarga XML para el <strong>Ministerio del Interior</strong> (MIR)</li>
    <li style="margin: 0 0 10px 0; color:#334155; font-size: 14px; line-height: 1.45;">✅ Calendario, reservas y gestión del alojamiento incluidos</li>
    <li style="margin: 0; color:#334155; font-size: 14px; line-height: 1.45;">✅ Activa tu cuenta en minutos — solo necesitas un email</li>
  </ul>

  <button type="button" id="delfin-free-toggle" style="width:100%; margin-top: 18px; text-align:center; background:#16a34a; color:#fff; padding: 14px 16px; border-radius: 12px; font-weight: 900; font-size: 15px; border: 0; cursor: pointer;">
    Prueba gratis con 1 propiedad
  </button>

  <div id="delfin-free-form-wrap" style="display:none; margin-top: 14px; border-top: 1px solid #e2e8f0; padding-top: 14px;">
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
            var res = await fetch('${escapeAttr(signupFreeUrl)}', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: v, locale: '${escapeAttr(locale)}' })
            });
            var data = await res.json().catch(function(){ return {}; });
            if (!res.ok || data.success === false) {
              msg.textContent = (data && data.error) ? String(data.error) : 'No se pudo completar el registro. Inténtalo más tarde.';
              msg.style.color = '#b91c1c';
              return;
            }
            msg.textContent = 'Listo. Revisa tu correo para activar tu cuenta y registrar tu propiedad.';
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

export function plansHtmlBlock(): string {
  return `
<section style="margin: 2.5rem 0;">
  <div style="text-align:center;margin-bottom:1.5rem;">
    <h2 style="font-size: 2rem; line-height: 1.2; font-weight: 900; color: #0f172a; margin: 0;">
      Prueba gratis con 1 propiedad
    </h2>
    <p style="margin: 0.75rem auto 0; max-width: 640px; color: #475569; font-size: 1rem; line-height: 1.55;">
      Cumple la legalidad del <strong>parte de viajeros</strong> y el envío al
      <strong>Ministerio del Interior</strong> (RD 933/2021). Sin tarjeta: regístrate solo con tu email.
    </p>
  </div>
  ${freePlanCaptureCard()}
  <p style="text-align:center; margin: 1.25rem auto 0; max-width: 560px; color: #64748b; font-size: 13px; line-height: 1.5;">
    Si necesitas envío automático MIR o más propiedades, verás las opciones dentro del panel tras activar tu cuenta.
  </p>
</section>
`.trim();
}

export function softPopupHtml(): string {
  return `
<style>
  #delfin-soft-popup-overlay{position:fixed;inset:0;background:rgba(2,6,23,.55);display:none;align-items:center;justify-content:center;z-index:999999;}
  #delfin-soft-popup{width:min(520px,calc(100vw - 32px));background:#fff;border-radius:18px;box-shadow:0 16px 48px rgba(2,6,23,.35);border:1px solid rgba(148,163,184,.6);overflow:hidden}
  #delfin-soft-popup .hd{padding:16px 16px 0 16px}
  #delfin-soft-popup .ttl{font-weight:950;font-size:20px;line-height:1.2;color:#0f172a;margin:0}
  #delfin-soft-popup .sub{margin:10px 0 0 0;color:#334155;font-size:14px;line-height:1.45}
  #delfin-soft-popup .cta{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:16px}
  #delfin-soft-popup .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;padding:12px 14px;font-weight:900;text-decoration:none}
  #delfin-soft-popup .btn-primary{background:#16a34a;color:#fff;flex:1}
  #delfin-soft-popup .btn-ghost{background:#f1f5f9;color:#0f172a}
  #delfin-soft-popup .x{position:absolute;top:10px;right:10px;border:0;background:transparent;cursor:pointer;font-size:20px;line-height:1;color:#475569}
  #delfin-soft-popup .wrap{position:relative}
</style>
<div id="delfin-soft-popup-overlay" role="dialog" aria-modal="true" aria-label="Delfín Check-in">
  <div class="wrap">
    <div id="delfin-soft-popup">
      <button class="x" type="button" aria-label="Cerrar" id="delfin-soft-popup-close">×</button>
      <div class="hd">
        <p class="ttl">Prueba gratis con 1 propiedad</p>
        <p class="sub">
          Digitaliza el <strong>parte de viajeros</strong> y cumple con el
          <strong>Ministerio del Interior</strong> (RD 933/2021). Solo email, sin tarjeta.
        </p>
      </div>
      <div class="cta">
        <a class="btn btn-primary" id="delfin-soft-popup-cta" href="${LANDING_SIGNUP}" target="_blank" rel="noreferrer">
          Prueba gratis con 1 propiedad
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
    } catch (e) {}
  })();
</script>`.trim();
}

export const PLANS_CAPTURE_MARKER = 'Prueba gratis con 1 propiedad';
export const PLANS_CAPTURE_MARKER_EN = 'Try free with 1 property';
const LEGACY_PLANS_MARKER = 'Planes claros y transparentes';

/** Solo artículos nuevos sin bloque de planes previo (no toca publicados). */
export function injectPlansCaptureBlock(html: string): string {
  if (
    html.includes(PLANS_CAPTURE_MARKER) ||
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
    .replace(/>Ver planes y empezar</g, '>Prueba gratis con 1 propiedad<')
    .replace(/Prueba Delfín Check-in gratis \(1 propiedad\)/g, 'Prueba gratis con 1 propiedad')
    .replace(
      /#delfin-soft-popup \.btn-primary\{background:#0f172a/g,
      '#delfin-soft-popup .btn-primary{background:#16a34a'
    );
}

export function injectSoftPopup(html: string): string {
  const marker = 'id="delfin-soft-popup"';
  if (html.includes(marker)) return upgradeExistingSoftPopup(html);
  const popupHtml = softPopupHtml();
  if (html.includes('</body>')) return html.replace('</body>', `${popupHtml}\n</body>`);
  return `${html}\n${popupHtml}`;
}
