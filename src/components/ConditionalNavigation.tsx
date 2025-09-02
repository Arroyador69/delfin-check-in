'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';

export default function ConditionalNavigation() {
  const pathname = usePathname();
  
  // Páginas que NO deben tener navegación (formularios independientes)
  const INDEPENDENT_PAGES = [
    '/guest-registration',
    '/reservations-form'
  ];
  
  // Si es una página independiente, no mostrar navegación
  if (INDEPENDENT_PAGES.includes(pathname)) {
    return null;
  }
  
  // Para todas las demás páginas, mostrar navegación
  return <Navigation />;
}
