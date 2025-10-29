// =====================================================
// SISTEMA DE NOTIFICACIONES POR EMAIL PARA RESERVAS DIRECTAS
// =====================================================

import nodemailer from 'nodemailer';
import { DirectReservation, TenantProperty } from '@/lib/direct-reservations-types';

// Configuración del transporter SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// =====================================================
// PLANTILLAS DE EMAIL
// =====================================================

export function generateGuestConfirmationEmail(reservation: DirectReservation, property: TenantProperty, publicFormUrl?: string) {
  const checkInDate = new Date(reservation.check_in_date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const checkOutDate = new Date(reservation.check_out_date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // URL del formulario público del tenant
  const formUrl = publicFormUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com'}/api/public/form-redirect/${reservation.tenant_id}`;

  return {
    subject: `✅ Reserva confirmada - ${reservation.reservation_code}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reserva Confirmada</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .reservation-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
          .detail-label { font-weight: bold; color: #555; }
          .detail-value { color: #333; }
          .total { font-size: 18px; font-weight: bold; color: #2c5aa0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .logo { font-size: 24px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🐬 Delfin Check-in</div>
            <h1>¡Reserva Confirmada!</h1>
            <p>Tu reserva ha sido procesada exitosamente</p>
          </div>
          
          <div class="content">
            <h2>Hola ${reservation.guest_name},</h2>
            <p>¡Excelente noticia! Tu reserva ha sido confirmada y el pago procesado correctamente.</p>
            
            <div class="reservation-details">
              <h3>📋 Detalles de tu reserva</h3>
              <div class="detail-row">
                <span class="detail-label">Código de reserva:</span>
                <span class="detail-value"><strong>${reservation.reservation_code}</strong></span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Propiedad:</span>
                <span class="detail-value">${property.property_name}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Fecha de entrada:</span>
                <span class="detail-value">${checkInDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Fecha de salida:</span>
                <span class="detail-value">${checkOutDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Noches:</span>
                <span class="detail-value">${reservation.nights}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Huéspedes:</span>
                <span class="detail-value">${reservation.guests}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Total pagado:</span>
                <span class="detail-value total">${reservation.total_amount.toFixed(2)}€</span>
              </div>
            </div>
            
            ${reservation.special_requests ? `
              <div class="reservation-details">
                <h3>📝 Solicitudes especiales</h3>
                <p>${reservation.special_requests}</p>
              </div>
            ` : ''}
            
            <div class="reservation-details" style="background: #fff3cd; border-left: 4px solid #ffc107;">
              <h3>⚠️ IMPORTANTE: Formulario de registro obligatorio</h3>
              <p><strong>Debe completar el formulario de registro de viajeros lo antes posible.</strong> Este formulario es obligatorio por ley y los datos se envían al Gobierno de España (Ministerio del Interior).</p>
              <p style="margin-top: 15px;">
                <a href="${formUrl}" target="_blank" style="background:#28a745;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:bold;">
                  📝 Rellenar formulario de registro de viajeros
                </a>
              </p>
              <p style="margin-top: 15px; font-size: 14px; color: #666;">
                <strong>¿Por qué es importante?</strong><br>
                - Es un requisito legal obligatorio en España<br>
                - Los datos se comunican automáticamente al Ministerio del Interior<br>
                - Necesario para el check-in en la propiedad<br>
                - Tiempo estimado: 5-10 minutos
              </p>
            </div>
            
            <div class="reservation-details">
              <h3>📞 Información de contacto</h3>
              <p>Si tienes alguna pregunta sobre tu reserva, puedes contactarnos en:</p>
              <p><strong>Email:</strong> booking@delfincheckin.com</p>
              <p><strong>Teléfono:</strong> ${reservation.guest_phone || 'No proporcionado'}</p>
            </div>
            
            <p>¡Esperamos que disfrutes de tu estancia!</p>
            <p>El equipo de Delfin Check-in</p>
          </div>
          
          <div class="footer">
            <p>Este email fue enviado automáticamente por Delfin Check-in</p>
            <p>© 2024 Delfin Check-in. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      ¡Reserva Confirmada!
      
      Hola ${reservation.guest_name},
      
      Tu reserva ha sido confirmada exitosamente.
      
      Detalles de la reserva:
      - Código: ${reservation.reservation_code}
      - Propiedad: ${property.property_name}
      - Fechas: ${checkInDate} - ${checkOutDate}
      - Noches: ${reservation.nights}
      - Huéspedes: ${reservation.guests}
      - Total: ${reservation.total_amount.toFixed(2)}€
      
      ${reservation.special_requests ? `Solicitudes especiales: ${reservation.special_requests}` : ''}
      
      ⚠️ IMPORTANTE: Debe completar el formulario de registro de viajeros:
      ${formUrl}
      
      Este formulario es obligatorio por ley y los datos se envían al Gobierno de España (Ministerio del Interior).
      
      ¡Esperamos que disfrutes de tu estancia!
      
      El equipo de Delfin Check-in
    `
  };
}

export function generatePropertyOwnerNotificationEmail(reservation: DirectReservation, property: TenantProperty) {
  const checkInDate = new Date(reservation.check_in_date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const checkOutDate = new Date(reservation.check_out_date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return {
    subject: `🏠 Nueva reserva directa - ${reservation.reservation_code}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nueva Reserva Directa</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .reservation-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
          .detail-label { font-weight: bold; color: #555; }
          .detail-value { color: #333; }
          .revenue { font-size: 18px; font-weight: bold; color: #28a745; }
          .commission { font-size: 14px; color: #dc3545; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .logo { font-size: 24px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🐬 Delfin Check-in</div>
            <h1>¡Nueva Reserva Directa!</h1>
            <p>Has recibido una nueva reserva en tu propiedad</p>
          </div>
          
          <div class="content">
            <h2>¡Felicitaciones!</h2>
            <p>Has recibido una nueva reserva directa para tu propiedad <strong>${property.property_name}</strong>.</p>
            
            ${reservation.payment_status === 'paid' ? `
              <div class="reservation-details" style="background: #d4edda; border-left: 4px solid #28a745;">
                <h3 style="color: #155724; margin-top: 0;">✅ Pago Confirmado</h3>
                <p style="color: #155724; margin-bottom: 0;">El cliente ha completado el pago exitosamente. La reserva está confirmada y lista para gestionar.</p>
              </div>
            ` : ''}
            
            <div class="reservation-details">
              <h3>👤 Información del huésped</h3>
              <div class="detail-row">
                <span class="detail-label">Nombre:</span>
                <span class="detail-value">${reservation.guest_name}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Email:</span>
                <span class="detail-value">${reservation.guest_email}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Teléfono:</span>
                <span class="detail-value">${reservation.guest_phone || 'No proporcionado'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Nacionalidad:</span>
                <span class="detail-value">${reservation.guest_nationality || 'No especificada'}</span>
              </div>
            </div>
            
            <div class="reservation-details">
              <h3>📅 Detalles de la estancia</h3>
              <div class="detail-row">
                <span class="detail-label">Código de reserva:</span>
                <span class="detail-value"><strong>${reservation.reservation_code}</strong></span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Fecha de entrada:</span>
                <span class="detail-value">${checkInDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Fecha de salida:</span>
                <span class="detail-value">${checkOutDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Noches:</span>
                <span class="detail-value">${reservation.nights}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Huéspedes:</span>
                <span class="detail-value">${reservation.guests}</span>
              </div>
            </div>
            
            <div class="reservation-details">
              <h3>💰 Desglose financiero</h3>
              <div class="detail-row">
                <span class="detail-label">Total de la reserva:</span>
                <span class="detail-value">${reservation.total_amount.toFixed(2)}€</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Comisión Delfin (${(reservation.delfin_commission_rate * 100).toFixed(1)}%):</span>
                <span class="detail-value commission">-${reservation.delfin_commission_amount.toFixed(2)}€</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Tu ingreso neto:</span>
                <span class="detail-value revenue">${reservation.property_owner_amount.toFixed(2)}€</span>
              </div>
            </div>
            
            ${reservation.special_requests ? `
              <div class="reservation-details">
                <h3>📝 Solicitudes especiales del huésped</h3>
                <p>${reservation.special_requests}</p>
              </div>
            ` : ''}
            
            <div class="reservation-details">
              <h3>📊 Próximos pasos</h3>
              <p>1. <strong>Prepara la propiedad</strong> para la llegada del huésped</p>
              <p>2. <strong>Coordina el check-in</strong> con el huésped</p>
              <p>3. <strong>Gestiona la estancia</strong> según tus protocolos</p>
              <p>4. <strong>Realiza el check-out</strong> al finalizar la estancia</p>
            </div>
            
            <p>Puedes gestionar esta reserva desde tu panel de administración en Delfin Check-in.</p>
            <p>¡Que tengas una excelente experiencia con tu huésped!</p>
          </div>
          
          <div class="footer">
            <p>Este email fue enviado automáticamente por Delfin Check-in</p>
            <p>© 2024 Delfin Check-in. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      ¡Nueva Reserva Directa!
      
      Has recibido una nueva reserva directa para tu propiedad ${property.property_name}.
      
      ${reservation.payment_status === 'paid' ? '✅ PAGO CONFIRMADO - El cliente ha completado el pago exitosamente.\n\n' : ''}Información del huésped:
      - Nombre: ${reservation.guest_name}
      - Email: ${reservation.guest_email}
      - Teléfono: ${reservation.guest_phone || 'No proporcionado'}
      - Nacionalidad: ${reservation.guest_nationality || 'No especificada'}
      
      Detalles de la estancia:
      - Código: ${reservation.reservation_code}
      - Fechas: ${checkInDate} - ${checkOutDate}
      - Noches: ${reservation.nights}
      - Huéspedes: ${reservation.guests}
      
      Desglose financiero:
      - Total reserva: ${reservation.total_amount.toFixed(2)}€
      - Comisión Delfin: -${reservation.delfin_commission_amount.toFixed(2)}€
      - Tu ingreso neto: ${reservation.property_owner_amount.toFixed(2)}€
      
      ${reservation.special_requests ? `Solicitudes especiales: ${reservation.special_requests}` : ''}
      
      ¡Que tengas una excelente experiencia con tu huésped!
    `
  };
}

// =====================================================
// FUNCIONES DE ENVÍO
// =====================================================

export async function sendGuestConfirmationEmail(reservation: DirectReservation, property: TenantProperty, publicFormUrl?: string) {
  try {
    const emailContent = generateGuestConfirmationEmail(reservation, property, publicFormUrl);
    
    const mailOptions = {
      // Email específico para reservas directas (book.delfincheckin.com)
      from: process.env.SMTP_FROM_BOOKING || process.env.SMTP_FROM || 'Delfín Check-in <booking@delfincheckin.com>',
      to: reservation.guest_email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email de confirmación enviado al huésped:', {
      reservationCode: reservation.reservation_code,
      guestEmail: reservation.guest_email,
      messageId: result.messageId
    });

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error enviando email al huésped:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
}

export async function sendPropertyOwnerNotificationEmail(reservation: DirectReservation, property: TenantProperty) {
  try {
    // Obtener email del propietario desde la tabla tenants
    const { sql } = await import('@vercel/postgres');
    const tenantResult = await sql`
      SELECT email FROM tenants WHERE id = ${reservation.tenant_id}
    `;
    
    if (tenantResult.rows.length === 0) {
      throw new Error('Tenant no encontrado');
    }
    
    const ownerEmail = tenantResult.rows[0].email;
    if (!ownerEmail) {
      throw new Error('Email del propietario no configurado');
    }

    const emailContent = generatePropertyOwnerNotificationEmail(reservation, property);
    
    const mailOptions = {
      // Email específico para reservas directas (book.delfincheckin.com)
      from: process.env.SMTP_FROM_BOOKING || process.env.SMTP_FROM || 'Delfín Check-in <booking@delfincheckin.com>',
      to: ownerEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email de notificación enviado al propietario:', {
      reservationCode: reservation.reservation_code,
      ownerEmail: ownerEmail,
      messageId: result.messageId
    });

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error enviando email al propietario:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
}

export async function sendReservationEmails(reservation: DirectReservation, property: TenantProperty, publicFormUrl?: string) {
  console.log('📧 Enviando emails de notificación para reserva:', reservation.reservation_code);
  
  const results = await Promise.allSettled([
    sendGuestConfirmationEmail(reservation, property, publicFormUrl),
    sendPropertyOwnerNotificationEmail(reservation, property)
  ]);

  const guestResult = results[0];
  const ownerResult = results[1];

  return {
    guestEmail: guestResult.status === 'fulfilled' ? guestResult.value : { success: false, error: 'Failed' },
    ownerEmail: ownerResult.status === 'fulfilled' ? ownerResult.value : { success: false, error: 'Failed' }
  };
}
