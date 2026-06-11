/**
 * Landing Page Analytics Tracking (sin popup — el popup de email lo gestiona landing-free-signup.js)
 */

(function () {
  'use strict';

  const API_URL = 'https://admin.delfincheckin.com/api/landing/track';
  const SCROLL_THRESHOLDS = [25, 50, 75, 100];

  function getSessionId() {
    let sessionId = localStorage.getItem('landing_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('landing_session_id', sessionId);
    }
    return sessionId;
  }

  function getBrowserInfo() {
    return {
      user_agent: navigator.userAgent,
      referrer: document.referrer || 'direct',
      language: navigator.language,
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
    };
  }

  function trackEvent(eventType, eventData) {
    if (!eventType) return;
    const browserInfo = getBrowserInfo();
    const payload = {
      session_id: getSessionId(),
      event_type: eventType,
      event_data: Object.assign({}, eventData || {}, browserInfo, {
        url: window.location.href,
        timestamp: new Date().toISOString(),
      }),
      user_agent: browserInfo.user_agent,
      referrer: browserInfo.referrer,
    };

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(function () {});
  }

  window.delfinLandingTrack = trackEvent;

  let timeOnPageStart = Date.now();
  let maxScrollDepth = 0;
  const scrollTracked = new Set();

  trackEvent('page_view', {
    page_title: document.title,
    page_path: window.location.pathname,
  });

  window.addEventListener(
    'scroll',
    function () {
      const scrollPercent = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );
      maxScrollDepth = Math.max(maxScrollDepth, scrollPercent);
      SCROLL_THRESHOLDS.forEach(function (threshold) {
        if (scrollPercent >= threshold && !scrollTracked.has(threshold)) {
          scrollTracked.add(threshold);
          trackEvent('scroll', {
            scroll_percent: scrollPercent,
            scroll_position: window.scrollY,
          });
        }
      });
    },
    { passive: true }
  );

  document.addEventListener('click', function (e) {
    const target = e.target;
    if (!target) return;
    const tagName = target.tagName ? target.tagName.toLowerCase() : '';
    if (tagName === 'button' || tagName === 'a' || target.hasAttribute('data-track')) {
      trackEvent('click', {
        element: tagName,
        text: (target.textContent || '').trim().substring(0, 50),
        href: target.href || null,
        id: target.id || null,
        class: target.className || null,
      });
    }
  });

  const waitlistForm = document.getElementById('waitlistForm');
  if (waitlistForm) {
    const waitlistEmail = document.getElementById('waitlistEmail');
    if (waitlistEmail) {
      waitlistEmail.addEventListener(
        'focus',
        function () {
          trackEvent('form_start', { form_id: 'waitlist' });
        },
        { once: true }
      );
    }
    const originalSubmit = window.submitWaitlist;
    if (originalSubmit) {
      window.submitWaitlist = function (event) {
        trackEvent('form_submit', { form_id: 'waitlist' });
        return originalSubmit.call(this, event);
      };
    }
  }

  let exitTracked = false;
  window.addEventListener('beforeunload', function () {
    if (exitTracked) return;
    exitTracked = true;
    const timeOnPage = Math.round((Date.now() - timeOnPageStart) / 1000);
    navigator.sendBeacon(
      API_URL,
      JSON.stringify({
        session_id: getSessionId(),
        event_type: 'exit',
        time_on_page: timeOnPage,
        max_scroll_depth: maxScrollDepth,
      })
    );
  });
})();
