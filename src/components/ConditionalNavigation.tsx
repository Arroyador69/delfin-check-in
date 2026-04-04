'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';

export default function ConditionalNavigation() {
  const pathname = usePathname();
  
  // Páginas que NO deben tener navegación (login, etc.)
  const INDEPENDENT_PAGES: string[] = [
    '/admin-login',
    '/forgot-password',
  ];
  if (INDEPENDENT_PAGES.includes(pathname ?? '')) {
    return null;
  }

  // Vista pública de limpieza (sin menú tipo dashboard)
  if (pathname?.startsWith('/limpieza')) {
    return null;
  }

  // Rutas con idioma (/es/, /en/, etc.): la navegación la lleva el layout [locale], no duplicar aquí
  const localePrefix = /^\/(es|en|it|pt|fr)(\/|$)/;
  if (pathname && localePrefix.test(pathname)) {
    return null;
  }

  // SuperAdmin y resto de rutas sin locale: mostrar menú aquí
  return <Navigation />;
}
