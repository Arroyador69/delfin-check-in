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

  // Tap Wall: landing/panel/huésped sin menú del admin
  if (
    pathname === '/tap' ||
    pathname?.startsWith('/tap/') ||
    pathname === '/g' ||
    pathname?.startsWith('/g/')
  ) {
    return null;
  }

  // Buffer social (social.delfincheckin.com): UI propia, sin menú del PMS/admin
  if (
    pathname === '/social' ||
    pathname?.startsWith('/social/') ||
    pathname === '/tiktok' ||
    pathname?.startsWith('/tiktok/') ||
    pathname === '/oauth/tiktok' ||
    pathname?.startsWith('/oauth/tiktok/')
  ) {
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
