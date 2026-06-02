import { getAppBaseUrl } from '@/lib/email-sequences/email-links';

/**
 * HTML del pixel de apertura. Sin display:none: Gmail/Outlook suelen no cargarlo y las aperturas quedan en 0.
 */
export function buildOpenTrackingPixelHtml(trackingId: string): string {
  const base = getAppBaseUrl();
  const url = `${base}/m/o/${encodeURIComponent(trackingId)}`;
  const style =
    'display:block;width:1px;height:1px;border:0;margin:0;padding:0;line-height:1px;max-width:1px;max-height:1px;';
  return `<img src="${url}" width="1" height="1" border="0" alt="" style="${style}" />`;
}
