// =====================================================
// PANTALLA DE LOGIN
// =====================================================

import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'expo-router';
import { getLocale, t } from '@/lib/i18n';
import { getPublicApiOrigin } from '@/lib/api';
import { openAccountWebUrl } from '@/lib/in-app-browser';
import { isIosAppStoreBuild } from '@/lib/ios-app-store-compliance';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const iosLogin = isIosAppStoreBuild();

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert(t('common.error'), `${t('auth.errors.enterEmail')}\n${t('auth.errors.enterPassword')}`);
      return;
    }

    setLoading(true);
    try {
      const success = await signIn(email.trim().toLowerCase(), password);
      if (success) {
        router.replace('/(app)');
      } else {
        Alert.alert(t('common.error'), t('auth.errors.incorrectPassword'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('auth.errors.connectionError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Delfín Check-in</Text>
        <Text style={styles.subtitle}>
          {iosLogin ? t('auth.iosWelcome') : t('auth.welcome')}
        </Text>
        {iosLogin ? (
          <Text style={styles.iosHint}>{t('auth.iosExistingAccountOnly')}</Text>
        ) : null}

        <TextInput
          style={styles.input}
          placeholder={t('auth.emailPlaceholder')}
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder={t('auth.passwordPlaceholder')}
          placeholderTextColor="#9ca3af"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          editable={!loading}
        />

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>{t('auth.loginButton')}</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => void openAccountWebUrl(`${getPublicApiOrigin()}/forgot-password`)}
          disabled={loading}
          style={styles.linkRow}
        >
          <Text style={styles.linkText}>{t('auth.forgotPassword')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 12,
  },
  iosHint: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#f8fafc',
    color: '#0f172a',
  },
  button: {
    backgroundColor: '#0d9488',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  linkRow: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
});
