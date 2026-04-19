/**
 * Textos de emails al propietario (reserva directa / microsite) según idioma de trabajo del tenant (config.language).
 */

import type { DirectReservation, TenantProperty } from '@/lib/direct-reservations-types';

export type OwnerMailLocale = 'es' | 'en' | 'it' | 'pt' | 'fr' | 'fi';

const SUPPORTED: OwnerMailLocale[] = ['es', 'en', 'it', 'pt', 'fr', 'fi'];

export function normalizeOwnerMailLocale(raw: string | null | undefined): OwnerMailLocale {
  const l = String(raw || 'es').toLowerCase().split('-')[0];
  if ((SUPPORTED as string[]).includes(l)) return l as OwnerMailLocale;
  return 'es';
}

const STRINGS = {
  subject: {
    es: (code: string) => `🏠 Nueva reserva directa - ${code}`,
    en: (code: string) => `🏠 New direct booking - ${code}`,
    it: (code: string) => `🏠 Nuova prenotazione diretta - ${code}`,
    pt: (code: string) => `🏠 Nova reserva direta - ${code}`,
    fr: (code: string) => `🏠 Nouvelle réservation directe - ${code}`,
    fi: (code: string) => `🏠 Uusi suora varaus - ${code}`,
  },
  titleDoc: {
    es: 'Nueva Reserva Directa',
    en: 'New Direct Booking',
    it: 'Nuova prenotazione diretta',
    pt: 'Nova reserva direta',
    fr: 'Nouvelle réservation directe',
    fi: 'Uusi suora varaus',
  },
  headerTitle: {
    es: '¡Nueva Reserva Directa!',
    en: 'New direct booking!',
    it: 'Nuova prenotazione diretta!',
    pt: 'Nova reserva direta!',
    fr: 'Nouvelle réservation directe !',
    fi: 'Uusi suora varaus!',
  },
  headerSub: {
    es: 'Has recibido una nueva reserva en tu propiedad',
    en: 'You have received a new booking for your property',
    it: 'Hai ricevuto una nuova prenotazione per la tua struttura',
    pt: 'Recebeu uma nova reserva na sua propriedade',
    fr: 'Vous avez reçu une nouvelle réservation pour votre bien',
    fi: 'Olet saanut uuden varauksen majoituspaikallesi',
  },
  congrats: {
    es: '¡Felicitaciones!',
    en: 'Congratulations!',
    it: 'Congratulazioni!',
    pt: 'Parabéns!',
    fr: 'Félicitations !',
    fi: 'Onnittelut!',
  },
  intro: {
    es: (prop: string) =>
      `Has recibido una nueva reserva directa para tu propiedad <strong>${prop}</strong>.`,
    en: (prop: string) =>
      `You have received a new direct booking for <strong>${prop}</strong>.`,
    it: (prop: string) =>
      `Hai ricevuto una nuova prenotazione diretta per <strong>${prop}</strong>.`,
    pt: (prop: string) =>
      `Recebeu uma nova reserva direta para <strong>${prop}</strong>.`,
    fr: (prop: string) =>
      `Vous avez reçu une nouvelle réservation directe pour <strong>${prop}</strong>.`,
    fi: (prop: string) =>
      `Olet saanut uuden suoran varauksen kohteeseen <strong>${prop}</strong>.`,
  },
  paidTitle: {
    es: '✅ Pago Confirmado',
    en: '✅ Payment confirmed',
    it: '✅ Pagamento confermato',
    pt: '✅ Pagamento confirmado',
    fr: '✅ Paiement confirmé',
    fi: '✅ Maksu vahvistettu',
  },
  paidBody: {
    es: 'El cliente ha completado el pago exitosamente. La reserva está confirmada y lista para gestionar.',
    en: 'The guest has completed payment successfully. The booking is confirmed and ready to manage.',
    it: 'L’ospite ha completato il pagamento. La prenotazione è confermata e pronta da gestire.',
    pt: 'O hóspede concluiu o pagamento com sucesso. A reserva está confirmada e pronta a gerir.',
    fr: 'Le client a payé avec succès. La réservation est confirmée et prête à être gérée.',
    fi: 'Vieras on suorittanut maksun. Vahvistettu varaus on valmis hallittavaksi.',
  },
  guestSection: {
    es: '👤 Información del huésped',
    en: '👤 Guest information',
    it: '👤 Informazioni sull’ospite',
    pt: '👤 Informação do hóspede',
    fr: '👤 Informations sur le client',
    fi: '👤 Vieraan tiedot',
  },
  labelName: {
    es: 'Nombre:',
    en: 'Name:',
    it: 'Nome:',
    pt: 'Nome:',
    fr: 'Nom :',
    fi: 'Nimi:',
  },
  labelEmail: {
    es: 'Email:',
    en: 'Email:',
    it: 'Email:',
    pt: 'Email:',
    fr: 'E-mail :',
    fi: 'Sähköposti:',
  },
  labelPhone: {
    es: 'Teléfono:',
    en: 'Phone:',
    it: 'Telefono:',
    pt: 'Telefone:',
    fr: 'Téléphone :',
    fi: 'Puhelin:',
  },
  labelNationality: {
    es: 'Nacionalidad:',
    en: 'Nationality:',
    it: 'Nazionalità:',
    pt: 'Nacionalidade:',
    fr: 'Nationalité :',
    fi: 'Kansallisuus:',
  },
  notProvided: {
    es: 'No proporcionado',
    en: 'Not provided',
    it: 'Non fornito',
    pt: 'Não fornecido',
    fr: 'Non fourni',
    fi: 'Ei ilmoitettu',
  },
  notSpecified: {
    es: 'No especificada',
    en: 'Not specified',
    it: 'Non specificata',
    pt: 'Não especificada',
    fr: 'Non précisée',
    fi: 'Ei määritelty',
  },
  staySection: {
    es: '📅 Detalles de la estancia',
    en: '📅 Stay details',
    it: '📅 Dettagli del soggiorno',
    pt: '📅 Detalhes da estadia',
    fr: '📅 Détails du séjour',
    fi: '📅 Majoituksen tiedot',
  },
  labelCode: {
    es: 'Código de reserva:',
    en: 'Booking code:',
    it: 'Codice prenotazione:',
    pt: 'Código da reserva:',
    fr: 'Code de réservation :',
    fi: 'Varauskoodi:',
  },
  labelCheckIn: {
    es: 'Fecha de entrada:',
    en: 'Check-in date:',
    it: 'Check-in:',
    pt: 'Check-in:',
    fr: 'Arrivée :',
    fi: 'Sisäänkirjautuminen:',
  },
  labelCheckOut: {
    es: 'Fecha de salida:',
    en: 'Check-out date:',
    it: 'Check-out:',
    pt: 'Check-out:',
    fr: 'Départ :',
    fi: 'Uloskirjautuminen:',
  },
  labelNights: {
    es: 'Noches:',
    en: 'Nights:',
    it: 'Notti:',
    pt: 'Noites:',
    fr: 'Nuits :',
    fi: 'Yöt:',
  },
  labelGuests: {
    es: 'Huéspedes:',
    en: 'Guests:',
    it: 'Ospiti:',
    pt: 'Hóspedes:',
    fr: 'Voyageurs :',
    fi: 'Vieraat:',
  },
  financeSection: {
    es: '💰 Desglose financiero',
    en: '💰 Financial breakdown',
    it: '💰 Dettaglio economico',
    pt: '💰 Resumo financeiro',
    fr: '💰 Détail financier',
    fi: '💰 Talouserittely',
  },
  labelTotal: {
    es: 'Total de la reserva:',
    en: 'Booking total:',
    it: 'Totale prenotazione:',
    pt: 'Total da reserva:',
    fr: 'Total de la réservation :',
    fi: 'Varauksen kokonaissumma:',
  },
  labelCommission: {
    es: 'Comisión Delfin',
    en: 'Delfin commission',
    it: 'Commissione Delfin',
    pt: 'Comissão Delfin',
    fr: 'Commission Delfin',
    fi: 'Delfin-komissio',
  },
  labelNet: {
    es: 'Tu ingreso neto:',
    en: 'Your net income:',
    it: 'Il tuo netto:',
    pt: 'O seu rendimento líquido:',
    fr: 'Votre revenu net :',
    fi: 'Nettotulosi:',
  },
  specialSection: {
    es: '📝 Solicitudes especiales del huésped',
    en: '📝 Special requests from the guest',
    it: '📝 Richieste speciali dell’ospite',
    pt: '📝 Pedidos especiais do hóspede',
    fr: '📝 Demandes particulières du client',
    fi: '📝 Vieraan erityistoiveet',
  },
  nextSection: {
    es: '📊 Próximos pasos',
    en: '📊 Next steps',
    it: '📊 Prossimi passi',
    pt: '📊 Próximos passos',
    fr: '📊 Prochaines étapes',
    fi: '📊 Seuraavat vaiheet',
  },
  nextSteps: {
    es: [
      '1. <strong>Prepara la propiedad</strong> para la llegada del huésped',
      '2. <strong>Coordina el check-in</strong> con el huésped',
      '3. <strong>Gestiona la estancia</strong> según tus protocolos',
      '4. <strong>Realiza el check-out</strong> al finalizar la estancia',
    ],
    en: [
      '1. <strong>Prepare the property</strong> for the guest’s arrival',
      '2. <strong>Coordinate check-in</strong> with the guest',
      '3. <strong>Manage the stay</strong> according to your procedures',
      '4. <strong>Complete check-out</strong> at the end of the stay',
    ],
    it: [
      '1. <strong>Prepara la struttura</strong> per l’arrivo dell’ospite',
      '2. <strong>Coordina il check-in</strong> con l’ospite',
      '3. <strong>Gestisci il soggiorno</strong> secondo i tuoi protocolli',
      '4. <strong>Esegui il check-out</strong> a fine soggiorno',
    ],
    pt: [
      '1. <strong>Prepare a propriedade</strong> para a chegada do hóspede',
      '2. <strong>Coordene o check-in</strong> com o hóspede',
      '3. <strong>Gira a estadia</strong> segundo os seus protocolos',
      '4. <strong>Faça o check-out</strong> no fim da estadia',
    ],
    fr: [
      '1. <strong>Préparez le bien</strong> pour l’arrivée du client',
      '2. <strong>Coordonnez le check-in</strong> avec le client',
      '3. <strong>Gérez le séjour</strong> selon vos procédures',
      '4. <strong>Effectuez le check-out</strong> en fin de séjour',
    ],
    fi: [
      '1. <strong>Valmista majoitus</strong> vieraan saapumista varten',
      '2. <strong>Sovi sisäänkirjautuminen</strong> vieraan kanssa',
      '3. <strong>Hallitse majoitusta</strong> omien käytänteidesi mukaan',
      '4. <strong>Suorita uloskirjautuminen</strong> majoituksen päättyessä',
    ],
  },
  panelNote: {
    es: 'Puedes gestionar esta reserva desde tu panel de administración en Delfin Check-in.',
    en: 'You can manage this booking from your Delfin Check-in admin panel.',
    it: 'Puoi gestire questa prenotazione dal pannello Delfin Check-in.',
    pt: 'Pode gerir esta reserva no painel de administração Delfin Check-in.',
    fr: 'Vous pouvez gérer cette réservation depuis votre tableau de bord Delfin Check-in.',
    fi: 'Voit hallita tätä varausta Delfin Check-in -hallintapaneelista.',
  },
  closing: {
    es: '¡Que tengas una excelente experiencia con tu huésped!',
    en: 'We hope you have a great experience with your guest!',
    it: 'Ti auguriamo un’ottima esperienza con il tuo ospite!',
    pt: 'Desejamos uma excelente experiência com o seu hóspede!',
    fr: 'Nous vous souhaitons une excellente expérience avec votre client !',
    fi: 'Toivomme hyvää kokemusta vieraan kanssa!',
  },
  footerAuto: {
    es: 'Este email fue enviado automáticamente por Delfin Check-in',
    en: 'This email was sent automatically by Delfin Check-in',
    it: 'Questa email è stata inviata automaticamente da Delfin Check-in',
    pt: 'Este e-mail foi enviado automaticamente pela Delfin Check-in',
    fr: 'Cet e-mail a été envoyé automatiquement par Delfin Check-in',
    fi: 'Tämän sähköpostin lähetti automaattisesti Delfin Check-in',
  },
  footerRights: {
    es: '© 2024 Delfin Check-in. Todos los derechos reservados.',
    en: '© 2024 Delfin Check-in. All rights reserved.',
    it: '© 2024 Delfin Check-in. Tutti i diritti riservati.',
    pt: '© 2024 Delfin Check-in. Todos os direitos reservados.',
    fr: '© 2024 Delfin Check-in. Tous droits réservés.',
    fi: '© 2024 Delfin Check-in. Kaikki oikeudet pidätetään.',
  },
} as const;

function localeTag(loc: OwnerMailLocale): string {
  const map: Record<OwnerMailLocale, string> = {
    es: 'es-ES',
    en: 'en-GB',
    it: 'it-IT',
    pt: 'pt-PT',
    fr: 'fr-FR',
    fi: 'fi-FI',
  };
  return map[loc];
}

export function generatePropertyOwnerNotificationEmailLocalized(
  reservation: DirectReservation,
  property: TenantProperty,
  locale: OwnerMailLocale
) {
  const loc = locale;
  const checkInDate = new Date(reservation.check_in_date).toLocaleDateString(localeTag(loc), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const checkOutDate = new Date(reservation.check_out_date).toLocaleDateString(localeTag(loc), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const L = STRINGS;
  const phone = reservation.guest_phone || L.notProvided[loc];
  const nat = reservation.guest_nationality || L.notSpecified[loc];
  const nextHtml = L.nextSteps[loc].map((p) => `<p>${p}</p>`).join('');

  const subject = L.subject[loc](reservation.reservation_code);

  const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${L.titleDoc[loc]}</title>
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
            <h1>${L.headerTitle[loc]}</h1>
            <p>${L.headerSub[loc]}</p>
          </div>
          
          <div class="content">
            <h2>${L.congrats[loc]}</h2>
            <p>${L.intro[loc](property.property_name)}</p>
            
            ${
              reservation.payment_status === 'paid'
                ? `
              <div class="reservation-details" style="background: #d4edda; border-left: 4px solid #28a745;">
                <h3 style="color: #155724; margin-top: 0;">${L.paidTitle[loc]}</h3>
                <p style="color: #155724; margin-bottom: 0;">${L.paidBody[loc]}</p>
              </div>
            `
                : ''
            }
            
            <div class="reservation-details">
              <h3>${L.guestSection[loc]}</h3>
              <div class="detail-row">
                <span class="detail-label">${L.labelName[loc]}</span>
                <span class="detail-value">${reservation.guest_name}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">${L.labelEmail[loc]}</span>
                <span class="detail-value">${reservation.guest_email}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">${L.labelPhone[loc]}</span>
                <span class="detail-value">${phone}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">${L.labelNationality[loc]}</span>
                <span class="detail-value">${nat}</span>
              </div>
            </div>
            
            <div class="reservation-details">
              <h3>${L.staySection[loc]}</h3>
              <div class="detail-row">
                <span class="detail-label">${L.labelCode[loc]}</span>
                <span class="detail-value"><strong>${reservation.reservation_code}</strong></span>
              </div>
              <div class="detail-row">
                <span class="detail-label">${L.labelCheckIn[loc]}</span>
                <span class="detail-value">${checkInDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">${L.labelCheckOut[loc]}</span>
                <span class="detail-value">${checkOutDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">${L.labelNights[loc]}</span>
                <span class="detail-value">${reservation.nights}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">${L.labelGuests[loc]}</span>
                <span class="detail-value">${reservation.guests}</span>
              </div>
            </div>
            
            <div class="reservation-details">
              <h3>${L.financeSection[loc]}</h3>
              <div class="detail-row">
                <span class="detail-label">${L.labelTotal[loc]}</span>
                <span class="detail-value">${reservation.total_amount.toFixed(2)}€</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">${L.labelCommission[loc]} (${(reservation.delfin_commission_rate * 100).toFixed(1)}%):</span>
                <span class="detail-value commission">-${reservation.delfin_commission_amount.toFixed(2)}€</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">${L.labelNet[loc]}</span>
                <span class="detail-value revenue">${reservation.property_owner_amount.toFixed(2)}€</span>
              </div>
            </div>
            
            ${
              reservation.special_requests
                ? `
              <div class="reservation-details">
                <h3>${L.specialSection[loc]}</h3>
                <p>${reservation.special_requests}</p>
              </div>
            `
                : ''
            }
            
            <div class="reservation-details">
              <h3>${L.nextSection[loc]}</h3>
              ${nextHtml}
            </div>
            
            <p>${L.panelNote[loc]}</p>
            <p>${L.closing[loc]}</p>
          </div>
          
          <div class="footer">
            <p>${L.footerAuto[loc]}</p>
            <p>${L.footerRights[loc]}</p>
          </div>
        </div>
      </body>
      </html>
    `;

  const paidLine =
    reservation.payment_status === 'paid'
      ? `✅ ${L.paidTitle[loc]} - ${L.paidBody[loc]}\n\n`
      : '';

  const text = `
      ${L.headerTitle[loc]}
      
      ${L.intro[loc](property.property_name).replace(/<[^>]+>/g, '')}
      
      ${paidLine}${L.guestSection[loc]}:
      - ${L.labelName[loc]} ${reservation.guest_name}
      - ${L.labelEmail[loc]} ${reservation.guest_email}
      - ${L.labelPhone[loc]} ${phone}
      - ${L.labelNationality[loc]} ${nat}
      
      ${L.staySection[loc]}:
      - ${L.labelCode[loc]} ${reservation.reservation_code}
      - ${checkInDate} - ${checkOutDate}
      - ${L.labelNights[loc]} ${reservation.nights}
      - ${L.labelGuests[loc]} ${reservation.guests}
      
      ${L.financeSection[loc]}:
      - ${reservation.total_amount.toFixed(2)}€
      - ${L.labelCommission[loc]}: -${reservation.delfin_commission_amount.toFixed(2)}€
      - ${L.labelNet[loc]} ${reservation.property_owner_amount.toFixed(2)}€
      
      ${reservation.special_requests ? `${reservation.special_requests}\n` : ''}
      
      ${L.closing[loc]}
    `;

  return { subject, html, text };
}
