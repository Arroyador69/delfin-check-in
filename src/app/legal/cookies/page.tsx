'use client';

import { useEffect } from 'react';

export default function CookiesRedirect() {
  useEffect(() => {
    window.location.replace('https://delfincheckin.com/politica-cookies.html');
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <p className="text-gray-700">Redirigiendo a la Política de Cookies…</p>
    </div>
  );
}


