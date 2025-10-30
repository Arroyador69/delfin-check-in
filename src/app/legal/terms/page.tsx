'use client';

import { useEffect } from 'react';

export default function TermsRedirect() {
  useEffect(() => {
    window.location.replace('https://delfincheckin.com/terminos-servicio.html');
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <p className="text-gray-700">Redirigiendo a los Términos de Servicio…</p>
    </div>
  );
}


