/** Subida de imágenes de propiedad: límite generoso + compresión para evitar rechazos por base64. */

/** Tamaño máximo del archivo original (antes de comprimir). */
export const PROPERTY_IMAGE_MAX_FILE_BYTES = 12 * 1024 * 1024;

/** Lado máximo en píxeles tras redimensionar. */
export const PROPERTY_IMAGE_MAX_DIMENSION = 2400;

const JPEG_QUALITY_STEPS = [0.88, 0.82, 0.76, 0.7, 0.64] as const;

/** Longitud máx. del data URL en API (base64 ~4/3 del binario). */
export function maxPropertyImageDataUrlLength(): number {
  return 17_500_000;
}

export type PreparePropertyImageResult =
  | { ok: true; dataUrl: string; originalName: string }
  | { ok: false; reason: 'invalid_type' | 'too_large' | 'decode_failed' };

function isLikelyImage(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  return /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(file.name);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('decode'));
    img.src = dataUrl;
  });
}

async function compressDataUrl(dataUrl: string): Promise<string> {
  const img = await loadImageElement(dataUrl);
  const maxSide = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = maxSide > PROPERTY_IMAGE_MAX_DIMENSION ? PROPERTY_IMAGE_MAX_DIMENSION / maxSide : 1;
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);

  const maxLen = maxPropertyImageDataUrlLength();
  for (const q of JPEG_QUALITY_STEPS) {
    const out = canvas.toDataURL('image/jpeg', q);
    if (out.length <= maxLen) return out;
  }
  return canvas.toDataURL('image/jpeg', 0.6);
}

/**
 * Prepara una imagen para el formulario/API: valida, comprime si hace falta.
 * La primera foto del array es siempre la portada en el microsite.
 */
export async function preparePropertyImageFile(file: File): Promise<PreparePropertyImageResult> {
  if (!isLikelyImage(file)) {
    return { ok: false, reason: 'invalid_type' };
  }
  if (file.size > PROPERTY_IMAGE_MAX_FILE_BYTES) {
    return { ok: false, reason: 'too_large' };
  }

  try {
    const raw = await readFileAsDataUrl(file);
    if (!raw.startsWith('data:image/')) {
      return { ok: false, reason: 'invalid_type' };
    }

    let dataUrl = raw;
    try {
      dataUrl = await compressDataUrl(raw);
    } catch {
      if (raw.length > maxPropertyImageDataUrlLength()) {
        return { ok: false, reason: 'decode_failed' };
      }
      dataUrl = raw;
    }

    if (dataUrl.length > maxPropertyImageDataUrlLength()) {
      return { ok: false, reason: 'too_large' };
    }

    return { ok: true, dataUrl, originalName: file.name };
  } catch {
    return { ok: false, reason: 'decode_failed' };
  }
}
