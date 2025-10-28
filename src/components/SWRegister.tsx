'use client';

import { useEffect, useState } from 'react';

export default function SWRegister() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    const update = () => setIsOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return (
    <span className="sr-only">{isOnline ? 'online' : 'offline'}</span>
  );
}


