// =====================================================
// API CLIENT PARA APP MÓVIL
// =====================================================

import axios, { AxiosInstance, AxiosError } from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const API_URL = Constants.expoConfig?.extra?.API_URL || process.env.EXPO_PUBLIC_API_URL || 'https://admin.delfincheckin.com';

console.log('🌐 API URL configurada:', API_URL);

// Cliente axios configurado
export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Función auxiliar para refrescar token de forma robusta
async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    if (!refreshToken) {
      console.warn('⚠️ No hay refresh token disponible');
      return null;
    }

    console.log('🔄 Refrescando access token...');
    const response = await axios.post(`${API_URL}/api/auth/refresh`, {
      refreshToken,
    });

    if (response.data.success && response.data.accessToken) {
      const newToken = response.data.accessToken;
      await SecureStore.setItemAsync('accessToken', newToken);
      
      // Actualizar sesión
      const sessionStr = await SecureStore.getItemAsync('delfin.session.v1');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        session.accessToken = newToken;
        await SecureStore.setItemAsync('delfin.session.v1', JSON.stringify(session));
      }
      
      console.log('✅ Token refrescado exitosamente');
      return newToken;
    }
    
    return null;
  } catch (error: any) {
    // Esto puede pasar si el refresh token está caducado o es inválido.
    // No es un "error fatal" para el usuario: simplemente se fuerza re-login.
    console.warn('⚠️ No se pudo refrescar token, limpiando sesión');
    // Si el refresh falla, limpiar tokens
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('delfin.session.v1');
    return null;
  }
}

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  async (config) => {
    try {
      let token = await SecureStore.getItemAsync('accessToken');
      let needsRefresh = false;
      
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const exp = payload.exp * 1000; // Convertir a milisegundos
          const now = Date.now();
          const timeUntilExpiry = exp - now;
          
          // Si el token YA está expirado o expira en menos de 10 minutos, refrescarlo
          if (timeUntilExpiry < 10 * 60 * 1000) {
            if (timeUntilExpiry <= 0) {
              console.log('⏰ Token EXPIRADO, refrescando inmediatamente...');
            } else {
              console.log(`⏰ Token próximo a expirar (${Math.round(timeUntilExpiry / 1000 / 60)} min), refrescando proactivamente...`);
            }
            needsRefresh = true;
          } else {
            // Token válido, usar directamente
            config.headers.Authorization = `Bearer ${token}`;
            
            // Obtener tenantId del token
            if (payload.tenantId) {
              config.headers['x-tenant-id'] = payload.tenantId;
              console.log('🏢 Tenant ID obtenido del JWT:', payload.tenantId);
            }
          }
        } catch (jwtError) {
          console.warn('⚠️ No se pudo decodificar JWT, asumiendo expirado:', jwtError);
          needsRefresh = true;
        }
      } else {
        // No hay token, intentar refrescar desde refresh token
        console.log('⚠️ No hay access token, intentando refrescar desde refresh token...');
        needsRefresh = true;
      }
      
      // Si necesita refresh, intentar refrescar
      if (needsRefresh) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          token = newToken;
          config.headers.Authorization = `Bearer ${token}`;
          
          // Obtener tenantId del nuevo token
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.tenantId) {
              config.headers['x-tenant-id'] = payload.tenantId;
              console.log('🏢 Tenant ID obtenido del nuevo JWT:', payload.tenantId);
            }
          } catch {}
        } else {
          // No se pudo refrescar, el interceptor de response manejará el 401
          console.warn('⚠️ No se pudo refrescar token, continuando con request (se manejará en response interceptor)');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
      }
      
      // Fallback: Obtener tenant_id de la sesión si no está en el token
      if (!config.headers['x-tenant-id']) {
        const sessionStr = await SecureStore.getItemAsync('delfin.session.v1');
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          if (session.tenant_id) {
            config.headers['x-tenant-id'] = session.tenant_id;
            console.log('🏢 Tenant ID añadido desde sesión:', session.tenant_id);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Error obteniendo token o tenant_id:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores 401 (token expirado)
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    
    // Si es 401 y no es un intento de refresh, intentar refrescar token
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Evitar bucles infinitos: no refrescar si ya intentamos antes o si es el endpoint de refresh
      if (originalRequest.url?.includes('/api/auth/refresh')) {
        console.warn('⚠️ Error en refresh endpoint, no reintentar');
        return Promise.reject(error);
      }
      
      console.log('🚨 401 recibido, intentando refrescar token y reintentar...');
      
      const newToken = await refreshAccessToken();
      
      if (newToken) {
        // Actualizar header y reintentar request
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        
        // También actualizar tenant_id si está en el token
        try {
          const payload = JSON.parse(atob(newToken.split('.')[1]));
          if (payload.tenantId) {
            originalRequest.headers['x-tenant-id'] = payload.tenantId;
          }
        } catch {}
        
        console.log('✅ Token refrescado, reintentando request original:', originalRequest.url);
        return api.request(originalRequest);
      } else {
        // refreshAccessToken ya limpia sesión; aquí solo evitamos ruido en la UI.
        console.warn('⚠️ No se pudo refrescar token (se requiere re-login)');
        // El refresh falló, el error se propagará y el componente manejará el logout
        // No limpiar aquí porque refreshAccessToken ya lo hace
      }
    }
    
    return Promise.reject(error);
  }
);

/** Cabeceras Bearer + tenant para descargas fuera de axios (p. ej. FileSystem.downloadAsync). */
export async function getAuthorizedDownloadHeaders(): Promise<Record<string, string>> {
  let token = await SecureStore.getItemAsync('accessToken');
  if (!token) return {};

  let needsRefresh = false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000;
    if (exp - Date.now() < 10 * 60 * 1000) {
      needsRefresh = true;
    }
  } catch {
    needsRefresh = true;
  }

  if (needsRefresh) {
    const refreshed = await refreshAccessToken();
    if (refreshed) token = refreshed;
  }

  if (!token) return {};

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (payload.tenantId) {
      headers['x-tenant-id'] = payload.tenantId;
    }
    if (!headers['x-tenant-id']) {
      const sessionStr = await SecureStore.getItemAsync('delfin.session.v1');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session.tenant_id) {
          headers['x-tenant-id'] = session.tenant_id;
        }
      }
    }
    return headers;
  } catch {
    return { Authorization: `Bearer ${token}` };
  }
}

// Tipos para respuestas de API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LoginResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
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

