import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * API pública para obtener configuración del formulario de un tenant
 * URL: /api/public/form/[slug]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug requerido' },
        { status: 400 }
      );
    }

    // Buscar tenant por slug (usar ID o generar slug único)
    // Por ahora usamos el ID del tenant como slug
    const result = await sql`
      SELECT 
        t.id,
        t.name,
        t.email,
        t.status,
        t.config,
        t.created_at
      FROM tenants t
      WHERE t.id = ${slug}
        AND t.status = 'active'
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Formulario no encontrado o inactivo' },
        { status: 404 }
      );
    }

    const tenant = result.rows[0];

    // Configuración del formulario por defecto (se puede personalizar por tenant)
    const formConfig = {
      title: `Contacta con ${tenant.config?.propertyName || tenant.name}`,
      description: `Envíanos un mensaje y nos pondremos en contacto contigo lo antes posible.`,
      fields: [
        {
          id: 'name',
          type: 'text',
          label: 'Nombre completo',
          required: true,
          placeholder: 'Tu nombre completo'
        },
        {
          id: 'email',
          type: 'email',
          label: 'Email',
          required: true,
          placeholder: 'tu@email.com'
        },
        {
          id: 'phone',
          type: 'tel',
          label: 'Teléfono',
          required: false,
          placeholder: '+34 600 000 000'
        },
        {
          id: 'checkin',
          type: 'date',
          label: 'Fecha de entrada',
          required: false,
          placeholder: ''
        },
        {
          id: 'checkout',
          type: 'date',
          label: 'Fecha de salida',
          required: false,
          placeholder: ''
        },
        {
          id: 'guests',
          type: 'number',
          label: 'Número de huéspedes',
          required: false,
          placeholder: '2'
        },
        {
          id: 'room_type',
          type: 'select',
          label: 'Tipo de habitación',
          required: false,
          options: [
            'Habitación individual',
            'Habitación doble',
            'Habitación triple',
            'Suite',
            'Apartamento'
          ]
        },
        {
          id: 'message',
          type: 'textarea',
          label: 'Mensaje adicional',
          required: false,
          placeholder: 'Cuéntanos sobre tu estancia, necesidades especiales, etc.'
        }
      ],
      submitButtonText: 'Enviar consulta',
      successMessage: `Gracias por tu mensaje. ${tenant.config?.propertyName || tenant.name} se pondrá en contacto contigo pronto.`
    };

    // Personalizar configuración según el tenant
    const customConfig = {
      ...formConfig,
      title: tenant.config?.propertyName 
        ? `Contacta con ${tenant.config.propertyName}`
        : formConfig.title,
      successMessage: tenant.config?.propertyName
        ? `Gracias por tu mensaje. ${tenant.config.propertyName} se pondrá en contacto contigo pronto.`
        : formConfig.successMessage
    };

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        config: tenant.config
      },
      formConfig: customConfig
    });

  } catch (error) {
    console.error('Error obteniendo configuración del formulario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
