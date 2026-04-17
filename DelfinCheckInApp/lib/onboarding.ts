import * as SecureStore from 'expo-secure-store';

const ONBOARDING_SEEN_KEY = 'delfin.mobile_onboarding_seen.v1';

export async function getOnboardingSeen(): Promise<boolean> {
  try {
    const raw = await SecureStore.getItemAsync(ONBOARDING_SEEN_KEY);
    return raw === '1';
  } catch {
    return false;
  }
}

export async function setOnboardingSeen(seen: boolean): Promise<void> {
  try {
    if (seen) {
      await SecureStore.setItemAsync(ONBOARDING_SEEN_KEY, '1');
    } else {
      await SecureStore.deleteItemAsync(ONBOARDING_SEEN_KEY);
    }
  } catch {
    // ignore
  }
}

