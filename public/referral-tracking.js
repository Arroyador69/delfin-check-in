/**
 * Script de tracking para referidos
 * Se incluye en la landing page para capturar clicks y cookies de referidos
 */

(function() {
  'use strict';

  const COOKIE_NAME = 'referral_ref';
  const COOKIE_EXPIRY_DAYS = 30;
  const API_URL = 'https://admin.delfincheckin.com/api/referrals/track';

  /**
   * Obtiene parámetro de URL
   */
  function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }

  /**
   * Obtiene cookie
   */
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  /**
   * Establece cookie
   */
  function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax${window.location.protocol === 'https:' ? ';Secure' : ''}`;
  }

  /**
   * Trackea el click del referido
   */
  async function trackReferralClick(referralCode, cookieId) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referral_code: referralCode,
          cookie_id: cookieId,
          landing_page: window.location.href,
        }),
        credentials: 'omit', // No enviar cookies para evitar CORS issues
      });

      const data = await response.json();

      if (data.success && data.cookieId) {
        // Actualizar cookie con el ID devuelto por el servidor
        setCookie(COOKIE_NAME, JSON.stringify({
          code: referralCode,
          cookieId: data.cookieId,
          timestamp: Date.now(),
        }), COOKIE_EXPIRY_DAYS);
      }

      return data;
    } catch (error) {
      console.warn('Error tracking referral click:', error);
      return { success: false };
    }
  }

  /**
   * Función principal
   */
  function init() {
    // Verificar si hay parámetro ?ref= en la URL
    const referralCode = getUrlParameter('ref');

    if (!referralCode) {
      // No hay código de referido, no hacer nada
      return;
    }

    // Normalizar el código (en caso de que venga con REF_ o sin)
    const normalizedCode = referralCode.startsWith('REF_') ? referralCode : `REF_${referralCode}`;

    // Verificar si ya existe una cookie
    const existingCookie = getCookie(COOKIE_NAME);
    let cookieData = null;
    let cookieId = null;

    if (existingCookie) {
      try {
        cookieData = JSON.parse(existingCookie);
        cookieId = cookieData.cookieId;
      } catch (e) {
        // Cookie inválida, crear nueva
      }
    }

    // Si hay un código nuevo diferente al de la cookie, actualizar
    if (!cookieData || cookieData.code !== normalizedCode) {
      // Trackear el nuevo click
      trackReferralClick(normalizedCode, cookieId);
    }

    // Limpiar el parámetro de la URL sin recargar la página
    if (window.history && window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete('ref');
      window.history.replaceState({}, '', url.toString());
    }
  }

  // Ejecutar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Exportar funciones globales para uso externo
  window.getReferralCookie = function() {
    const cookie = getCookie(COOKIE_NAME);
    if (!cookie) return null;
    try {
      return JSON.parse(cookie);
    } catch (e) {
      return null;
    }
  };

  window.clearReferralCookie = function() {
    document.cookie = `${COOKIE_NAME}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  };
})();
