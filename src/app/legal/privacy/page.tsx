'use client';

import { useEffect } from 'react';

export default function PrivacyRedirect() {
  useEffect(() => {
    window.location.replace('https://delfincheckin.com/politica-privacidad.html');
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <p className="text-gray-700">Redirigiendo a la Política de Privacidad…</p>
    </div>
  );
}


