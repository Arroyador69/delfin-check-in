'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export default function PWAInstallButton() {
  const t = useTranslations('pwa');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installable, setInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try { await deferredPrompt.userChoice; } catch {}
    setDeferredPrompt(null);
    setInstallable(false);
  };

  if (!installable) return null;

  return (
    <button onClick={install} className="px-3 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">
      {t('installButton')}
    </button>
  );
}


