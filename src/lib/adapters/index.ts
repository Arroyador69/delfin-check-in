/**
 * Factory y registro de adapters
 * 
 * Este módulo gestiona todos los adapters disponibles y proporciona
 * una función factory para obtener el adapter correcto según el key.
 */

import { BaseAdapter } from './base/adapter';
import { SpainHospederiasAdapter } from './spain';
import { ItalyAlloggiatiAdapter } from './italy';

// Registro de todos los adapters disponibles
const adapters: Map<string, BaseAdapter> = new Map();

// Registrar adapters
const spainAdapter = new SpainHospederiasAdapter();
adapters.set(spainAdapter.key, spainAdapter);

const italyAdapter = new ItalyAlloggiatiAdapter();
adapters.set(italyAdapter.key, italyAdapter);

/**
 * Obtiene un adapter por su key
 * @param key - Key del adapter (ej: 'es-hospederias', 'it-alloggiati')
 * @returns El adapter si existe, o null si no se encuentra
 */
export function getAdapter(key: string): BaseAdapter | null {
  return adapters.get(key) || null;
}

/**
 * Obtiene un adapter por código de país
 * @param countryCode - Código ISO del país (ej: 'ES', 'IT')
 * @returns El adapter si existe, o null si no se encuentra
 */
export function getAdapterByCountry(countryCode: string): BaseAdapter | null {
  for (const adapter of adapters.values()) {
    if (adapter.countryCode === countryCode.toUpperCase()) {
      return adapter;
    }
  }
  return null;
}

/**
 * Lista todos los adapters disponibles
 * @returns Array con todos los adapters registrados
 */
export function getAllAdapters(): BaseAdapter[] {
  return Array.from(adapters.values());
}

/**
 * Verifica si un adapter está disponible
 * @param key - Key del adapter
 * @returns true si el adapter existe, false en caso contrario
 */
export function hasAdapter(key: string): boolean {
  return adapters.has(key);
}

// Exportar tipos y clases base
export * from './base/types';
export * from './base/adapter';

// Exportar adapters específicos
export { SpainHospederiasAdapter } from './spain';
export { ItalyAlloggiatiAdapter } from './italy';

