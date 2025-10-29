// =====================================================
// UTILIDADES PARA SISTEMA DE RESERVAS DIRECTAS
// =====================================================

import { CommissionCalculation, AvailabilityResponse } from './direct-reservations-types';

// =====================================================
// CÁLCULO DE COMISIONES
// =====================================================

export function calculateCommission(
  subtotal: number,
  commissionRate: number = 0.09, // 9% por defecto
  stripeFeeRate: number = 0.014  // 1.4% + 0.25€ por defecto
): CommissionCalculation {
  const delfinCommissionAmount = subtotal * commissionRate;
  const stripeFeeAmount = (subtotal * stripeFeeRate) + 0.25; // 0.25€ fijo
  const propertyOwnerAmount = subtotal - delfinCommissionAmount;
  
  return {
    subtotal,
    delfin_commission_rate: commissionRate,
    delfin_commission_amount: delfinCommissionAmount,
    stripe_fee_rate: stripeFeeRate,
    stripe_fee_amount: stripeFeeAmount,
    property_owner_amount: propertyOwnerAmount,
    total_amount: subtotal
  };
}

// =====================================================
// VALIDACIÓN DE FECHAS
// =====================================================

export function validateReservationDates(
  checkIn: string,
  checkOut: string,
  minimumNights: number = 1,
  maximumNights: number = 30
): { valid: boolean; error?: string; nights?: number } {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const today = new Date();
  
  // Validar que las fechas sean válidas
  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
    return { valid: false, error: 'Fechas inválidas' };
  }
  
  // Validar que check-in sea en el futuro
  if (checkInDate <= today) {
    return { valid: false, error: 'La fecha de entrada debe ser futura' };
  }
  
  // Validar que check-out sea después de check-in
  if (checkOutDate <= checkInDate) {
    return { valid: false, error: 'La fecha de salida debe ser posterior a la entrada' };
  }
  
  // Calcular noches
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Validar número mínimo de noches
  if (nights < minimumNights) {
    return { valid: false, error: `Mínimo ${minimumNights} noches requeridas` };
  }
  
  // Validar número máximo de noches
  if (nights > maximumNights) {
    return { valid: false, error: `Máximo ${maximumNights} noches permitidas` };
  }
  
  return { valid: true, nights };
}

// =====================================================
// GENERACIÓN DE CÓDIGOS
// =====================================================

export function generateReservationCode(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  
  return `DR${year}${month}${random}`;
}

// =====================================================
// VALIDACIÓN DE EMAIL
// =====================================================

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// =====================================================
// VALIDACIÓN DE TELÉFONO
// =====================================================

export function validatePhone(phone: string): boolean {
  // Eliminar espacios y caracteres especiales
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  // Validar que tenga entre 9 y 15 dígitos
  return /^\d{9,15}$/.test(cleanPhone);
}

// =====================================================
// FORMATEO DE PRECIOS
// =====================================================

export function formatPrice(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// =====================================================
// FORMATEO DE FECHAS
// =====================================================

export function formatDate(date: string | Date, locale: string = 'es-ES'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(dateObj);
}

export function formatDateShort(date: string | Date, locale: string = 'es-ES'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(dateObj);
}

// =====================================================
// CÁLCULO DE DISPONIBILIDAD
// =====================================================

export function calculateAvailability(
  propertyId: number,
  checkIn: string,
  checkOut: string,
  basePrice: number,
  cleaningFee: number = 0,
  commissionRate: number = 0.09
): AvailabilityResponse {
  const dateValidation = validateReservationDates(checkIn, checkOut);
  
  if (!dateValidation.valid) {
    return {
      available: false,
      nights: 0,
      base_price: basePrice,
      cleaning_fee: cleaningFee,
      subtotal: 0,
      delfin_commission_amount: 0,
      stripe_fee_amount: 0,
      property_owner_amount: 0,
      total_amount: 0,
      blocked_dates: [],
      minimum_nights: 1
    };
  }
  
  const nights = dateValidation.nights!;
  const subtotal = (basePrice * nights) + cleaningFee;
  const commission = calculateCommission(subtotal, commissionRate);
  
  return {
    available: true,
    nights,
    base_price: basePrice,
    cleaning_fee: cleaningFee,
    subtotal,
    delfin_commission_amount: commission.delfin_commission_amount,
    stripe_fee_amount: commission.stripe_fee_amount,
    property_owner_amount: commission.property_owner_amount,
    total_amount: commission.total_amount
  };
}

// =====================================================
// VALIDACIÓN DE ARCHIVOS
// =====================================================

export function validateImageFile(
  file: File,
  maxSizeMB: number = 5,
  allowedFormats: string[] = ['jpg', 'jpeg', 'png', 'webp']
): { valid: boolean; error?: string } {
  // Validar tamaño
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return { valid: false, error: `El archivo no puede superar ${maxSizeMB}MB` };
  }
  
  // Validar formato
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  if (!fileExtension || !allowedFormats.includes(fileExtension)) {
    return { valid: false, error: `Formato no permitido. Use: ${allowedFormats.join(', ')}` };
  }
  
  return { valid: true };
}

// =====================================================
// UTILIDADES DE STRIPE
// =====================================================

export function createStripeMetadata(reservationData: {
  tenantId: string;
  propertyId: number;
  reservationId: number;
  guestEmail: string;
}): Record<string, string> {
  return {
    tenant_id: reservationData.tenantId,
    property_id: reservationData.propertyId.toString(),
    reservation_id: reservationData.reservationId.toString(),
    guest_email: reservationData.guestEmail,
    source: 'direct_reservation'
  };
}

// =====================================================
// CONSTANTES
// =====================================================

export const DIRECT_RESERVATIONS_CONFIG = {
  COMMISSION_RATE: 0.09, // 9%
  STRIPE_FEE_RATE: 0.014, // 1.4%
  STRIPE_FIXED_FEE: 0.25, // 0.25€
  MINIMUM_COMMISSION: 1.00, // 1€
  CURRENCY: 'EUR',
  PAYMENT_TIMEOUT_MINUTES: 30,
  MAX_PHOTOS_PER_PROPERTY: 20,
  MAX_PHOTO_SIZE_MB: 5,
  ALLOWED_PHOTO_FORMATS: ['jpg', 'jpeg', 'png', 'webp'],
  MINIMUM_NIGHTS_DEFAULT: 1,
  MAXIMUM_NIGHTS_DEFAULT: 30,
  ADVANCE_BOOKING_DAYS: 365
} as const;

