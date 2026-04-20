// =====================================================
// ROOT LAYOUT - Configuración global de la app
// =====================================================

import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter, useSegments } from 'expo-router';
import { DeviceEventEmitter, LogBox } from 'react-native';
import { hydrateAppLocale, LOCALE_CHANGED_EVENT } from '@/lib/i18n';
import { AdMobInitializer } from '@/lib/admob-init';

// Ignorar warnings específicos si es necesario
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutos
    },
  },
});

// Componente para manejar navegación según autenticación
function NavigationHandler() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    console.log('🧭 NavigationHandler:', { loading, hasSession: !!session, segments });
    
    if (loading) {
      console.log('⏳ Esperando carga de sesión...');
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';

    if (!session && !inAuthGroup) {
      // No hay sesión y no está en auth, redirigir a login
      console.log('➡️ Redirigiendo a login (sin sesión)');
      router.replace('/(auth)');
    } else if (session && inAuthGroup) {
      // Hay sesión y está en auth, redirigir a app
      console.log('➡️ Redirigiendo a app (con sesión)');
      router.replace('/(app)');
    } else {
      console.log('✅ Navegación correcta, no se requiere redirección');
    }
  }, [session, loading, segments, router]);

  return null;
}

function LocalizedStack() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    hydrateAppLocale().finally(() => setTick((x) => x + 1));
  }, []);
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(LOCALE_CHANGED_EVENT, () => {
      setTick((x) => x + 1);
    });
    return () => sub.remove();
  }, []);
  // Forzamos re-montaje del árbol de navegación al cambiar idioma guardado.
  return <Stack key={`locale-${tick}`} screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  // Manejo de errores global
  useEffect(() => {
    const errorHandler = (error: Error) => {
      console.error('Error global capturado:', error);
    };
    
    // Capturar errores no manejados
    const originalError = console.error;
    console.error = (...args: any[]) => {
      originalError(...args);
      // Aquí podrías enviar errores a un servicio de logging
    };
    
    return () => {
      console.error = originalError;
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AdMobInitializer />
        <NavigationHandler />
        <LocalizedStack />
      </AuthProvider>
    </QueryClientProvider>
  );
}

