// =====================================================
// GESTIÓN DE AUTENTICACIÓN (SecureStore + Context)
// =====================================================

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { DeviceEventEmitter } from 'react-native';
import { api, LoginResponse, AUTH_SESSION_INVALID_EVENT } from './api';

const SESSION_KEY = 'delfin.session.v1';
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export interface Session {
  accessToken: string;
  refreshToken: string;
  tenant_id: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    isPlatformAdmin: boolean;
    tenant: {
      id: string;
      name: string;
      status: string;
      planId: string;
      maxRooms: number;
      currentRooms: number;
    };
  };
}

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const signOutRef = useRef<() => Promise<void>>(async () => {});

  // Cargar sesión al iniciar
  useEffect(() => {
    loadSession();
  }, []);

  // Si el interceptor de API limpia tokens tras un refresh fallido, cerrar sesión en UI (evita 401 en bucle).
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(AUTH_SESSION_INVALID_EVENT, () => {
      void signOutRef.current();
    });
    return () => sub.remove();
  }, []);

  async function loadSession() {
    try {
      console.log('🔐 Cargando sesión...');
      const sessionStr = await SecureStore.getItemAsync(SESSION_KEY);
      let accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

      console.log('📦 Datos encontrados:', {
        tieneSession: !!sessionStr,
        tieneAccessToken: !!accessToken,
        tieneRefreshToken: !!refreshToken,
      });

      // Verificar si el access token está expirado o próximo a expirar
      if (accessToken) {
        try {
          const payload = JSON.parse(atob(accessToken.split('.')[1]));
          const exp = payload.exp * 1000; // Convertir a milisegundos
          const now = Date.now();
          const timeUntilExpiry = exp - now;
          
          // Si está expirado o expira en menos de 10 minutos, refrescar
          if (timeUntilExpiry < 10 * 60 * 1000) {
            console.log(`⏰ Token ${timeUntilExpiry <= 0 ? 'EXPIRADO' : 'próximo a expirar'} al iniciar, refrescando...`);
            const refreshed = await refreshSession();
            if (refreshed) {
              accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
            }
          }
        } catch (jwtError) {
          console.warn('⚠️ No se pudo verificar expiración del token:', jwtError);
          // Si no se puede decodificar, intentar refrescar
          if (refreshToken) {
            console.log('🔄 Token inválido, intentando refrescar...');
            await refreshSession();
            accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
          }
        }
      } else if (refreshToken) {
        console.log('🔄 No hay access token, intentando refrescar desde refresh token...');
        await refreshSession();
        accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      }

      if (sessionStr && accessToken) {
        const parsedSession = JSON.parse(sessionStr);
        // Actualizar access token en la sesión si fue refrescado
        parsedSession.accessToken = accessToken;
        setSession(parsedSession);
        console.log('✅ Sesión cargada correctamente');
      } else {
        if (sessionStr && !accessToken) {
          await SecureStore.deleteItemAsync(SESSION_KEY);
        }
        setSession(null);
        console.log('ℹ️ No hay sesión válida guardada');
      }
    } catch (error) {
      console.error('❌ Error cargando sesión:', error);
    } finally {
      setLoading(false);
      console.log('🏁 Carga de sesión completada');
    }
  }

  async function signIn(email: string, password: string): Promise<boolean> {
    try {
      console.log('🔐 Intentando login con:', { email, apiUrl: api.defaults.baseURL });
      const response = await api.post<LoginResponse>('/api/auth/mobile-login', {
        email,
        password,
      });

      console.log('✅ Respuesta del servidor:', { success: response.data.success, status: response.status });
      if (response.data.success) {
        const sessionData: Session = {
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
          tenant_id: response.data.user.tenant.id,
          user: response.data.user,
        };

        // Guardar en SecureStore
        await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(sessionData));
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, response.data.accessToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, response.data.refreshToken);

        setSession(sessionData);
        return true;
      }
      return false;
    } catch (error: any) {
      // 401 es normal cuando el usuario se equivoca: evitar "pantalla roja" por console.error.
      const status = error?.response?.status;
      if (status === 401) {
        console.warn('⚠️ Login rechazado (401): credenciales inválidas');
      } else {
        console.warn('⚠️ Error en login:', {
          message: error?.message,
          status,
          url: error?.config?.url,
          baseURL: error?.config?.baseURL,
          data: error?.response?.data,
        });
      }
      return false;
    }
  }

  async function signOut(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      setSession(null);
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
  }

  signOutRef.current = signOut;

  async function refreshSession(): Promise<boolean> {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (!refreshToken) return false;

      const response = await api.post('/api/auth/refresh', {
        refreshToken,
      });

      if (response.data.success) {
        const newAccessToken = response.data.accessToken;
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, newAccessToken);

        // Actualizar sesión
        const sessionStr = await SecureStore.getItemAsync(SESSION_KEY);
        if (sessionStr) {
          const sessionData: Session = JSON.parse(sessionStr);
          sessionData.accessToken = newAccessToken;
          await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(sessionData));
          setSession(sessionData);
        }

        return true;
      }
      return false;
    } catch (error) {
      console.error('Error refrescando sesión:', error);
      await signOut();
      return false;
    }
  }

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}

