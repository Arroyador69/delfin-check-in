'use client';

import { useEffect } from 'react';

export default function NoticeRedirect() {
  useEffect(() => {
    window.location.replace('https://delfincheckin.com/aviso-legal.html');
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <p className="text-gray-700">Redirigiendo al Aviso Legal…</p>
    </div>
  );
}


