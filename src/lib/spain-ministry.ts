// Servicio para integración con el Ministerio del Interior de España
// Sistema REDE (Registro de Empresas de Destino)

interface SpainMinistryConfig {
  apiUrl: string;
  certificatePath: string;
  privateKeyPath: string;
  establishmentCode: string;
}

interface GuestRegistrationData {
  id: string;
  name: string;
  surname: string;
  birth_date: string;
  birth_place: string;
  nationality: string;
  document_type: string;
  document_number: string;
  document_issuing_country: string;
  document_expiry_date: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  arrival_date: string;
  departure_date: string;
  room_number: string;
  travel_purpose: string;
}

export class SpainMinistryService {
  private config: SpainMinistryConfig;

  constructor(config: SpainMinistryConfig) {
    this.config = config;
  }

  /**
   * Envía los datos del huésped al Ministerio del Interior de España
   * Conforme a la Ley 4/2015 y Real Decreto 933/2021
   */
  async sendGuestRegistration(data: GuestRegistrationData): Promise<{
    success: boolean;
    response?: any;
    error?: string;
  }> {
    try {
      // Formatear datos según el formato requerido por España
      const formattedData = this.formatDataForSpain(data);

      // TODO: Implementar envío real a la API oficial
      // Por ahora simulamos el envío
      const response = await this.simulateSpainMinistryAPI(formattedData);

      return {
        success: true,
        response
      };

    } catch (error) {
      console.error('Error sending data to Spain Ministry:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Formatea los datos según el estándar requerido por España
   */
  private formatDataForSpain(data: GuestRegistrationData) {
    return {
      // Datos del establecimiento
      establishment_code: this.config.establishmentCode,
      establishment_type: 'HOTEL',
      
      // Datos del viajero
      traveler: {
        personal_data: {
          name: data.name,
          surname: data.surname,
          birth_date: data.birth_date,
          birth_place: data.birth_place,
          nationality: data.nationality,
          gender: this.extractGenderFromDocument(data.document_number),
        },
        document: {
          type: this.mapDocumentType(data.document_type),
          number: data.document_number,
          issuing_country: data.document_issuing_country,
          expiry_date: data.document_expiry_date,
        },
        contact: {
          email: data.email,
          phone: data.phone,
          address: {
            street: data.address,
            city: data.city,
            postal_code: data.postal_code,
            country: data.country,
          }
        }
      },
      
      // Datos de la estancia
      stay: {
        arrival_date: data.arrival_date,
        departure_date: data.departure_date,
        room_number: data.room_number,
        travel_purpose: this.mapTravelPurpose(data.travel_purpose),
        accommodation_type: 'HOTEL_ROOM',
      },
      
      // Metadatos
      registration_timestamp: new Date().toISOString(),
      data_source: 'Delfin Check-in System',
      compliance_law: 'Ley 4/2015 de Protección de Seguridad Ciudadana',
    };
  }

  /**
   * Mapea los tipos de documento a los códigos oficiales de España
   */
  private mapDocumentType(type: string): string {
    const mapping: Record<string, string> = {
      'passport': 'PASSPORT',
      'dni': 'DNI',
      'nie': 'NIE',
      'other': 'OTHER'
    };
    return mapping[type] || 'OTHER';
  }

  /**
   * Mapea los propósitos de viaje a los códigos oficiales
   */
  private mapTravelPurpose(purpose: string): string {
    const mapping: Record<string, string> = {
      'tourism': 'TOURISM',
      'business': 'BUSINESS',
      'family': 'FAMILY',
      'other': 'OTHER'
    };
    return mapping[purpose] || 'OTHER';
  }

  /**
   * Extrae el género del número de documento (si es posible)
   */
  private extractGenderFromDocument(documentNumber: string): string {
    // Para DNI español, el género se puede extraer del número
    if (documentNumber.length === 9 && /^\d{8}[A-Z]$/.test(documentNumber)) {
      const number = parseInt(documentNumber.substring(0, 8));
      return number % 2 === 0 ? 'FEMALE' : 'MALE';
    }
    return 'UNKNOWN';
  }

  /**
   * Simula el envío a la API oficial del Ministerio del Interior
   * TODO: Reemplazar con implementación real
   */
  private async simulateSpainMinistryAPI(data: any): Promise<any> {
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simular respuesta exitosa
    return {
      success: true,
      registration_id: `ES-${Date.now()}`,
      timestamp: new Date().toISOString(),
      message: 'Datos registrados correctamente en el sistema oficial español',
      compliance_status: 'COMPLIANT',
      law_reference: 'Ley 4/2015, Artículo 25.1'
    };
  }

  /**
   * Verifica el estado de un registro enviado
   */
  async checkRegistrationStatus(registrationId: string): Promise<{
    success: boolean;
    status?: string;
    error?: string;
  }> {
    try {
      // TODO: Implementar verificación real
      return {
        success: true,
        status: 'REGISTERED'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Obtiene estadísticas de cumplimiento
   */
  async getComplianceStats(): Promise<{
    total_registrations: number;
    successful_sends: number;
    failed_sends: number;
    compliance_rate: number;
  }> {
    // TODO: Implementar estadísticas reales
    return {
      total_registrations: 0,
      successful_sends: 0,
      failed_sends: 0,
      compliance_rate: 100
    };
  }
}

// Configuración por defecto (debe ser configurada en producción)
export const spainMinistryConfig: SpainMinistryConfig = {
  apiUrl: process.env.SPAIN_MINISTRY_API_URL || 'https://api.interior.gob.es/rede',
  certificatePath: process.env.SPAIN_MINISTRY_CERT_PATH || '',
  privateKeyPath: process.env.SPAIN_MINISTRY_KEY_PATH || '',
  establishmentCode: process.env.SPAIN_ESTABLISHMENT_CODE || '',
};

// Instancia del servicio
export const spainMinistryService = new SpainMinistryService(spainMinistryConfig);

/**
 * Función helper para enviar registro desde cualquier parte de la aplicación
 */
export async function sendGuestRegistrationToSpain(data: GuestRegistrationData) {
  return await spainMinistryService.sendGuestRegistration(data);
}
