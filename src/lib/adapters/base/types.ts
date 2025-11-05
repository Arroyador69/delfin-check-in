/**
 * Tipos base para el sistema de adapters multi-país
 * Estos tipos permiten que diferentes países tengan sus propias implementaciones
 * sin duplicar código ni cambiar la lógica existente
 */

/**
 * Payload genérico de check-in que viene del formulario
 * Cada adapter lo transformará a su formato específico
 */
export interface CheckInPayload {
  // Identificadores
  referencia?: string;
  tenantId: string;
  propertyId?: string;
  
  // Datos del contrato/reserva
  fechaContrato?: string;
  fechaEntrada: string;
  fechaSalida: string;
  numPersonas: number;
  numHabitaciones?: number;
  internet?: boolean;
  
  // Datos de pago
  tipoPago?: string;
  fechaPago?: string;
  medioPago?: string;
  titular?: string;
  caducidadTarjeta?: string;
  
  // Personas/viajeros
  personas: PersonaPayload[];
  
  // Datos específicos del establecimiento (vienen de la configuración)
  codigoEstablecimiento?: string;
  
  // Metadatos
  [key: string]: any; // Para campos adicionales específicos de cada país
}

/**
 * Datos de una persona/viajero en el payload genérico
 */
export interface PersonaPayload {
  rol?: 'VI' | 'CP' | 'CS' | 'TI';
  nombre: string;
  apellido1: string;
  apellido2?: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  soporteDocumento?: string;
  fechaNacimiento: string;
  nacionalidad?: string;
  sexo?: 'M' | 'F';
  direccion: {
    direccion: string;
    direccionComplementaria?: string;
    codigoPostal: string;
    pais: string;
    codigoMunicipio?: string;
    nombreMunicipio?: string;
  };
  telefono?: string;
  telefono2?: string;
  correo?: string;
  parentesco?: string;
}

/**
 * Resultado de validación
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Resultado de envío a la autoridad
 */
export interface SubmitResult {
  success: boolean;
  reference?: string;
  receipt?: string;
  errors?: string[];
  rawResponse?: any;
}

/**
 * Reglas de plazo y retención
 */
export interface DeadlineRules {
  dueAt: Date;
  severity: 'ok' | 'warn' | 'late';
  hoursRemaining: number;
}

export interface RetentionPolicy {
  keepMonths: number;
  description: string;
}

/**
 * Contexto del adapter (configuración, credenciales, etc.)
 */
export interface AdapterContext {
  tenantId: string;
  propertyId?: string;
  config: {
    codigoEstablecimiento?: string;
    codigoArrendador?: string;
    baseUrl?: string;
    username?: string;
    password?: string;
    aplicacion?: string;
    simulacion?: boolean;
    [key: string]: any; // Configuración adicional específica del país
  };
}

/**
 * Campo requerido para el formulario
 */
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'date' | 'select' | 'number' | 'checkbox';
  required: boolean;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
  options?: { value: string; label: string }[]; // Para select
  placeholder?: string;
  helpText?: string;
}

/**
 * Reglas de validación para el formulario
 */
export interface ValidationRules {
  [fieldName: string]: {
    required?: boolean;
    pattern?: string;
    custom?: (value: any) => string | null; // Retorna mensaje de error o null si válido
  };
}

/**
 * Textos legales por país
 */
export interface LegalTexts {
  privacyPolicy: string;
  termsOfService: string;
  dataProtection: string;
  complianceNotice: string;
}

