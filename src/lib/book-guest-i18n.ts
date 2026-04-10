/**
 * Textos UI para huéspedes en book.delfincheckin.com (microsite reserva + enlace de pago).
 * Solo español; no usa next-intl (rutas /book/… sin prefijo /es/).
 */
const GUEST_STRINGS_ES = {
  notFoundTitle: 'Propiedad no encontrada',
  notFoundBody: 'La propiedad que buscas no está disponible.',

  maxGuests: 'huéspedes máx.',
  perNight: '/noche',
  includesGuests: 'Incluye {n} huésped{pl}. +{fee}€/persona/noche extra.',

  stepDates: 'Fechas',
  stepGuests: 'Huéspedes',
  stepDetails: 'Datos',
  stepPayment: 'Pago',

  selectDates: 'Selecciona tus fechas',
  availabilityHint:
    'Días ocupados ocultos en el selector entre {from} y {to}. Si eliges una fecha ocupada te avisaremos.',
  priceSummary: 'Resumen de precios',
  nightsX: '{n} noches × {price}€',
  extraPersonLine: '{n} persona{pl} extra × {nights} noches × {fee}€',
  cleaningFee: 'Tarifa de limpieza',
  total: 'Total',
  continue: 'Continuar',
  back: 'Atrás',

  blockedInRange: 'Hay días ocupados dentro del rango. Elige otras fechas.',
  monthTitle: '{m1} · {m2}',
  selectedRange: 'Seleccionado:',
  selectCheckIn: 'Selecciona fecha de entrada',
  weekdays: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],

  guestCountTitle: 'Número de huéspedes',
  guestsLabel: 'Huéspedes',
  guestOption: '{n} huésped{pl}',

  guestDetailsTitle: 'Datos del huésped',
  fullName: 'Nombre completo *',
  email: 'Email *',
  phone: 'Teléfono',
  nationality: 'Nacionalidad',
  specialRequests: 'Solicitudes especiales',
  specialPlaceholder: 'Alguna solicitud especial…',
  continueToPay: 'Continuar al pago',

  payTitle: 'Confirmar y pagar',
  bookingSummary: 'Resumen de la reserva',
  property: 'Propiedad:',
  dates: 'Fechas:',
  guests: 'Huéspedes:',
  nights: 'Noches:',
  cardLabel: 'Datos de la tarjeta *',
  payWith: 'Pagar {amount}€',
  processing: 'Procesando…',
  errCardNotFound: 'Tarjeta no encontrada',
  errCreatePayment: 'Error creando el pago',
  errProcessPayment: 'Error procesando el pago',

  confirmedTitle: '¡Reserva confirmada!',
  confirmedBody: 'Tu reserva ha sido procesada correctamente. Recibirás un email de confirmación.',
  reservationCode: 'Código de reserva:',

  payLinkTitle: 'Pago seguro',
  payLinkSubtitle: 'Completa tus datos y paga con tarjeta.',
  payLinkResource: 'Alojamiento',
  payLinkDates: 'Estancia',
  payLinkGuests: 'Huéspedes',
  payLinkTotal: 'A pagar',
  payLinkPayNow: 'Pagar ahora',
  payLinkLoading: 'Cargando enlace…',
  payLinkInvalid: 'Enlace no válido o no disponible.',
  payLinkSuccessTitle: '¡Pago recibido!',
  payLinkSuccessBody: 'Gracias. Recibirás confirmación por email.',
  payLinkYourDetails: 'Tus datos',
  payLinkDocType: 'Tipo de documento',
  payLinkDocNumber: 'Número de documento',
  payLinkErrRequired: 'Completa nombre, email y teléfono.',
  payLinkNightsShort: '({n} noches)',
} as const;

export type BookGuestStrings = typeof GUEST_STRINGS_ES;

export function getBookStrings(): BookGuestStrings {
  return GUEST_STRINGS_ES;
}

/** Sustituye {key} en plantillas simples */
export function bookFmt(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}
