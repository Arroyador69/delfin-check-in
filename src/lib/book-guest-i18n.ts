/**
 * Textos UI para huéspedes en book.delfincheckin.com (microsite reserva + enlace de pago).
 * No usa next-intl para no depender del prefijo /es/ en rutas /book/…
 */
export type BookGuestLang = 'es' | 'en';

export const BOOK_LANG_COOKIE = 'book_guest_ui_lang';

export function parseBookGuestLang(
  fromQuery: string | null | undefined,
  fromDb?: string | null
): BookGuestLang {
  const q = (fromQuery || '').toLowerCase();
  if (q === 'en') return 'en';
  if (q === 'es') return 'es';
  const d = (fromDb || '').toLowerCase();
  if (d === 'en') return 'en';
  return 'es';
}

export function bookLangFromCookie(cookieHeader: string | null | undefined): BookGuestLang | null {
  if (!cookieHeader) return null;
  const m = cookieHeader.match(/(?:^|;\s*)book_guest_ui_lang=(es|en)(?:;|$)/i);
  if (!m) return null;
  return m[1].toLowerCase() === 'en' ? 'en' : 'es';
}

const STRINGS = {
  es: {
    langEs: 'ES',
    langEn: 'EN',
    langSwitchAria: 'Idioma de la página',
    langHint: 'Elige el idioma de esta página.',

    notFoundTitle: 'Propiedad no encontrada',
    notFoundBody: 'La propiedad que buscas no está disponible.',

    maxGuests: 'huéspedes máx.',
    perNight: '/noche',
    includesGuests:
      'Incluye {n} huésped{pl}. +{fee}€/persona/noche extra.',

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

    // Página enlace de pago (/pay/…)
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
  },
  en: {
    langEs: 'ES',
    langEn: 'EN',
    langSwitchAria: 'Page language',
    langHint: 'Choose the language for this page.',

    notFoundTitle: 'Property not found',
    notFoundBody: 'This property is not available.',

    maxGuests: 'guests max',
    perNight: '/night',
    includesGuests:
      'Includes {n} guest{pl}. +{fee}€/person/night for extra guests.',

    stepDates: 'Dates',
    stepGuests: 'Guests',
    stepDetails: 'Details',
    stepPayment: 'Payment',

    selectDates: 'Choose your dates',
    availabilityHint:
      'Blocked days are hidden in the picker between {from} and {to}. If you pick an unavailable date we will let you know.',
    priceSummary: 'Price summary',
    nightsX: '{n} nights × €{price}',
    extraPersonLine: '{n} extra guest{pl} × {nights} nights × €{fee}',
    cleaningFee: 'Cleaning fee',
    total: 'Total',
    continue: 'Continue',
    back: 'Back',

    blockedInRange: 'There are blocked nights in that range. Please choose other dates.',
    monthTitle: '{m1} · {m2}',
    selectedRange: 'Selected:',
    selectCheckIn: 'Select check-in date',
    weekdays: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],

    guestCountTitle: 'Number of guests',
    guestsLabel: 'Guests',
    guestOption: '{n} guest{pl}',

    guestDetailsTitle: 'Guest details',
    fullName: 'Full name *',
    email: 'Email *',
    phone: 'Phone',
    nationality: 'Nationality',
    specialRequests: 'Special requests',
    specialPlaceholder: 'Any special requests…',
    continueToPay: 'Continue to payment',

    payTitle: 'Confirm and pay',
    bookingSummary: 'Booking summary',
    property: 'Property:',
    dates: 'Dates:',
    guests: 'Guests:',
    nights: 'Nights:',
    cardLabel: 'Card details *',
    payWith: 'Pay €{amount}',
    processing: 'Processing…',
    errCardNotFound: 'Card field not found',
    errCreatePayment: 'Could not create payment',
    errProcessPayment: 'Payment failed',

    confirmedTitle: 'Booking confirmed!',
    confirmedBody: 'Your booking has been processed. You will receive a confirmation email.',
    reservationCode: 'Reservation code:',

    payLinkTitle: 'Secure payment',
    payLinkSubtitle: 'Enter your details and pay by card.',
    payLinkResource: 'Accommodation',
    payLinkDates: 'Stay',
    payLinkGuests: 'Guests',
    payLinkTotal: 'Amount due',
    payLinkPayNow: 'Pay now',
    payLinkLoading: 'Loading link…',
    payLinkInvalid: 'This link is invalid or no longer available.',
    payLinkSuccessTitle: 'Payment received!',
    payLinkSuccessBody: 'Thank you. You will receive a confirmation email.',
    payLinkYourDetails: 'Your details',
    payLinkDocType: 'ID type',
    payLinkDocNumber: 'ID number',
    payLinkErrRequired: 'Please enter your name, email and phone.',
    payLinkNightsShort: '({n} nights)',
  },
} as const;

export type BookGuestStrings = (typeof STRINGS)['es'];

export function getBookStrings(lang: BookGuestLang): BookGuestStrings {
  return STRINGS[lang];
}

/** Sustituye {key} en plantillas simples */
export function bookFmt(
  template: string,
  vars: Record<string, string | number>
): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}
