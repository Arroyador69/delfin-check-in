import { useEffect, useRef } from 'react';
import MobileAds from 'react-native-google-mobile-ads';

/**
 * Inicializa el SDK una vez al arrancar (requerido antes de cargar anuncios).
 */
export function AdMobInitializer() {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void MobileAds()
      .initialize()
      .catch(() => {
        done.current = false;
      });
  }, []);

  return null;
}
