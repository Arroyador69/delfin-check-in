export type GuestMailLocale = 'es' | 'en' | 'it' | 'pt' | 'fr';

const SUPPORTED: GuestMailLocale[] = ['es', 'en', 'it', 'pt', 'fr'];

export function normalizeGuestMailLocale(raw: string | null | undefined): GuestMailLocale {
  const l = String(raw || 'es').toLowerCase().split('-')[0];
  if ((SUPPORTED as string[]).includes(l)) return l as GuestMailLocale;
  return 'es';
}

function localeTag(loc: GuestMailLocale): string {
  const map: Record<GuestMailLocale, string> = {
    es: 'es-ES',
    en: 'en-GB',
    it: 'it-IT',
    pt: 'pt-PT',
    fr: 'fr-FR',
  };
  return map[loc];
}

export function buildPmsCheckinInstructionsEmail(params: {
  locale: GuestMailLocale;
  guestName: string;
  propertyLabel: string;
  checkIn: Date;
  checkOut: Date;
  guestCount: number;
  instructionsHtml: string;
  publicFormUrl: string;
  /** Página pública Guest Hub (por unidad), si está activa en la propiedad enlazada al room */
  guestHubUrl?: string;
  contactEmail: string;
  contactPhone: string;
  contactName: string;
  trackingPixelUrl?: string;
}) {
  const loc = params.locale;
  const ci = params.checkIn.toLocaleDateString(localeTag(loc), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const co = params.checkOut.toLocaleDateString(localeTag(loc), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const T = {
    subject: {
      es: `📬 Instrucciones de check-in · ${params.propertyLabel}`,
      en: `📬 Check-in instructions · ${params.propertyLabel}`,
      it: `📬 Istruzioni check-in · ${params.propertyLabel}`,
      pt: `📬 Instruções de check-in · ${params.propertyLabel}`,
      fr: `📬 Instructions d’arrivée · ${params.propertyLabel}`,
    },
    title: {
      es: 'Instrucciones de check-in',
      en: 'Check-in instructions',
      it: 'Istruzioni check-in',
      pt: 'Instruções de check-in',
      fr: 'Instructions d’arrivée',
    },
    sub: {
      es: (p: string) => `${p}`,
      en: (p: string) => `${p}`,
      it: (p: string) => `${p}`,
      pt: (p: string) => `${p}`,
      fr: (p: string) => `${p}`,
    },
    hello: {
      es: (n: string) =>
        `<p>Hola <strong>${n}</strong>, aquí tienes la información para tu llegada.</p>`,
      en: (n: string) =>
        `<p>Hello <strong>${n}</strong>, here is the information for your arrival.</p>`,
      it: (n: string) =>
        `<p>Ciao <strong>${n}</strong>, ecco le informazioni per il tuo arrivo.</p>`,
      pt: (n: string) =>
        `<p>Olá <strong>${n}</strong>, segue a informação para a sua chegada.</p>`,
      fr: (n: string) =>
        `<p>Bonjour <strong>${n}</strong>, voici les informations pour votre arrivée.</p>`,
    },
    dates: {
      es: (a: string, b: string, g: number) =>
        `<p><strong>Fechas:</strong> ${a} → ${b} · <strong>Personas:</strong> ${g}</p>`,
      en: (a: string, b: string, g: number) =>
        `<p><strong>Dates:</strong> ${a} → ${b} · <strong>Guests:</strong> ${g}</p>`,
      it: (a: string, b: string, g: number) =>
        `<p><strong>Date:</strong> ${a} → ${b} · <strong>Ospiti:</strong> ${g}</p>`,
      pt: (a: string, b: string, g: number) =>
        `<p><strong>Datas:</strong> ${a} → ${b} · <strong>Pessoas:</strong> ${g}</p>`,
      fr: (a: string, b: string, g: number) =>
        `<p><strong>Dates :</strong> ${a} → ${b} · <strong>Personnes :</strong> ${g}</p>`,
    },
    spamHint: {
      es: 'Si no ves este email correctamente, revisa la carpeta de spam.',
      en: 'If this email looks wrong, please check your spam folder.',
      it: 'Se l’email non si visualizza bene, controlla la cartella spam.',
      pt: 'Se o e-mail não aparecer bem, verifique a pasta de spam.',
      fr: 'Si l’e-mail s’affiche mal, vérifiez votre dossier spam.',
    },
    regTitle: {
      es: 'Recordatorio: registro de viajeros',
      en: 'Reminder: traveller registration',
      it: 'Promemoria: registrazione ospiti',
      pt: 'Lembrete: registo de viajantes',
      fr: 'Rappel : enregistrement des voyageurs',
    },
    regBody: {
      es: 'Si aún no lo has hecho, completa el formulario obligatorio antes de tu llegada:',
      en: 'If you have not done so yet, please complete the mandatory form before arrival:',
      it: 'Se non l’hai ancora fatto, completa il modulo obbligatorio prima dell’arrivo:',
      pt: 'Se ainda não o fez, preencha o formulário obrigatório antes da chegada:',
      fr: 'Si ce n’est pas encore fait, complétez le formulaire obligatoire avant l’arrivée :',
    },
    regBtn: {
      es: 'Rellenar formulario',
      en: 'Open form',
      it: 'Apri modulo',
      pt: 'Abrir formulário',
      fr: 'Ouvrir le formulaire',
    },
    hubTitle: {
      es: 'Página para tu estancia (Guest Hub)',
      en: 'Your stay page (Guest Hub)',
      it: 'Pagina del soggiorno (Guest Hub)',
      pt: 'Página da estadia (Guest Hub)',
      fr: 'Page pour votre séjour (Guest Hub)',
    },
    hubBody: {
      es: 'Un solo enlace con WhatsApp del alojamiento e instrucciones útiles en el móvil (navegador). No sustituye el registro de viajeros ni el email anterior.',
      en: 'One link with the property WhatsApp and useful instructions on your phone (browser). It does not replace traveller registration or the sections above.',
      it: 'Un solo link con WhatsApp e istruzioni utili sul telefono (browser). Non sostituisce la registrazione ospiti.',
      pt: 'Uma ligação com WhatsApp e instruções úteis no telemóvel (browser). Não substitui o registo de hóspedes.',
      fr: 'Un seul lien avec WhatsApp et consignes utiles sur mobile (navigateur). Ne remplace pas l’enregistrement des voyageurs.',
    },
    hubBtn: {
      es: 'Abrir página del huésped',
      en: 'Open guest page',
      it: 'Apri pagina ospite',
      pt: 'Abrir página do hóspede',
      fr: 'Ouvrir la page invité',
    },
    cancelTitle: {
      es: '¿Necesitas cancelar tu reserva?',
      en: 'Need to cancel your booking?',
      it: 'Devi cancellare la prenotazione?',
      pt: 'Precisa de cancelar a reserva?',
      fr: 'Besoin d’annuler votre réservation ?',
    },
    cancelBody: {
      es: 'Puedes hacerlo desde nuestro sistema.',
      en: 'You can do it through our system.',
      it: 'Puoi farlo dal nostro sistema.',
      pt: 'Pode fazê-lo no nosso sistema.',
      fr: 'Vous pouvez le faire via notre système.',
    },
    cancelBtn: {
      es: 'Cancelar reserva',
      en: 'Cancel booking',
      it: 'Cancella prenotazione',
      pt: 'Cancelar reserva',
      fr: 'Annuler la réservation',
    },
    cancelPolicy: {
      es: 'Política: cancelación con al menos 1 día de antelación · Reembolso según condiciones.',
      en: 'Policy: cancel at least 1 day before · Refund subject to terms.',
      it: 'Politica: cancellazione con almeno 1 giorno di anticipo · Rimborso secondo condizioni.',
      pt: 'Política: cancelar com pelo menos 1 dia de antecedência · Reembolso conforme condições.',
      fr: 'Politique : annulation au moins 1 jour avant · Remboursement selon conditions.',
    },
    contactTitle: {
      es: 'Contacto',
      en: 'Contact',
      it: 'Contatto',
      pt: 'Contacto',
      fr: 'Contact',
    },
    contactIntro: {
      es: (n: string) => `Para cualquier duda, contacta con <strong>${n}</strong>:`,
      en: (n: string) => `For any questions, contact <strong>${n}</strong>:`,
      it: (n: string) => `Per dubbi, contatta <strong>${n}</strong>:`,
      pt: (n: string) => `Para dúvidas, contacte <strong>${n}</strong>:`,
      fr: (n: string) => `Pour toute question, contactez <strong>${n}</strong> :`,
    },
    emailLbl: { es: 'Email:', en: 'Email:', it: 'Email:', pt: 'Email:', fr: 'E-mail :' },
    phoneLbl: {
      es: 'Teléfono:',
      en: 'Phone:',
      it: 'Telefono:',
      pt: 'Telefone:',
      fr: 'Téléphone :',
    },
    openNote: {
      es: 'Apertura del correo: indicador aproximado (puede variar según el cliente de email).',
      en: 'Email open: approximate indicator (may vary by email client).',
      it: 'Apertura email: indicatore approssimativo.',
      pt: 'Abertura do e-mail: indicador aproximado.',
      fr: 'Ouverture de l’e-mail : indicateur approximatif.',
    },
  } as const;

  const pixel = params.trackingPixelUrl
    ? `<img src="${params.trackingPixelUrl}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px" />`
    : '';

  const html = `
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:640px;margin:0 auto;padding:20px}.header{background:#0ea5e9;color:#fff;padding:24px;border-radius:12px 12px 0 0}.content{background:#f8fafc;padding:24px;border-radius:0 0 12px 12px}.section{background:#fff;padding:16px 20px;border-radius:10px;margin:14px 0}.muted{color:#64748b;font-size:12px}</style>
      </head><body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0">${T.title[loc]}</h1>
            <p style="margin:6px 0 0">${T.sub[loc](params.propertyLabel)}</p>
          </div>
          <div class="content">
            <div class="section">
              ${T.hello[loc](params.guestName)}
              ${T.dates[loc](ci, co, params.guestCount)}
              <p class="muted">${T.spamHint[loc]}</p>
            </div>
            <div class="section">${params.instructionsHtml}</div>
            ${
              params.guestHubUrl
                ? `<div class="section" style="background:#ecfdf5;border-left:4px solid #059669">
              <h3 style="margin-top:0">${T.hubTitle[loc]}</h3>
              <p>${T.hubBody[loc]}</p>
              <p><a href="${params.guestHubUrl}" target="_blank" style="background:#059669;color:white;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block">${T.hubBtn[loc]}</a></p>
            </div>`
                : ''
            }
            <div class="section" style="background:#fff7ed;border-left:4px solid #f59e0b">
              <h3>${T.regTitle[loc]}</h3>
              <p>${T.regBody[loc]}</p>
              <p><a href="${params.publicFormUrl}" target="_blank" style="background:#22c55e;color:white;padding:10px 16px;border-radius:8px;text-decoration:none">${T.regBtn[loc]}</a></p>
            </div>
            <div class="section" style="background:#fee2e2;border-left:4px solid #ef4444">
              <h3>${T.cancelTitle[loc]}</h3>
              <p>${T.cancelBody[loc]}</p>
              <p style="margin:12px 0"><a href="https://book.delfincheckin.com/cancelar" target="_blank" style="background:#dc3545;color:white;padding:10px 16px;border-radius:8px;text-decoration:none">${T.cancelBtn[loc]}</a></p>
              <p class="muted">${T.cancelPolicy[loc]}</p>
            </div>
            <div class="section">
              <h3>${T.contactTitle[loc]}</h3>
              <p>${T.contactIntro[loc](params.contactName)}</p>
              <p><strong>${T.emailLbl[loc]}</strong> ${params.contactEmail}<br/><strong>${T.phoneLbl[loc]}</strong> ${params.contactPhone || '—'}</p>
            </div>
            <p class="muted">${T.openNote[loc]}</p>
            ${pixel}
          </div>
        </div>
      </body></html>
    `;

  const hubLine = params.guestHubUrl
    ? `${T.hubTitle[loc]}: ${params.guestHubUrl}\n`
    : '';
  const text = `${T.title[loc]} — ${params.propertyLabel}\n\n${ci} → ${co}\n${hubLine}${T.regBtn[loc]}: ${params.publicFormUrl}\n`;

  return {
    subject: T.subject[loc],
    html,
    text,
  };
}
