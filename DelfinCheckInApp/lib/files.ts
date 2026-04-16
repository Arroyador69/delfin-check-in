import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function downloadToCache(params: {
  url: string;
  filename: string;
  headers?: Record<string, string>;
}): Promise<string> {
  // Nota: algunos setups de TS no ven estas props en types, pero existen en runtime.
  const fsAny = FileSystem as any;
  const cacheDir: string = fsAny.cacheDirectory || fsAny.documentDirectory || '';
  const targetUri = `${cacheDir}${params.filename}`;

  const res = await FileSystem.downloadAsync(params.url, targetUri, {
    headers: params.headers,
  });

  return res.uri;
}

export async function shareFile(uri: string, mimeType?: string) {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Sharing no disponible en este dispositivo');
  }
  await Sharing.shareAsync(uri, {
    mimeType,
    dialogTitle: 'Compartir',
  });
}

