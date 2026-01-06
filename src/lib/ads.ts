/**
 * ========================================
 * SISTEMA DE ANUNCIOS (Google AdSense)
 * ========================================
 * Configuración y utilidades para mostrar anuncios
 */

/**
 * Configuración de Google AdSense
 * IMPORTANTE: Necesitas obtener estos valores de tu cuenta de Google AdSense
 * 
 * Pasos para obtener el código:
 * 1. Ir a https://www.google.com/adsense/
 * 2. Crear cuenta o iniciar sesión
 * 3. Añadir sitio web (delfincheckin.com)
 * 4. Esperar aprobación (puede tardar días/semanas)
 * 5. Una vez aprobado, ir a "Anuncios" > "Por unidad de anuncios"
 * 6. Crear unidades de anuncios para:
 *    - Banner superior (responsive)
 *    - Sidebar (300x250)
 *    - Footer (responsive)
 * 7. Copiar el código de cada unidad de anuncios
 */

export const ADSENSE_CONFIG = {
  // Publisher ID de Google AdSense
  // Obtenido de: https://www.google.com/adsense/
  publisherId: process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID || 'ca-pub-6039298229774115',
  
  // IDs de unidades de anuncios (los obtienes al crear unidades en AdSense)
  adUnits: {
    banner: process.env.NEXT_PUBLIC_ADSENSE_BANNER_ID || '', // Banner superior
    sidebar: process.env.NEXT_PUBLIC_ADSENSE_SIDEBAR_ID || '', // Sidebar 300x250
    footer: process.env.NEXT_PUBLIC_ADSENSE_FOOTER_ID || '', // Footer
  }
};

/**
 * Verifica si AdSense está configurado
 */
export function isAdSenseConfigured(): boolean {
  // Publisher ID ya está configurado, solo falta crear las unidades de anuncios
  return !!ADSENSE_CONFIG.publisherId;
}

/**
 * Genera el script de Google AdSense
 * Este script debe ir en el <head> de la aplicación
 */
export function getAdSenseScript(): string {
  if (!ADSENSE_CONFIG.publisherId) {
    return '';
  }

  return `
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CONFIG.publisherId}"
     crossorigin="anonymous"></script>
  `;
}

/**
 * Componente de anuncio para usar en React
 */
export interface AdUnitProps {
  adSlot: string; // ID de la unidad de anuncios
  adFormat?: 'auto' | 'rectangle' | 'vertical' | 'horizontal';
  style?: React.CSSProperties;
  className?: string;
}

