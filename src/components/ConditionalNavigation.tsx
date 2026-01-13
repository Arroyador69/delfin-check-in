'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';

export default function ConditionalNavigation() {
  const pathname = usePathname();
  
  // Páginas que NO deben tener navegación (formularios independientes, login, etc.)
  const INDEPENDENT_PAGES: string[] = [
    '/admin-login',      // Página de login - sin header
    '/forgot-password',  // Página de recuperación de contraseña - sin header
    // Formularios eliminados - ya no se usan
    // '/guest-registration', - Eliminado: se usa form.delfincheckin.com
    // '/reservations-form'   - Eliminado: no se utiliza
  ];
  
  // Si es una página independiente, no mostrar navegación
  if (INDEPENDENT_PAGES.includes(pathname)) {
    return null;
  }
  
  // Para todas las demás páginas, mostrar navegación
  return <Navigation />;
}
