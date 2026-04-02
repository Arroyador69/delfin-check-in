// =====================================================
// TIPOS PARA SISTEMA DE RESERVAS DIRECTAS
// =====================================================

export interface TenantProperty {
  id: number;
  tenant_id: string;
  property_name: string;
  description?: string;
  photos: string[];
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  base_price: number;
  cleaning_fee: number;
  security_deposit: number;
  minimum_nights: number;
  maximum_nights: number;
  availability_rules: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PropertyAvailability {
  id: number;
  property_id: number;
  date: string;
  available: boolean;
  price_override?: number;
  minimum_nights?: number;
  blocked_reason?: string;
  created_at: string;
}

export interface DirectReservation {
  id: number;
  tenant_id: string;
  property_id: number;
  reservation_code: string;
  
  // Información del huésped
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  guest_document_type?: string;
  guest_document_number?: string;
  guest_nationality?: string;
  
  // Detalles de la reserva
  check_in_date: string;
  check_out_date: string;
  nights: number;
  guests: number;
  
  // Precios y comisiones
  base_price: number;
  cleaning_fee: number;
  security_deposit: number;
  subtotal: number;
  delfin_commission_rate: number;
  delfin_commission_amount: number;
  stripe_fee_amount: number;
  property_owner_amount: number;
  total_amount: number;
  
  // Información de pago
  stripe_payment_intent_id?: string;
  stripe_charge_id?: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method?: string;
  
  // Estado de la reserva
  reservation_status: 'confirmed' | 'cancelled' | 'completed' | 'pending';
  special_requests?: string;
  internal_notes?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  cancelled_at?: string;
}

export interface CommissionTransaction {
  id: number;
  reservation_id: number;
  tenant_id: string;
  transaction_type: 'commission' | 'refund' | 'adjustment';
  amount: number;
  stripe_fee: number;
  net_amount: number;
  stripe_transfer_id?: string;
  status: 'pending' | 'completed' | 'failed';
  processed_at?: string;
  created_at: string;
}

export interface TenantCommissionSettings {
  id: number;
  tenant_id: string;
  commission_rate: number;
  stripe_fee_rate: number;
  minimum_commission: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =====================================================
// TIPOS PARA FORMULARIOS Y API
// =====================================================

export interface CreatePropertyRequest {
  property_name: string;
  description?: string;
  photos?: string[];
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  amenities?: string[];
  base_price: number;
  cleaning_fee?: number;
  security_deposit?: number;
  minimum_nights?: number;
  maximum_nights?: number;
  availability_rules?: Record<string, any>;
  // Slot (Room) a asociar al crear/convertir placeholder en propiedad real
  room_id?: string | number;
}

export interface UpdatePropertyRequest extends Partial<CreatePropertyRequest> {
  is_active?: boolean;
}

export interface CreateReservationRequest {
  property_id: number;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  guest_document_type?: string;
  guest_document_number?: string;
  guest_nationality?: string;
  check_in_date: string;
  check_out_date: string;
  guests: number;
  special_requests?: string;
}

export interface CheckAvailabilityRequest {
  property_id: number;
  check_in_date: string;
  check_out_date: string;
  guests: number;
}

export interface AvailabilityResponse {
  available: boolean;
  nights: number;
  base_price: number;
  cleaning_fee: number;
  subtotal: number;
  delfin_commission_amount: number;
  stripe_fee_amount: number;
  property_owner_amount: number;
  total_amount: number;
  blocked_dates?: string[];
  minimum_nights?: number;
}

export interface PaymentIntentRequest {
  reservation_id: number;
  amount: number;
  currency: string;
  metadata: Record<string, string>;
}

export interface PaymentIntentResponse {
  client_secret: string;
  payment_intent_id: string;
  amount: number;
  currency: string;
}

// =====================================================
// TIPOS PARA ESTADÍSTICAS Y DASHBOARD
// =====================================================

export interface ReservationStats {
  total_reservations: number;
  total_revenue: number;
  total_commission: number;
  total_property_owner_amount: number;
  average_reservation_value: number;
  confirmed_reservations: number;
  cancelled_reservations: number;
  pending_reservations: number;
}

export interface PropertyStats extends TenantProperty {
  total_reservations: number;
  total_revenue: number;
  average_reservation_value: number;
  confirmed_reservations: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  commission: number;
  reservations: number;
}

// =====================================================
// TIPOS PARA CONFIGURACIÓN
// =====================================================

export interface CommissionCalculation {
  subtotal: number;
  delfin_commission_rate: number;
  delfin_commission_amount: number;
  stripe_fee_rate: number;
  stripe_fee_amount: number;
  property_owner_amount: number;
  total_amount: number;
}

export interface StripeConfig {
  publishable_key: string;
  currency: string;
  payment_methods: string[];
  timeout_minutes: number;
}

// =====================================================
// TIPOS PARA NOTIFICACIONES
// =====================================================

export interface ReservationNotification {
  type: 'confirmation' | 'cancellation' | 'reminder' | 'payment_failed';
  reservation_id: number;
  guest_email: string;
  property_owner_email: string;
  data: Record<string, any>;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}




