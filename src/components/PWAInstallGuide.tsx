'use client';

import { useEffect, useMemo, useState } from 'react';

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
    <div className="md:hidden mx-4 my-3 p-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-900">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm">
          {platform.ios ? (
            <>
              <div className="font-semibold mb-1">Instala la app en tu iPhone</div>
              <ol className="list-decimal list-inside space-y-1">
                <li>Abre el menú <span className="font-semibold">Compartir</span> en Safari.</li>
                <li>Toca <span className="font-semibold">Añadir a pantalla de inicio</span>.</li>
                <li>Confirma para crear el acceso directo.</li>
              </ol>
            </>
          ) : (
            <>
              <div className="font-semibold mb-1">Instala la app en Android</div>
              <ol className="list-decimal list-inside space-y-1">
                <li>Abre el menú del navegador (⋮).</li>
                <li>Toca <span className="font-semibold">Añadir a pantalla de inicio</span>.</li>
                <li>Confirma para crear el icono.</li>
              </ol>
            </>
          )}
        </div>
        <button onClick={() => setDismissed(true)} className="text-blue-700 text-sm hover:underline">Cerrar</button>
      </div>
    </div>
  );
}


