import { useCallback } from 'react';

/** Anuncios retirados (App Store compliance). Conservamos el hook para no tocar pantallas. */
export function useMajorActionAd() {
  return useCallback(() => {}, []);
}
