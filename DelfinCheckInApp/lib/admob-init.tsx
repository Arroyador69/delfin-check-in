import { useEffect, useRef } from 'react';
import { isGoogleMobileAdsNativeAvailable } from '@/lib/admob-native-available';

/**
 * Inicializa el SDK una vez al arrancar (requerido antes de cargar anuncios).
 * Omitido en Expo Go / sin módulo nativo.
 */
export function AdMobInitializer() {
  const done = useRef(false);

  useEffect(() => {
    if (done.current || !isGoogleMobileAdsNativeAvailable()) return;
    done.current = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const MobileAds = require('react-native-google-mobile-ads').default;
      void MobileAds()
        .initialize()
        .catch(() => {
          done.current = false;
        });
    } catch {
      done.current = false;
    }
  }, []);

  return null;
}
