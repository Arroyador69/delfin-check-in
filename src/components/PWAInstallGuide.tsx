'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

function isStandalone(): boolean {
  // iOS Safari
  // @ts-ignore
  const iosStandalone = typeof window !== 'undefined' && (window.navigator as any).standalone;
  const displayModeStandalone = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  return Boolean(iosStandalone || displayModeStandalone);
}

function detectPlatform() {
  if (typeof navigator === 'undefined') return { ios: false, android: false, safari: false, chrome: false };
  const ua = navigator.userAgent || navigator.vendor || '';
  const ios = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const android = /Android/.test(ua);
  const safari = /^((?!chrome|android).)*safari/i.test(ua);
  const chrome = /Chrome\//.test(ua) && /Google Inc/.test((navigator as any).vendor || '') && !/Edg\//.test(ua);
  return { ios, android, safari, chrome };
}

export default function PWAInstallGuide() {
  const t = useTranslations('pwa');
  const [dismissed, setDismissed] = useState(false);
  const [installable, setInstallable] = useState(false);
  const [ready, setReady] = useState(false);

  const platform = useMemo(detectPlatform, []);
  const standalone = useMemo(isStandalone, []);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handler as any);
    setReady(true);
    return () => window.removeEventListener('beforeinstallprompt', handler as any);
  }, []);

  if (!ready) return null;
  if (dismissed) return null;
  if (standalone) return null;

  const show = platform.ios || (platform.android && !installable); // Android con prompt nativo usará PWAInstallButton
  if (!show) return null;

  return (
    <div className="lg:hidden mx-2 my-2 p-3 rounded-lg border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs flex-1">
          {platform.ios ? (
            <>
              <div className="font-bold mb-1 text-blue-900">{t('guideIosTitle')}</div>
              <ol className="list-decimal list-inside space-y-0.5 text-blue-800">
                <li>{t('guideIosStep1')}</li>
                <li>{t('guideIosStep2')}</li>
                <li>{t('guideIosStep3')}</li>
              </ol>
            </>
          ) : (
            <>
              <div className="font-bold mb-1 text-blue-900">{t('guideAndroidTitle')}</div>
              <ol className="list-decimal list-inside space-y-0.5 text-blue-800">
                <li>{t('guideAndroidStep1')}</li>
                <li>{t('guideAndroidStep2')}</li>
                <li>{t('guideAndroidStep3')}</li>
              </ol>
            </>
          )}
        </div>
        <button 
          onClick={() => setDismissed(true)} 
          className="text-blue-700 hover:text-blue-900 text-xs font-bold hover:bg-blue-100 px-2 py-1 rounded transition-all"
        >
          ✕
        </button>
      </div>
    </div>
  );
}


