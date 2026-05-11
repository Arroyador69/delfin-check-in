import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

/**
 * Registro, recuperación de contraseña y onboarding web: navegador embebido del sistema
 * (iOS SFSafariViewController / Android Chrome Custom Tabs), no Safari externo vía Linking.
 * Alineado con App Store Review Guideline 4 (cuenta).
 */
export async function openAccountWebUrl(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url, {
      dismissButtonStyle: 'close',
      showTitle: true,
    });
  } catch {
    await Linking.openURL(url);
  }
}
