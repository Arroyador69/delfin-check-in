import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { sql } from '@/lib/db';

// =====================================================
// POST: Generar contenido para landing con IA
// =====================================================
// Esta API solo se llama cuando existe una señal clara del Radar
export async function POST(req: NextRequest) {
  try {
    const { error, payload } = await verifySuperAdmin(req);
    if (error) return error;

    const body = await req.json();
    const {
      radar_signal_id,
      property_id,
      target_keywords,
      target_audience,
      target_date_start,
      target_date_end
    } = body;

    // Validaciones
    if (!radar_signal_id || !property_id || !target_keywords) {
      return NextResponse.json(
        { success: false, error: 'radar_signal_id, property_id y target_keywords son requeridos' },
        { status: 400 }
      );
    }

    // Obtener la señal del Radar
    const signalResult = await sql`
      SELECT * FROM radar_signals WHERE id = ${radar_signal_id}
    `;

    if (signalResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Señal del Radar no encontrada' },
        { status: 404 }
      );
    }

    const signal = signalResult.rows[0];

    // Obtener información de la propiedad
    const propertyResult = await sql`
      SELECT 
        tp.*,
        t.name as tenant_name
      FROM tenant_properties tp
      JOIN tenants t ON tp.tenant_id = t.id
      WHERE tp.id = ${property_id}
    `;

    if (propertyResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Propiedad no encontrada' },
        { status: 404 }
      );
    }

    const property = propertyResult.rows[0];

    // TODO: Integrar con OpenAI API para generar contenido
    // Por ahora, generamos un contenido estructurado básico
    // En producción, aquí se llamaría a OpenAI con el prompt adecuado

    const generatedContent = {
      title: `${property.property_name} - ${target_keywords.join(', ')}`,
      meta_description: `Reserva ${property.property_name} para ${target_keywords.join(', ')}. Ofertas especiales y disponibilidad inmediata.`,
      hero: {
        headline: `Tu ${target_keywords[0]} perfecto en ${property.property_name}`,
        subheadline: `Disfruta de una experiencia única con todas las comodidades que necesitas`,
        cta_text: "Reservar ahora"
      },
      sections: [
        {
          type: "features",
          title: "¿Por qué elegir ${property.property_name}?",
          items: property.amenities ? JSON.parse(property.amenities).slice(0, 6) : []
        },
        {
          type: "description",
          content: property.description || `Descubre ${property.property_name}, el lugar perfecto para tu ${target_keywords[0]}.`
        }
      ],
      faqs: [
        {
          question: `¿Cuándo puedo reservar para ${target_keywords[0]}?`,
          answer: `Puedes reservar ahora para las fechas disponibles. Consulta el calendario para ver disponibilidad.`
        },
        {
          question: "¿Qué incluye la reserva?",
          answer: `Tu reserva incluye acceso completo a ${property.property_name} con todas las comodidades.`
        },
        {
          question: "¿Puedo cancelar o modificar mi reserva?",
          answer: "Las políticas de cancelación dependen del tipo de reserva. Consulta los términos y condiciones."
        }
      ],
      seo: {
        keywords: target_keywords,
        json_ld: {
          "@context": "https://schema.org",
          "@type": "LodgingBusiness",
          "name": property.property_name,
          "description": property.description || "",
          "address": {
            "@type": "PostalAddress"
          }
        }
      }
    };

    return NextResponse.json({
      success: true,
      content: generatedContent,
      message: 'Contenido generado correctamente (ejemplo básico - integrar con OpenAI en producción)'
    });

  } catch (error: any) {
    console.error('❌ Error generando contenido:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

