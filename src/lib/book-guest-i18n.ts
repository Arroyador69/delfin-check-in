/**
 * Textos UI para huéspedes en book.delfincheckin.com (microsite reserva + enlace de pago).
 * Sin next-intl: rutas /book/… usan ?lang=es|en|fr|it|pt|fi o idioma del navegador.
 */

export const BOOK_LOCALES = ['es', 'en', 'fr', 'it', 'pt', 'fi'] as const;
export type BookLocale = (typeof BOOK_LOCALES)[number];

const GUEST_STRINGS = {
  es: {
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
    nightsUniform: '{n} noches × {price}€',
    nightsCustomAvg: '{n} noches ({avg}€/noche de media)',
    nightsLodging: '{n} noches',
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
  },
  en: {
    notFoundTitle: 'Property not found',
    notFoundBody: 'The property you are looking for is not available.',
    maxGuests: 'max guests',
    perNight: '/night',
    includesGuests: 'Includes {n} guest{pl}. +{fee}€/extra person/night.',
    stepDates: 'Dates',
    stepGuests: 'Guests',
    stepDetails: 'Details',
    stepPayment: 'Payment',
    selectDates: 'Select your dates',
    availabilityHint:
      'Unavailable days are hidden between {from} and {to}. We will warn you if you pick blocked dates.',
    priceSummary: 'Price summary',
    nightsUniform: '{n} nights × {price}€',
    nightsCustomAvg: '{n} nights ({avg}€/night avg.)',
    nightsLodging: '{n} nights',
    extraPersonLine: '{n} extra guest{pl} × {nights} nights × {fee}€',
    cleaningFee: 'Cleaning fee',
    total: 'Total',
    continue: 'Continue',
    back: 'Back',
    blockedInRange: 'Some nights in this range are unavailable. Choose other dates.',
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
    payWith: 'Pay {amount}€',
    processing: 'Processing…',
    errCardNotFound: 'Card not found',
    errCreatePayment: 'Error creating payment',
    errProcessPayment: 'Error processing payment',
    confirmedTitle: 'Booking confirmed!',
    confirmedBody: 'Your booking was processed. You will receive a confirmation email.',
    reservationCode: 'Booking code:',
    payLinkTitle: 'Secure payment',
    payLinkSubtitle: 'Enter your details and pay by card.',
    payLinkResource: 'Accommodation',
    payLinkDates: 'Stay',
    payLinkGuests: 'Guests',
    payLinkTotal: 'Amount due',
    payLinkPayNow: 'Pay now',
    payLinkLoading: 'Loading link…',
    payLinkInvalid: 'Invalid or unavailable link.',
    payLinkSuccessTitle: 'Payment received!',
    payLinkSuccessBody: 'Thank you. You will receive confirmation by email.',
    payLinkYourDetails: 'Your details',
    payLinkDocType: 'Document type',
    payLinkDocNumber: 'Document number',
    payLinkErrRequired: 'Please fill in name, email and phone.',
    payLinkNightsShort: '({n} nights)',
  },
  fr: {
    notFoundTitle: 'Logement introuvable',
    notFoundBody: "Le logement recherché n'est pas disponible.",
    maxGuests: 'voyageurs max.',
    perNight: '/nuit',
    includesGuests: 'Inclut {n} voyageur{pl}. +{fee}€/personne/nuit en supplément.',
    stepDates: 'Dates',
    stepGuests: 'Voyageurs',
    stepDetails: 'Coordonnées',
    stepPayment: 'Paiement',
    selectDates: 'Choisissez vos dates',
    availabilityHint:
      'Jours indisponibles masqués entre {from} et {to}. Nous vous avertirons si vous choisissez une date bloquée.',
    priceSummary: 'Récapitulatif des prix',
    nightsUniform: '{n} nuits × {price}€',
    nightsCustomAvg: '{n} nuits ({avg}€/nuit en moyenne)',
    nightsLodging: '{n} nuits',
    extraPersonLine: '{n} personne{pl} en plus × {nights} nuits × {fee}€',
    cleaningFee: 'Frais de ménage',
    total: 'Total',
    continue: 'Continuer',
    back: 'Retour',
    blockedInRange: 'Des nuits sont indisponibles sur cette période. Choisissez d’autres dates.',
    monthTitle: '{m1} · {m2}',
    selectedRange: 'Sélection :',
    selectCheckIn: "Date d'arrivée",
    weekdays: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
    guestCountTitle: 'Nombre de voyageurs',
    guestsLabel: 'Voyageurs',
    guestOption: '{n} voyageur{pl}',
    guestDetailsTitle: 'Coordonnées du voyageur',
    fullName: 'Nom complet *',
    email: 'E-mail *',
    phone: 'Téléphone',
    nationality: 'Nationalité',
    specialRequests: 'Demandes spéciales',
    specialPlaceholder: 'Une demande particulière…',
    continueToPay: 'Continuer vers le paiement',
    payTitle: 'Confirmer et payer',
    bookingSummary: 'Récapitulatif',
    property: 'Logement :',
    dates: 'Dates :',
    guests: 'Voyageurs :',
    nights: 'Nuits :',
    cardLabel: 'Carte bancaire *',
    payWith: 'Payer {amount}€',
    processing: 'Traitement…',
    errCardNotFound: 'Carte introuvable',
    errCreatePayment: 'Erreur lors de la création du paiement',
    errProcessPayment: 'Erreur lors du paiement',
    confirmedTitle: 'Réservation confirmée !',
    confirmedBody: 'Votre réservation a été enregistrée. Vous recevrez un e-mail de confirmation.',
    reservationCode: 'Code de réservation :',
    payLinkTitle: 'Paiement sécurisé',
    payLinkSubtitle: 'Complétez vos informations et payez par carte.',
    payLinkResource: 'Hébergement',
    payLinkDates: 'Séjour',
    payLinkGuests: 'Voyageurs',
    payLinkTotal: 'À payer',
    payLinkPayNow: 'Payer maintenant',
    payLinkLoading: 'Chargement du lien…',
    payLinkInvalid: 'Lien invalide ou indisponible.',
    payLinkSuccessTitle: 'Paiement reçu !',
    payLinkSuccessBody: 'Merci. Vous recevrez une confirmation par e-mail.',
    payLinkYourDetails: 'Vos coordonnées',
    payLinkDocType: 'Type de document',
    payLinkDocNumber: 'Numéro de document',
    payLinkErrRequired: 'Renseignez nom, e-mail et téléphone.',
    payLinkNightsShort: '({n} nuits)',
  },
  it: {
    notFoundTitle: 'Alloggio non trovato',
    notFoundBody: "L'alloggio che cerchi non è disponibile.",
    maxGuests: 'ospiti max',
    perNight: '/notte',
    includesGuests: 'Include {n} ospite{pl}. +{fee}€/persona extra/notte.',
    stepDates: 'Date',
    stepGuests: 'Ospiti',
    stepDetails: 'Dati',
    stepPayment: 'Pagamento',
    selectDates: 'Seleziona le date',
    availabilityHint:
      'Giorni non disponibili nascosti tra {from} e {to}. Ti avviseremo se scegli date occupate.',
    priceSummary: 'Riepilogo prezzi',
    nightsUniform: '{n} notti × {price}€',
    nightsCustomAvg: '{n} notti ({avg}€/notte in media)',
    nightsLodging: '{n} notti',
    extraPersonLine: '{n} ospite{pl} extra × {nights} notti × {fee}€',
    cleaningFee: 'Spese di pulizia',
    total: 'Totale',
    continue: 'Continua',
    back: 'Indietro',
    blockedInRange: 'Ci sono notti non disponibili nel periodo. Scegli altre date.',
    monthTitle: '{m1} · {m2}',
    selectedRange: 'Selezionato:',
    selectCheckIn: 'Data di check-in',
    weekdays: ['L', 'M', 'M', 'G', 'V', 'S', 'D'],
    guestCountTitle: 'Numero di ospiti',
    guestsLabel: 'Ospiti',
    guestOption: '{n} ospite{pl}',
    guestDetailsTitle: 'Dati ospite',
    fullName: 'Nome completo *',
    email: 'Email *',
    phone: 'Telefono',
    nationality: 'Nazionalità',
    specialRequests: 'Richieste speciali',
    specialPlaceholder: 'Qualche richiesta speciale…',
    continueToPay: 'Continua al pagamento',
    payTitle: 'Conferma e paga',
    bookingSummary: 'Riepilogo prenotazione',
    property: 'Alloggio:',
    dates: 'Date:',
    guests: 'Ospiti:',
    nights: 'Notti:',
    cardLabel: 'Carta *',
    payWith: 'Paga {amount}€',
    processing: 'Elaborazione…',
    errCardNotFound: 'Carta non trovata',
    errCreatePayment: 'Errore creazione pagamento',
    errProcessPayment: 'Errore elaborazione pagamento',
    confirmedTitle: 'Prenotazione confermata!',
    confirmedBody: 'La prenotazione è stata elaborata. Riceverai un’email di conferma.',
    reservationCode: 'Codice prenotazione:',
    payLinkTitle: 'Pagamento sicuro',
    payLinkSubtitle: 'Inserisci i dati e paga con carta.',
    payLinkResource: 'Alloggio',
    payLinkDates: 'Soggiorno',
    payLinkGuests: 'Ospiti',
    payLinkTotal: 'Da pagare',
    payLinkPayNow: 'Paga ora',
    payLinkLoading: 'Caricamento link…',
    payLinkInvalid: 'Link non valido o non disponibile.',
    payLinkSuccessTitle: 'Pagamento ricevuto!',
    payLinkSuccessBody: 'Grazie. Riceverai conferma via email.',
    payLinkYourDetails: 'I tuoi dati',
    payLinkDocType: 'Tipo documento',
    payLinkDocNumber: 'Numero documento',
    payLinkErrRequired: 'Compila nome, email e telefono.',
    payLinkNightsShort: '({n} notti)',
  },
  pt: {
    notFoundTitle: 'Alojamento não encontrado',
    notFoundBody: 'O alojamento que procura não está disponível.',
    maxGuests: 'hóspedes máx.',
    perNight: '/noite',
    includesGuests: 'Inclui {n} hóspede{pl}. +{fee}€/pessoa extra/noite.',
    stepDates: 'Datas',
    stepGuests: 'Hóspedes',
    stepDetails: 'Dados',
    stepPayment: 'Pagamento',
    selectDates: 'Selecione as datas',
    availabilityHint:
      'Dias indisponíveis ocultos entre {from} e {to}. Avisamos se escolher datas ocupadas.',
    priceSummary: 'Resumo de preços',
    nightsUniform: '{n} noites × {price}€',
    nightsCustomAvg: '{n} noites ({avg}€/noite em média)',
    nightsLodging: '{n} noites',
    extraPersonLine: '{n} hóspede{pl} extra × {nights} noites × {fee}€',
    cleaningFee: 'Taxa de limpeza',
    total: 'Total',
    continue: 'Continuar',
    back: 'Voltar',
    blockedInRange: 'Há noites indisponíveis no intervalo. Escolha outras datas.',
    monthTitle: '{m1} · {m2}',
    selectedRange: 'Selecionado:',
    selectCheckIn: 'Data de entrada',
    weekdays: ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'],
    guestCountTitle: 'Número de hóspedes',
    guestsLabel: 'Hóspedes',
    guestOption: '{n} hóspede{pl}',
    guestDetailsTitle: 'Dados do hóspede',
    fullName: 'Nome completo *',
    email: 'Email *',
    phone: 'Telefone',
    nationality: 'Nacionalidade',
    specialRequests: 'Pedidos especiais',
    specialPlaceholder: 'Algum pedido especial…',
    continueToPay: 'Continuar para pagamento',
    payTitle: 'Confirmar e pagar',
    bookingSummary: 'Resumo da reserva',
    property: 'Alojamento:',
    dates: 'Datas:',
    guests: 'Hóspedes:',
    nights: 'Noites:',
    cardLabel: 'Dados do cartão *',
    payWith: 'Pagar {amount}€',
    processing: 'A processar…',
    errCardNotFound: 'Cartão não encontrado',
    errCreatePayment: 'Erro ao criar pagamento',
    errProcessPayment: 'Erro ao processar pagamento',
    confirmedTitle: 'Reserva confirmada!',
    confirmedBody: 'A reserva foi processada. Receberá um email de confirmação.',
    reservationCode: 'Código da reserva:',
    payLinkTitle: 'Pagamento seguro',
    payLinkSubtitle: 'Preencha os dados e pague com cartão.',
    payLinkResource: 'Alojamento',
    payLinkDates: 'Estadia',
    payLinkGuests: 'Hóspedes',
    payLinkTotal: 'A pagar',
    payLinkPayNow: 'Pagar agora',
    payLinkLoading: 'A carregar link…',
    payLinkInvalid: 'Link inválido ou indisponível.',
    payLinkSuccessTitle: 'Pagamento recebido!',
    payLinkSuccessBody: 'Obrigado. Receberá confirmação por email.',
    payLinkYourDetails: 'Os seus dados',
    payLinkDocType: 'Tipo de documento',
    payLinkDocNumber: 'Número do documento',
    payLinkErrRequired: 'Preencha nome, email e telefone.',
    payLinkNightsShort: '({n} noites)',
  },
  fi: {
    notFoundTitle: 'Majoitusta ei löydy',
    notFoundBody: 'Etsimäsi majoitus ei ole saatavilla.',
    maxGuests: 'max vierasta',
    perNight: '/yö',
    includesGuests: 'Sisältää {n} vieras{pl}. +{fee}€/lisähenkilö/yö.',
    stepDates: 'Päivät',
    stepGuests: 'Vieraat',
    stepDetails: 'Tiedot',
    stepPayment: 'Maksu',
    selectDates: 'Valitse päivät',
    availabilityHint:
      'Varatut päivät piilotettu välillä {from}–{to}. Varoitamme, jos valitset estetyn päivän.',
    priceSummary: 'Hintayhteenveto',
    nightsUniform: '{n} yötä × {price}€',
    nightsCustomAvg: '{n} yötä ({avg}€/yö keskim.)',
    nightsLodging: '{n} yötä',
    extraPersonLine: '{n} lisävieras{pl} × {nights} yötä × {fee}€',
    cleaningFee: 'Siivousmaksu',
    total: 'Yhteensä',
    continue: 'Jatka',
    back: 'Takaisin',
    blockedInRange: 'Valitulla jaksolla on varattuja öitä. Valitse toiset päivät.',
    monthTitle: '{m1} · {m2}',
    selectedRange: 'Valittu:',
    selectCheckIn: 'Valitse sisäänkirjautuminen',
    weekdays: ['M', 'T', 'K', 'T', 'P', 'L', 'S'],
    guestCountTitle: 'Vieraiden määrä',
    guestsLabel: 'Vieraat',
    guestOption: '{n} vieras{pl}',
    guestDetailsTitle: 'Vieraan tiedot',
    fullName: 'Koko nimi *',
    email: 'Sähköposti *',
    phone: 'Puhelin',
    nationality: 'Kansalaisuus',
    specialRequests: 'Erityistoiveet',
    specialPlaceholder: 'Erityistoive…',
    continueToPay: 'Jatka maksuun',
    payTitle: 'Vahvista ja maksa',
    bookingSummary: 'Varauksen yhteenveto',
    property: 'Majoitus:',
    dates: 'Päivät:',
    guests: 'Vieraat:',
    nights: 'Yöt:',
    cardLabel: 'Korttitiedot *',
    payWith: 'Maksa {amount}€',
    processing: 'Käsitellään…',
    errCardNotFound: 'Korttia ei löydy',
    errCreatePayment: 'Maksun luonti epäonnistui',
    errProcessPayment: 'Maksun käsittely epäonnistui',
    confirmedTitle: 'Varaus vahvistettu!',
    confirmedBody: 'Varaus on käsitelty. Saat vahvistuksen sähköpostitse.',
    reservationCode: 'Varauskoodi:',
    payLinkTitle: 'Turvallinen maksu',
    payLinkSubtitle: 'Täytä tiedot ja maksa kortilla.',
    payLinkResource: 'Majoitus',
    payLinkDates: 'Oleskelu',
    payLinkGuests: 'Vieraat',
    payLinkTotal: 'Maksettava',
    payLinkPayNow: 'Maksa nyt',
    payLinkLoading: 'Ladataan linkkiä…',
    payLinkInvalid: 'Linkki ei kelpaa tai ei ole saatavilla.',
    payLinkSuccessTitle: 'Maksu vastaanotettu!',
    payLinkSuccessBody: 'Kiitos. Saat vahvistuksen sähköpostitse.',
    payLinkYourDetails: 'Tietosi',
    payLinkDocType: 'Asiakirjan tyyppi',
    payLinkDocNumber: 'Asiakirjan numero',
    payLinkErrRequired: 'Täytä nimi, sähköposti ja puhelin.',
    payLinkNightsShort: '({n} yötä)',
  },
} as const;

export type BookGuestStrings = (typeof GUEST_STRINGS)['es'];

const BOOK_LOCALE_TO_INTL: Record<BookLocale, string> = {
  es: 'es-ES',
  en: 'en-GB',
  fr: 'fr-FR',
  it: 'it-IT',
  pt: 'pt-PT',
  fi: 'fi-FI',
};

export function bookLocaleToIntl(locale: BookLocale): string {
  return BOOK_LOCALE_TO_INTL[locale] ?? 'es-ES';
}

export function resolveBookLocale(
  langParam?: string | null,
  acceptLanguage?: string | null
): BookLocale {
  const raw = (langParam || '').trim().toLowerCase().split('-')[0];
  if (BOOK_LOCALES.includes(raw as BookLocale)) return raw as BookLocale;
  const al = (acceptLanguage || '').toLowerCase();
  for (const loc of BOOK_LOCALES) {
    if (al.includes(loc)) return loc;
  }
  return 'es';
}

export function getBookStrings(locale: BookLocale = 'es'): BookGuestStrings {
  return GUEST_STRINGS[locale];
}

/** Sustituye {key} en plantillas simples */
export function bookFmt(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

export function parseEuroAmount(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function formatEuroAmount(v: unknown): string {
  return parseEuroAmount(v).toFixed(2);
}

export type BookPricingLine = {
  nights?: number;
  base_amount?: number | string;
  base_price?: number | string;
  subtotal?: number | string;
  guest_total?: number | string;
  total_amount?: number | string;
  uniform_nightly?: boolean;
  average_nightly?: number | string;
};

/** Etiqueta izquierda del desglose de alojamiento (coherente con importe derecho). */
export function lodgingLineLabel(
  s: BookGuestStrings,
  pricing: BookPricingLine,
  fallbackBasePrice: number
): string {
  const nights = Number(pricing.nights ?? 0);
  const baseAmount = parseEuroAmount(pricing.base_amount);
  const basePrice = parseEuroAmount(pricing.base_price ?? fallbackBasePrice);
  const uniform =
    pricing.uniform_nightly === true ||
    (nights > 0 && Math.abs(baseAmount - basePrice * nights) < 0.02);
  if (uniform && nights > 0) {
    return bookFmt(s.nightsUniform, { n: nights, price: basePrice.toFixed(2) });
  }
  const avg =
    parseEuroAmount(pricing.average_nightly) ||
    (nights > 0 ? baseAmount / nights : basePrice);
  if (nights > 0 && baseAmount > 0) {
    return bookFmt(s.nightsCustomAvg, { n: nights, avg: avg.toFixed(2) });
  }
  return bookFmt(s.nightsLodging, { n: nights });
}

/** Total que paga el huésped (alojamiento + limpieza + extras). */
export function guestPayableTotal(pricing: BookPricingLine): string {
  const sub = parseEuroAmount(pricing.subtotal);
  if (sub > 0) return sub.toFixed(2);
  const guest = parseEuroAmount(pricing.guest_total);
  if (guest > 0) return guest.toFixed(2);
  return formatEuroAmount(pricing.total_amount);
}
