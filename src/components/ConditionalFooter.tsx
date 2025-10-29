'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

export default function ConditionalFooter() {
  const pathname = usePathname();
  
  // Páginas que NO deben tener footer (páginas de login, formularios independientes, etc.)
  const EXCLUDED_PAGES: string[] = [
    '/admin-login',
    // Añade aquí otras páginas que no deben tener footer
  ];
  
  // Si es una página excluida, no mostrar footer
  if (EXCLUDED_PAGES.includes(pathname)) {
    return null;
  }
  
  // Para todas las demás páginas, mostrar footer
  return <Footer />;
}

