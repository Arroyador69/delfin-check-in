import nodemailer from 'nodemailer';
import { sql } from '@/lib/db';
import { buildAntivirusHelpUrl } from '@/lib/onboarding-magic-link';

// Usar el mismo transporter que funciona en booking (email-notifications.ts)
// Esto asegura consistencia y que funcione igual que los emails de reservas
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD,
  },
});

export function getTransport() {
  // Validar que SMTP esté configurado
  const host = process.env.SMTP_HOST || '';
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '';

  if (!host || !user || !pass) {
    const missing = [];
    if (!host) missing.push('SMTP_HOST');
    if (!user) missing.push('SMTP_USER');
    if (!pass) missing.push('SMTP_PASS o SMTP_PASSWORD');
    
    throw new Error(`❌ SMTP no configurado correctamente. Faltan: ${missing.join(', ')}`);
  }

  return transporter;
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export type OnboardingEmailVariant = 'default' | 'waitlist_launch' | 'web_plan_paid';

function normalizeOnboardingVariant(v?: OnboardingEmailVariant): OnboardingEmailVariant {
  if (v === 'waitlist_launch' || v === 'web_plan_paid') return v;
  return 'default';
}

type EmailLocale = 'es' | 'en' | 'it' | 'pt' | 'fr' | 'fi' | 'sv';

/** Texto de los 6 pasos del onboarding (HTML inline para clientes de correo). */
const ONBOARDING_STEPS_HTML: Record<EmailLocale, string> = {
  es: '<strong>1.</strong> Contraseña de acceso &nbsp;·&nbsp; <strong>2.</strong> Datos del negocio &nbsp;·&nbsp; <strong>3.</strong> Plan &nbsp;·&nbsp; <strong>4.</strong> MIR (opcional) &nbsp;·&nbsp; <strong>5.</strong> Primera propiedad &nbsp;·&nbsp; <strong>6.</strong> Cobros',
  en: '<strong>1.</strong> Password &nbsp;·&nbsp; <strong>2.</strong> Business details &nbsp;·&nbsp; <strong>3.</strong> Plan &nbsp;·&nbsp; <strong>4.</strong> MIR (optional) &nbsp;·&nbsp; <strong>5.</strong> First property &nbsp;·&nbsp; <strong>6.</strong> Payouts',
  it: '<strong>1.</strong> Password &nbsp;·&nbsp; <strong>2.</strong> Dati aziendali &nbsp;·&nbsp; <strong>3.</strong> Piano &nbsp;·&nbsp; <strong>4.</strong> MIR (opzionale) &nbsp;·&nbsp; <strong>5.</strong> Prima proprietà &nbsp;·&nbsp; <strong>6.</strong> Pagamenti',
  pt: '<strong>1.</strong> Palavra-passe &nbsp;·&nbsp; <strong>2.</strong> Dados do negócio &nbsp;·&nbsp; <strong>3.</strong> Plano &nbsp;·&nbsp; <strong>4.</strong> MIR (opcional) &nbsp;·&nbsp; <strong>5.</strong> Primeira propriedade &nbsp;·&nbsp; <strong>6.</strong> Cobranças',
  fr: '<strong>1.</strong> Mot de passe &nbsp;·&nbsp; <strong>2.</strong> Infos entreprise &nbsp;·&nbsp; <strong>3.</strong> Forfait &nbsp;·&nbsp; <strong>4.</strong> MIR (optionnel) &nbsp;·&nbsp; <strong>5.</strong> Premier logement &nbsp;·&nbsp; <strong>6.</strong> Paiements',
  fi: '<strong>1.</strong> Salasana &nbsp;·&nbsp; <strong>2.</strong> Yritystiedot &nbsp;·&nbsp; <strong>3.</strong> Paketti &nbsp;·&nbsp; <strong>4.</strong> MIR (valinnainen) &nbsp;·&nbsp; <strong>5.</strong> Ensimmäinen kohde &nbsp;·&nbsp; <strong>6.</strong> Maksut',
  sv: '<strong>1.</strong> Lösenord &nbsp;·&nbsp; <strong>2.</strong> Företagsuppgifter &nbsp;·&nbsp; <strong>3.</strong> Plan &nbsp;·&nbsp; <strong>4.</strong> MIR (valfritt) &nbsp;·&nbsp; <strong>5.</strong> Första boendet &nbsp;·&nbsp; <strong>6.</strong> Utbetalningar',
};

function normalizeEmailLocale(loc?: string | null): EmailLocale {
  const v = String(loc || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');
  const base = v.split('-')[0] || '';
  if (base === 'es' || base === 'en' || base === 'it' || base === 'pt' || base === 'fr' || base === 'fi' || base === 'sv') {
    return base;
  }
  return 'es';
}

function guessLocaleFromOnboardingUrl(onboardingUrl: string): EmailLocale {
  try {
    const u = new URL(onboardingUrl);
    const m = u.pathname.match(/^\/([a-z]{2})\//i);
    if (m?.[1]) return normalizeEmailLocale(m[1]);
  } catch {
    // ignore
  }
  return 'es';
}

function onboardingEmailCopy(locale: EmailLocale, variant: OnboardingEmailVariant) {
  const base = {
    es: {
      subject: {
        waitlist_launch: '🐬 Delfín Check-in: tu cuenta está lista — empieza gratis',
        web_plan_paid: '🐬 Delfín Check-in: pago confirmado — termina tu configuración',
        default: '🐬 Delfín Check-in: configura tu alojamiento en 6 pasos',
      },
      heroTitle: {
        waitlist_launch: 'Bienvenido a Delfín Check-in',
        web_plan_paid: 'Pago confirmado — ya casi está',
        default: 'Configuración guiada en 6 pasos',
      },
      heroSubtitle: {
        waitlist_launch: 'Plan gratuito con 1 propiedad · panel web adaptado a móvil',
        web_plan_paid: 'Tu plan ya está activo · un último paso en el panel',
        default: 'Contraseña, datos, plan, MIR, propiedad y cobros — desde el móvil también',
      },
      bodyHeading: {
        waitlist_launch: '¡Gracias por registrarte!',
        web_plan_paid: 'Continúa donde lo dejaste',
        default: 'Tu cuenta en Delfín Check-in está lista',
      },
      bodyLead: {
        waitlist_launch:
          'Hemos activado tu acceso en <strong>admin.delfincheckin.com</strong>. Pulsa el botón y sigue el asistente: primero crearás tu <strong>contraseña</strong> y después completarás los datos de tu alojamiento. Puedes empezar con el <strong>plan gratuito (1 propiedad)</strong> o contratar un plan de pago cuando quieras.',
        web_plan_paid:
          'Gracias por contratar Delfín Check-in. Tu suscripción ya está activa (gestión segura en la web con Polar). Abre el enlace, define tu <strong>contraseña</strong> si aún no lo hiciste y termina el asistente: datos del negocio, unidades, MIR y cobros.',
        default:
          'Tu cuenta ya está creada. El asistente del panel te guía en <strong>6 pasos</strong> (móvil u ordenador): contraseña, datos del alojamiento, plan, credenciales MIR, primera propiedad y cobros opcionales. Pulsa el botón para continuar:',
      },
      cta: 'Comenzar onboarding',
      importantTitle: 'Importante:',
      importantBody:
        'si no ves este correo en la bandeja de entrada, revisa <strong>Spam</strong> o <strong>Promociones</strong> y márcalo como correo deseado.',
      fallbackLine: 'Si el botón no funciona, copia y pega este enlace en el navegador:',
      antivirusTitle: '¿Tu antivirus (Avast u otro) bloquea el enlace?',
      antivirusBody:
        'A veces marcan por error los enlaces de activación. Es el panel oficial de Delfín Check-in en <strong>admin.delfincheckin.com</strong>, no es phishing.',
      antivirusHelpLink: 'Ver guía paso a paso',
      autoMsg: 'Este mensaje es automático; por favor no respondas a este correo.',
      tempPwdTitle: 'Contraseña temporal:',
      tempPwdHint: 'En el paso 1 del asistente podrás cambiarla por la que prefieras.',
      text: {
        waitlist_launch: (url: string, pwd?: string) =>
          [
            '🐬 Delfín Check-in — tu cuenta está lista',
            '',
            'Gracias por registrarte en delfincheckin.com. Tu acceso en producción ya está activo.',
            '',
            'Pasos del asistente: 1) Contraseña  2) Datos del negocio  3) Plan  4) MIR (opcional)  5) Primera propiedad  6) Cobros',
            '',
            'Enlace al panel (móvil u ordenador):',
            url,
            '',
            pwd ? `Contraseña temporal (paso 1): ${pwd}` : '',
            'El panel web está adaptado al móvil. Las apps nativas para tiendas están en revisión.',
            '',
            'Si no ves el correo, revisa Spam o Promociones.',
            '',
            `© ${new Date().getFullYear()} Delfín Check-in`,
          ]
            .filter(Boolean)
            .join('\n'),
        web_plan_paid: (url: string, pwd?: string) =>
          [
            '🐬 Delfín Check-in — suscripción activa',
            '',
            'Tu pago se ha confirmado. Termina la configuración en el panel:',
            '',
            'Pasos: contraseña → datos del negocio → plan (ya activo) → MIR → propiedad → cobros',
            '',
            url,
            '',
            pwd ? `Contraseña temporal: ${pwd}` : '',
            'La facturación recurrente se gestiona en la web (Polar).',
            '',
            'Si no ves el correo, revisa Spam o Promociones.',
            '',
            `© ${new Date().getFullYear()} Delfín Check-in`,
          ]
            .filter(Boolean)
            .join('\n'),
        default: (url: string, pwd?: string) =>
          [
            '🐬 Bienvenido a Delfín Check-in',
            '',
            'Tu cuenta ha sido creada exitosamente. Para completar tu configuración inicial, visita:',
            '',
            url,
            '',
            pwd ? `Contraseña temporal: ${pwd}` : '',
            '',
            'Si tienes problemas, revisa tu carpeta de Spam/Correo no deseado.',
            '',
            `© ${new Date().getFullYear()} Delfín Check-in`,
          ]
            .filter(Boolean)
            .join('\n'),
      },
    },
    en: {
      subject: {
        waitlist_launch: '🐬 Delfín Check-in: your account is ready — start free',
        web_plan_paid: '🐬 Delfín Check-in: payment confirmed — finish setup',
        default: '🐬 Delfín Check-in: set up your property in 6 steps',
      },
      heroTitle: {
        waitlist_launch: 'Welcome to Delfín Check-in',
        web_plan_paid: 'Payment confirmed — almost there',
        default: 'Guided setup in 6 steps',
      },
      heroSubtitle: {
        waitlist_launch: 'Free plan with 1 property · mobile-friendly web dashboard',
        web_plan_paid: 'Your plan is active · one last step in the dashboard',
        default: 'Password, details, plan, MIR, property and payouts — on mobile too',
      },
      bodyHeading: {
        waitlist_launch: 'Thanks for signing up!',
        web_plan_paid: 'Continue where you left off',
        default: 'Your Delfín Check-in account is ready',
      },
      bodyLead: {
        waitlist_launch:
          'Your access at <strong>admin.delfincheckin.com</strong> is active. Tap the button and follow the wizard: first set your <strong>password</strong>, then complete your property details. Start on the <strong>free plan (1 property)</strong> or upgrade anytime.',
        web_plan_paid:
          'Thanks for subscribing. Your plan is already active (secure billing on the web with Polar). Open the link, set your <strong>password</strong> if needed, and finish: business details, units, MIR and payouts.',
        default:
          'Your account is ready. The dashboard wizard has <strong>6 steps</strong> (mobile or desktop): password, property details, plan, MIR credentials, first unit, optional payouts. Tap below to continue:',
      },
      cta: 'Start onboarding',
      importantTitle: 'Important:',
      importantBody:
        "if you don't see this email in your inbox, check <strong>Spam</strong> or <strong>Promotions</strong> and mark it as safe.",
      fallbackLine: "If the button doesn't work, copy and paste this link into your browser:",
      antivirusTitle: 'Is your antivirus (Avast, etc.) blocking the link?',
      antivirusBody:
        'Activation links are sometimes flagged by mistake. This is the official Delfín Check-in dashboard at <strong>admin.delfincheckin.com</strong> — not phishing.',
      antivirusHelpLink: 'Step-by-step guide',
      autoMsg: 'This is an automated message; please do not reply.',
      tempPwdTitle: 'Temporary password:',
      tempPwdHint: 'You can change it in step 1 of the wizard.',
      text: {
        waitlist_launch: (url: string, pwd?: string) =>
          [
            '🐬 Delfín Check-in — your account is ready',
            '',
            'Thanks for signing up at delfincheckin.com. Your production access is active.',
            '',
            'Wizard steps: 1) Password  2) Business details  3) Plan  4) MIR (optional)  5) First property  6) Payouts',
            '',
            'Dashboard link (mobile or desktop):',
            url,
            '',
            pwd ? `Temporary password (step 1): ${pwd}` : '',
            'The web dashboard works on mobile. Native store apps are under review.',
            '',
            "If you don't see the email, check Spam or Promotions.",
            '',
            `© ${new Date().getFullYear()} Delfín Check-in`,
          ]
            .filter(Boolean)
            .join('\n'),
        web_plan_paid: (url: string, pwd?: string) =>
          [
            '🐬 Delfín Check-in — subscription active',
            '',
            'Your payment is confirmed. Finish setup in the dashboard:',
            '',
            'Steps: password → business details → plan (active) → MIR → property → payouts',
            '',
            url,
            '',
            pwd ? `Temporary password: ${pwd}` : '',
            'Recurring billing is handled on the web (Polar).',
            '',
            "If you don't see the email, check Spam or Promotions.",
            '',
            `© ${new Date().getFullYear()} Delfín Check-in`,
          ]
            .filter(Boolean)
            .join('\n'),
        default: (url: string, pwd?: string) =>
          [
            '🐬 Welcome to Delfín Check-in',
            '',
            'Your account has been created. To complete setup, visit:',
            '',
            url,
            '',
            pwd ? `Temporary password: ${pwd}` : '',
            '',
            'If you have issues, check your Spam folder.',
            '',
            `© ${new Date().getFullYear()} Delfín Check-in`,
          ]
            .filter(Boolean)
            .join('\n'),
      },
    },
    it: {
      subject: {
        waitlist_launch: '🐬 Delfín Check-in: il tuo account è pronto — inizia gratis',
        web_plan_paid: '🐬 Delfín Check-in: accesso confermato (abbonamento web)',
        default: '🐬 Benvenuto in Delfín Check-in — completa la configurazione',
      },
      heroTitle: {
        waitlist_launch: 'Benvenuto in Delfín Check-in',
        web_plan_paid: 'Abbonamento confermato',
        default: 'Benvenuto in Delfín Check-in',
      },
      heroSubtitle: {
        waitlist_launch: 'Piano gratuito con 1 proprietà · pannello web adatto al mobile',
        web_plan_paid: 'Ultimo passo: configura il tuo account nel pannello web',
        default: 'La tua piattaforma di gestione per strutture ricettive',
      },
      bodyHeading: {
        waitlist_launch: 'Grazie per esserti registrato!',
        web_plan_paid: 'Accedi e completa la configurazione',
        default: 'Pronto per iniziare!',
      },
      bodyLead: {
        waitlist_launch:
          'Il tuo accesso su <strong>admin.delfincheckin.com</strong> è attivo. Apri il link e segui la procedura guidata: prima la <strong>password</strong>, poi i dati della struttura. Puoi iniziare con il <strong>piano gratuito (1 proprietà)</strong> o passare a un piano a pagamento quando vuoi.',
        web_plan_paid:
          'Grazie per aver sottoscritto Delfín Check-in. Abbiamo creato il tuo spazio di lavoro: il link qui sotto apre l’<strong>onboarding</strong> (dati aziendali, unità, integrazioni). La fatturazione ricorrente è gestita in modo sicuro sul web con il nostro partner (Polar), come visto al checkout.',
        default:
          'Il tuo account è stato creato. Per completare la configurazione iniziale e accedere al pannello, usa il pulsante qui sotto:',
      },
      cta: 'Avvia onboarding',
      importantTitle: 'Importante:',
      importantBody:
        'se non trovi questa email in arrivo, controlla <strong>Spam</strong> o <strong>Promozioni</strong> e contrassegnala come sicura.',
      fallbackLine: 'Se il pulsante non funziona, copia e incolla questo link nel browser:',
      antivirusTitle: 'L’antivirus (Avast, ecc.) blocca il link?',
      antivirusBody:
        'A volte i link di attivazione sono segnalati per errore. È il pannello ufficiale Delfín Check-in su <strong>admin.delfincheckin.com</strong>, non phishing.',
      antivirusHelpLink: 'Guida passo passo',
      autoMsg: 'Questo è un messaggio automatico; per favore non rispondere.',
      tempPwdTitle: 'Password temporanea:',
      tempPwdHint: 'Potrai cambiarla durante l’onboarding.',
      text: {
        waitlist_launch: (url: string, pwd?: string) =>
          [
            '🐬 Delfín Check-in — accesso dalla lista d’attesa',
            '',
            'Ora puoi provare il software per una proprietà gratuitamente.',
            '',
            'Link per completare l’onboarding (pannello web):',
            url,
            '',
            pwd ? `Password temporanea: ${pwd}` : '',
            'App mobile: le versioni Android (Google Play) e iOS (App Store) sono in revisione; nel frattempo usa il pannello web.',
            '',
            'Se non vedi l’email, controlla Spam o Promozioni.',
            '',
            `© ${new Date().getFullYear()} Delfín Check-in`,
          ]
            .filter(Boolean)
            .join('\n'),
        web_plan_paid: (url: string, pwd?: string) =>
          [
            '🐬 Delfín Check-in — abbonamento attivo',
            '',
            'Grazie per l’abbonamento. Completa l’onboarding nel pannello web:',
            '',
            url,
            '',
            pwd ? `Password temporanea: ${pwd}` : '',
            'La fatturazione ricorrente è gestita sul web (Polar), come al checkout. L’abbonamento non viene acquistato negli store delle app.',
            '',
            'Se non vedi l’email, controlla Spam o Promozioni.',
            '',
            `© ${new Date().getFullYear()} Delfín Check-in`,
          ]
            .filter(Boolean)
            .join('\n'),
        default: (url: string, pwd?: string) =>
          [
            '🐬 Benvenuto in Delfín Check-in',
            '',
            'Il tuo account è stato creato. Per completare la configurazione, visita:',
            '',
            url,
            '',
            pwd ? `Password temporanea: ${pwd}` : '',
            '',
            'Se hai problemi, controlla la cartella Spam.',
            '',
            `© ${new Date().getFullYear()} Delfín Check-in`,
          ]
            .filter(Boolean)
            .join('\n'),
      },
    },
    pt: {
      subject: {
        waitlist_launch: '🐬 Delfín Check-in: a sua conta está pronta — comece grátis',
        web_plan_paid: '🐬 Delfín Check-in: acesso confirmado (subscrição web)',
        default: '🐬 Bem-vindo ao Delfín Check-in — conclua a configuração',
      },
      heroTitle: {
        waitlist_launch: 'Bem-vindo ao Delfín Check-in',
        web_plan_paid: 'Subscrição confirmada',
        default: 'Bem-vindo ao Delfín Check-in',
      },
      heroSubtitle: {
        waitlist_launch: 'Comece grátis com uma propriedade — guiamos o onboarding',
        web_plan_paid: 'Último passo: configure a sua conta no painel web',
        default: 'A sua plataforma de gestão de alojamentos',
      },
      bodyHeading: {
        waitlist_launch: 'Obrigado por se registar!',
        web_plan_paid: 'Aceda e conclua a configuração',
        default: 'Pronto para começar!',
      },
      bodyLead: {
        waitlist_launch:
          'O seu acesso está ativo. O painel web guia-o passo a passo (país, unidades, integrações). Pode usar o plano grátis para <strong>uma propriedade</strong> enquanto explora.',
        web_plan_paid:
          'Obrigado por subscrever o Delfín Check-in. Criámos o seu espaço de trabalho: o link abaixo abre o <strong>onboarding</strong> (dados do negócio, unidades, integrações). A faturação recorrente é gerida de forma segura na web com o nosso parceiro (Polar), como viu no checkout.',
        default:
          'A sua conta foi criada. Para concluir a configuração inicial e aceder ao painel, use o botão abaixo:',
      },
      cta: 'Iniciar onboarding',
      importantTitle: 'Importante:',
      importantBody:
        'se não vir este email na caixa de entrada, verifique <strong>Spam</strong> ou <strong>Promoções</strong> e marque-o como seguro.',
      fallbackLine: 'Se o botão não funcionar, copie e cole este link no navegador:',
      antivirusTitle: 'O seu antivírus (Avast, etc.) bloqueia o link?',
      antivirusBody:
        'Por vezes os links de ativação são marcados por engano. É o painel oficial Delfín Check-in em <strong>admin.delfincheckin.com</strong>, não é phishing.',
      antivirusHelpLink: 'Guia passo a passo',
      autoMsg: 'Esta é uma mensagem automática; por favor não responda.',
      tempPwdTitle: 'Palavra-passe temporária:',
      tempPwdHint: 'Pode alterá-la durante o onboarding.',
      text: {
        waitlist_launch: (url: string, pwd?: string) =>
          [
            '🐬 Delfín Check-in — a sua conta está pronta',
            '',
            'Já pode experimentar o software para uma propriedade gratuitamente.',
            '',
            'Link para concluir o onboarding (painel web):',
            url,
            '',
            pwd ? `Palavra-passe temporária: ${pwd}` : '',
            'Apps móveis: Android (Google Play) e iOS (App Store) estão em revisão; entretanto, use o painel web.',
            '',
            'Se não vir o email, verifique Spam ou Promoções.',
            '',
            `© ${new Date().getFullYear()} Delfín Check-in`,
          ]
            .filter(Boolean)
            .join('\n'),
        web_plan_paid: (url: string, pwd?: string) =>
          [
            '🐬 Delfín Check-in — subscrição ativa',
            '',
            'Obrigado por subscrever. Conclua o onboarding no painel web:',
            '',
            url,
            '',
            pwd ? `Palavra-passe temporária: ${pwd}` : '',
            'A faturação recorrente é gerida na web (Polar), como no checkout. A subscrição não é comprada dentro das lojas de apps.',
            '',
            'Se não vir o email, verifique Spam ou Promoções.',
            '',
            `© ${new Date().getFullYear()} Delfín Check-in`,
          ]
            .filter(Boolean)
            .join('\n'),
        default: (url: string, pwd?: string) =>
          [
            '🐬 Bem-vindo ao Delfín Check-in',
            '',
            'A sua conta foi criada. Para concluir a configuração, visite:',
            '',
            url,
            '',
            pwd ? `Palavra-passe temporária: ${pwd}` : '',
            '',
            'Se tiver problemas, verifique a pasta de Spam.',
            '',
            `© ${new Date().getFullYear()} Delfín Check-in`,
          ]
            .filter(Boolean)
            .join('\n'),
      },
    },
    fr: {
      subject: {
        waitlist_launch: '🐬 Delfín Check-in : votre compte est prêt — commencez gratuitement',
        web_plan_paid: '🐬 Delfín Check-in : accès confirmé (abonnement web)',
        default: '🐬 Bienvenue sur Delfín Check-in — terminez la configuration',
      },
      heroTitle: {
        waitlist_launch: 'Bienvenue sur Delfín Check-in',
        web_plan_paid: 'Abonnement confirmé',
        default: 'Bienvenue sur Delfín Check-in',
      },
      heroSubtitle: {
        waitlist_launch: 'Commencez gratuitement avec un logement — onboarding guidé',
        web_plan_paid: 'Dernière étape : configurez votre compte dans le tableau de bord web',
        default: 'Votre plateforme de gestion d’hébergements',
      },
      bodyHeading: {
        waitlist_launch: 'Merci pour votre inscription !',
        web_plan_paid: 'Accédez et terminez la configuration',
        default: 'Prêt à démarrer !',
      },
      bodyLead: {
        waitlist_launch:
          'Votre accès est actif. Le tableau de bord web vous guide pas à pas (pays, unités, intégrations). Vous pouvez utiliser l’offre gratuite pour <strong>un logement</strong> pendant que vous explorez.',
        web_plan_paid:
          'Merci d’avoir souscrit à Delfín Check-in. Nous avons créé votre espace : le lien ci-dessous ouvre l’<strong>onboarding</strong> (infos entreprise, unités, intégrations). La facturation récurrente est gérée de manière sécurisée sur le web avec notre partenaire (Polar), comme au checkout.',
        default:
          'Votre compte a été créé. Pour terminer la configuration initiale et accéder au tableau de bord, utilisez le bouton ci-dessous :',
      },
      cta: 'Démarrer l’onboarding',
      importantTitle: 'Important :',
      importantBody:
        'si vous ne voyez pas cet email dans votre boîte de réception, vérifiez <strong>Spam</strong> ou <strong>Promotions</strong> et marquez-le comme sûr.',
      fallbackLine: 'Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :',
      antivirusTitle: 'Votre antivirus (Avast, etc.) bloque le lien ?',
      antivirusBody:
        'Les liens d’activation sont parfois signalés à tort. Il s’agit du tableau de bord officiel Delfín Check-in sur <strong>admin.delfincheckin.com</strong>, pas d’hameçonnage.',
      antivirusHelpLink: 'Guide pas à pas',
      autoMsg: 'Ceci est un message automatique ; merci de ne pas répondre.',
      tempPwdTitle: 'Mot de passe temporaire :',
      tempPwdHint: 'Vous pourrez le modifier pendant l’onboarding.',
      text: {
        waitlist_launch: (url: string, pwd?: string) =>
          [
            '🐬 Delfín Check-in — votre compte est prêt',
            '',
            'Vous pouvez maintenant essayer le logiciel gratuitement pour un logement.',
            '',
            'Lien pour terminer l’onboarding (tableau de bord web) :',
            url,
            '',
            pwd ? `Mot de passe temporaire : ${pwd}` : '',
            'Apps mobiles : Android (Google Play) et iOS (App Store) sont en cours de revue ; en attendant, utilisez le tableau de bord web.',
            '',
            'Si vous ne voyez pas l’email, vérifiez Spam ou Promotions.',
            '',
            `© ${new Date().getFullYear()} Delfín Check-in`,
          ]
            .filter(Boolean)
            .join('\n'),
        web_plan_paid: (url: string, pwd?: string) =>
          [
            '🐬 Delfín Check-in — abonnement actif',
            '',
            'Merci pour votre abonnement. Terminez l’onboarding dans le tableau de bord web :',
            '',
            url,
            '',
            pwd ? `Mot de passe temporaire : ${pwd}` : '',
            'La facturation récurrente est gérée sur le web (Polar), comme au checkout. L’abonnement n’est pas acheté dans les stores d’apps.',
            '',
            'Si vous ne voyez pas l’email, vérifiez Spam ou Promotions.',
            '',
            `© ${new Date().getFullYear()} Delfín Check-in`,
          ]
            .filter(Boolean)
            .join('\n'),
        default: (url: string, pwd?: string) =>
          [
            '🐬 Bienvenue sur Delfín Check-in',
            '',
            'Votre compte a été créé. Pour terminer la configuration, rendez-vous sur :',
            '',
            url,
            '',
            pwd ? `Mot de passe temporaire : ${pwd}` : '',
            '',
            'En cas de problème, vérifiez votre dossier Spam.',
            '',
            `© ${new Date().getFullYear()} Delfín Check-in`,
          ]
            .filter(Boolean)
            .join('\n'),
      },
    },
    fi: {
      subject: {
        waitlist_launch: '🐬 Delfín Check-in: tilisi on valmis — aloita ilmaiseksi',
        web_plan_paid: '🐬 Delfín Check-in: pääsy vahvistettu (web-tilaus)',
        default: '🐬 Tervetuloa Delfín Check-iniin — viimeistele käyttöönotto',
      },
      heroTitle: {
        waitlist_launch: 'Delfín Check-in -tilisi on valmis',
        web_plan_paid: 'Tilaus vahvistettu',
        default: 'Tervetuloa Delfín Check-iniin',
      },
      heroSubtitle: {
        waitlist_launch: 'Aloita ilmaiseksi yhdellä kohteella — opastettu käyttöönotto',
        web_plan_paid: 'Vielä yksi vaihe: viimeistele tili web-hallinnassa',
        default: 'Majoituksen hallinta-alustasi',
      },
      bodyHeading: {
        waitlist_launch: 'Kiitos rekisteröitymisestä!',
        web_plan_paid: 'Siirry ja viimeistele käyttöönotto',
        default: 'Valmiina aloittamaan!',
      },
      bodyLead: {
        waitlist_launch:
          'Pääsysi on aktiivinen. Web-hallintapaneeli opastaa vaihe vaiheelta (maa, yksiköt, integraatiot). Voit käyttää ilmaista pakettia <strong>yhdelle kohteelle</strong> kun tutustut palveluun.',
        web_plan_paid:
          'Kiitos tilauksesta. Loimme työtilasi: alla oleva linkki avaa <strong>käyttöönoton</strong> (yritystiedot, yksiköt, integraatiot). Toistuva laskutus hoidetaan turvallisesti webissä kumppanimme (Polar) kautta, kuten kassalla.',
        default:
          'Tilisi on luotu. Viimeistele alkuasetukset ja siirry hallintapaneeliin painikkeella:',
      },
      cta: 'Aloita käyttöönotto',
      importantTitle: 'Tärkeää:',
      importantBody:
        'jos et näe viestiä saapuneissa, tarkista <strong>roskaposti</strong> tai <strong>mainokset</strong> ja merkitse viesti turvalliseksi.',
      fallbackLine: 'Jos painike ei toimi, kopioi ja liitä tämä linkki selaimeen:',
      antivirusTitle: 'Estääkö virustentorjunta (Avast jne.) linkin?',
      antivirusBody:
        'Aktivointilinkit merkitään joskus virheellisesti. Tämä on virallinen Delfín Check-in -hallintapaneeli osoitteessa <strong>admin.delfincheckin.com</strong>, ei phishing.',
      antivirusHelpLink: 'Ohje vaihe vaiheelta',
      autoMsg: 'Tämä on automaattinen viesti; älä vastaa tähän sähköpostiin.',
      tempPwdTitle: 'Väliaikainen salasana:',
      tempPwdHint: 'Voit vaihtaa sen käyttöönoton aikana.',
      text: {
        waitlist_launch: (url: string, pwd?: string) =>
          [
            '🐬 Delfín Check-in — tilisi on valmis',
            '',
            'Voit nyt kokeilla ohjelmistoa ilmaiseksi yhdelle kohteelle.',
            '',
            'Linkki käyttöönottoon (web-hallinta):',
            url,
            '',
            pwd ? `Väliaikainen salasana: ${pwd}` : '',
            'Mobiilisovellukset: Android (Google Play) ja iOS (App Store) ovat tarkistuksessa; käytä sillä välin web-hallintaa.',
            '',
            'Jos et näe viestiä, tarkista roskaposti tai mainokset.',
            '',
            `© ${new Date().getFullYear()} Delfín Check-in`,
          ]
            .filter(Boolean)
            .join('\n'),
        web_plan_paid: (url: string, pwd?: string) =>
          [
            '🐬 Delfín Check-in — tilaus aktiivinen',
            '',
            'Kiitos tilauksesta. Viimeistele käyttöönotto web-hallinnassa:',
            '',
            url,
            '',
            pwd ? `Väliaikainen salasana: ${pwd}` : '',
            'Toistuva laskutus hoidetaan webissä (Polar), kuten kassalla. Tilausta ei osteta sovelluskaupoista.',
            '',
            'Jos et näe viestiä, tarkista roskaposti tai mainokset.',
            '',
            `© ${new Date().getFullYear()} Delfín Check-in`,
          ]
            .filter(Boolean)
            .join('\n'),
        default: (url: string, pwd?: string) =>
          [
            '🐬 Tervetuloa Delfín Check-iniin',
            '',
            'Tilisi on luotu. Viimeistele asetukset osoitteessa:',
            '',
            url,
            '',
            pwd ? `Väliaikainen salasana: ${pwd}` : '',
            '',
            'Jos jokin ei toimi, tarkista roskapostikansio.',
            '',
            `© ${new Date().getFullYear()} Delfín Check-in`,
          ]
            .filter(Boolean)
            .join('\n'),
      },
    },
    sv: {
      subject: {
        waitlist_launch: '🐬 Delfín Check-in: ditt konto är klart — börja gratis',
        web_plan_paid: '🐬 Delfín Check-in: åtkomst bekräftad (webbprenumeration)',
        default: '🐬 Välkommen till Delfín Check-in — slutför konfigurationen',
      },
      heroTitle: {
        waitlist_launch: 'Ditt Delfín Check-in-konto är klart',
        web_plan_paid: 'Prenumeration bekräftad',
        default: 'Välkommen till Delfín Check-in',
      },
      heroSubtitle: {
        waitlist_launch: 'Börja gratis med ett boende — vi guidar onboarding',
        web_plan_paid: 'Ett sista steg: konfigurera kontot i webbpanelen',
        default: 'Din plattform för boendehantering',
      },
      bodyHeading: {
        waitlist_launch: 'Tack för din registrering!',
        web_plan_paid: 'Öppna och slutför konfigurationen',
        default: 'Redo att börja!',
      },
      bodyLead: {
        waitlist_launch:
          'Din åtkomst är aktiv. Webbpanelen guidar dig steg för steg (land, enheter, integrationer). Du kan använda gratisplanen för <strong>ett boende</strong> medan du utforskar.',
        web_plan_paid:
          'Tack för att du prenumererar. Vi skapade din arbetsyta: länken nedan öppnar <strong>onboarding</strong> (företagsuppgifter, enheter, integrationer). Återkommande debitering hanteras säkert på webben via vår partner (Polar), som i kassan.',
        default:
          'Ditt konto har skapats. För att slutföra installationen och gå till panelen, använd knappen nedan:',
      },
      cta: 'Starta onboarding',
      importantTitle: 'Viktigt:',
      importantBody:
        'om du inte ser mejlet i inkorgen, kolla <strong>Skräppost</strong> eller <strong>Reklam</strong> och markera som säkert.',
      fallbackLine: 'Om knappen inte fungerar, kopiera och klistra in länken i webbläsaren:',
      antivirusTitle: 'Blockerar ditt antivirus (Avast m.fl.) länken?',
      antivirusBody:
        'Aktiveringslänkar flaggas ibland av misstag. Det är den officiella Delfín Check-in-panelen på <strong>admin.delfincheckin.com</strong>, inte nätfiske.',
      antivirusHelpLink: 'Steg-för-steg-guide',
      autoMsg: 'Detta är ett automatiskt meddelande; vänligen svara inte på detta mejl.',
      tempPwdTitle: 'Tillfälligt lösenord:',
      tempPwdHint: 'Du kan ändra det under onboarding.',
      text: {
        waitlist_launch: (url: string, pwd?: string) =>
          [
            '🐬 Delfín Check-in — ditt konto är klart',
            '',
            'Du kan nu prova programvaran gratis för ett boende.',
            '',
            'Länk för att slutföra onboarding (webbpanel):',
            url,
            '',
            pwd ? `Tillfälligt lösenord: ${pwd}` : '',
            'Mobilappar: Android (Google Play) och iOS (App Store) granskas; använd webbpanelen under tiden.',
            '',
            'Om du inte ser mejlet, kolla Skräppost eller Reklam.',
            '',
            `© ${new Date().getFullYear()} Delfín Check-in`,
          ]
            .filter(Boolean)
            .join('\n'),
        web_plan_paid: (url: string, pwd?: string) =>
          [
            '🐬 Delfín Check-in — prenumeration aktiv',
            '',
            'Tack för din prenumeration. Slutför onboarding i webbpanelen:',
            '',
            url,
            '',
            pwd ? `Tillfälligt lösenord: ${pwd}` : '',
            'Återkommande debitering hanteras på webben (Polar), som i kassan. Prenumerationen köps inte i appbutikerna.',
            '',
            'Om du inte ser mejlet, kolla Skräppost eller Reklam.',
            '',
            `© ${new Date().getFullYear()} Delfín Check-in`,
          ]
            .filter(Boolean)
            .join('\n'),
        default: (url: string, pwd?: string) =>
          [
            '🐬 Välkommen till Delfín Check-in',
            '',
            'Ditt konto har skapats. För att slutföra konfigurationen, besök:',
            '',
            url,
            '',
            pwd ? `Tillfälligt lösenord: ${pwd}` : '',
            '',
            'Om du får problem, kolla skräpposten.',
            '',
            `© ${new Date().getFullYear()} Delfín Check-in`,
          ]
            .filter(Boolean)
            .join('\n'),
      },
    },
  } as const;

  const selected = (base as any)[locale] || base.es;

  const v = variant;
  return {
    subject: selected.subject[v] || selected.subject.default,
    heroTitle: selected.heroTitle[v] || selected.heroTitle.default,
    heroSubtitle: selected.heroSubtitle[v] || selected.heroSubtitle.default,
    bodyHeading: selected.bodyHeading[v] || selected.bodyHeading.default,
    bodyLead: selected.bodyLead[v] || selected.bodyLead.default,
    cta: selected.cta,
    importantTitle: selected.importantTitle,
    importantBody: selected.importantBody,
    fallbackLine: selected.fallbackLine,
    antivirusTitle: selected.antivirusTitle,
    antivirusBody: selected.antivirusBody,
    antivirusHelpLink: selected.antivirusHelpLink,
    autoMsg: selected.autoMsg,
    tempPwdTitle: selected.tempPwdTitle,
    tempPwdHint: selected.tempPwdHint,
    text: selected.text[v] || selected.text.default,
  };
}

export async function sendOnboardingEmail(params: {
  to: string;
  onboardingUrl: string;
  tempPassword?: string;
  /** Si existe, se guarda en email_tracking para métricas/superadmin. */
  tenantId?: string;
  /** waitlist_launch: registro desde landing/waitlist. web_plan_paid: tras pago Polar. default: reenvío/recuperación. */
  variant?: OnboardingEmailVariant;
  /** Idioma del email (si no se pasa, se infiere de la URL o cae a es). */
  locale?: string;
}) {
  let trackingId: string | null = null;
  try {
    // Validar que SMTP esté configurado antes de intentar enviar
    const transporter = getTransport();
    
    // Email específico para onboarding de propietarios (admin)
    const from = process.env.SMTP_FROM_ONBOARDING || process.env.SMTP_FROM || `Delfín Check-in <noreply@delfincheckin.com>`;

    const variant = normalizeOnboardingVariant(params.variant);
    const emailLocale = normalizeEmailLocale(params.locale || guessLocaleFromOnboardingUrl(params.onboardingUrl));
    const copy = onboardingEmailCopy(emailLocale, variant);

    const rawOnboardingUrl = params.onboardingUrl;
    const href = escapeHtmlAttr(rawOnboardingUrl);
    const plainUrlText = escapeHtmlText(rawOnboardingUrl);
    const pwdBlock = params.tempPassword
      ? `
          <tr>
            <td style="padding:0 32px 24px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8f9fa;border-left:4px solid #2563eb;border-radius:4px;">
                <tr>
                  <td style="padding:16px 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#333333;line-height:1.5;">
                    <p style="margin:0 0 8px 0;"><strong>${copy.tempPwdTitle}</strong></p>
                    <p style="margin:0;font-size:18px;font-family:Consolas,Monaco,monospace;letter-spacing:1px;"><strong>${escapeHtmlText(params.tempPassword)}</strong></p>
                    <p style="margin:12px 0 0 0;font-size:12px;color:#666666;">${copy.tempPwdHint}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
      : '';

    const heroTitle = copy.heroTitle;
    const heroSubtitle = copy.heroSubtitle;
    const bodyHeading = copy.bodyHeading;
    const bodyLead = copy.bodyLead;
    const onboardingStepsNote =
      variant === 'waitlist_launch' || variant === 'default' || variant === 'web_plan_paid'
        ? `
          <tr>
            <td style="padding:0 32px 16px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#eff6ff;border-left:4px solid #2563eb;border-radius:4px;">
                <tr>
                  <td style="padding:16px 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#1e3a8a;">
                    <strong>${emailLocale === 'es' ? 'Pasos del asistente' : emailLocale === 'en' ? 'Setup wizard' : 'Onboarding'}:</strong><br/>
                    ${ONBOARDING_STEPS_HTML[emailLocale]}<br/><br/>
                    ${emailLocale === 'es'
                      ? 'El panel en <strong>admin.delfincheckin.com</strong> está optimizado para <strong>móvil y ordenador</strong>. Las apps nativas para tiendas están en revisión; puedes gestionar todo desde el navegador.'
                      : emailLocale === 'en'
                        ? 'The dashboard at <strong>admin.delfincheckin.com</strong> works on <strong>mobile and desktop</strong>. Native store apps are under review; manage everything in your browser.'
                        : 'Use the web dashboard on <strong>admin.delfincheckin.com</strong> (mobile-friendly).'}
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
        : '';

    const subject = copy.subject;

    const text = copy.text(params.onboardingUrl, params.tempPassword);

    const appBase = String(process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com').replace(/\/+$/, '');

    /** CTA directo al onboarding (sin redirect /api/track/email-click: menos falsos positivos AV). */
    const ctaHref = escapeHtmlAttr(rawOnboardingUrl);
    const helpUrl = escapeHtmlAttr(buildAntivirusHelpUrl(emailLocale));
    let trackingPixel = '';

    try {
      const meta = await sql`
        SELECT to_regclass('public.email_tracking') as reg
      `;
      if (meta.rows[0]?.reg) {
        const inserted = await sql`
          INSERT INTO email_tracking (
            tenant_id,
            email_type,
            recipient_email,
            subject,
            status,
            metadata
          ) VALUES (
            ${params.tenantId || null},
            'onboarding',
            ${params.to},
            ${subject},
            'sent',
            ${JSON.stringify({ variant, cta_direct: true })}::jsonb
          )
          RETURNING id
        `;
        trackingId = String(inserted.rows[0]?.id || '');

        const openPixelUrl = `${appBase}/api/track/email-open?tid=${encodeURIComponent(trackingId)}`;
        trackingPixel = `<img src="${escapeHtmlAttr(openPixelUrl)}" alt="" width="1" height="1" style="display:none;border:0;outline:none;text-decoration:none;" />`;
      }
    } catch (e) {
      console.warn('⚠️ [SEND ONBOARDING EMAIL] No se pudo preparar tracking de email:', e);
    }

    const antivirusBlock = `
          <tr>
            <td style="padding:0 32px 16px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#eff6ff;border-left:4px solid #2563eb;border-radius:4px;">
                <tr>
                  <td style="padding:16px 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#1e3a8a;">
                    <strong>${escapeHtmlText(copy.antivirusTitle)}</strong><br/>
                    ${copy.antivirusBody}
                    <br/><br/>
                    <a href="${helpUrl}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;font-weight:bold;">${escapeHtmlText(copy.antivirusHelpLink)}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;

    // Plantilla en tablas + estilos inline: Gmail y Outlook suelen romper div+margin y <style> en <head>
    const html = `<!DOCTYPE html>
<html lang="${escapeHtmlAttr(emailLocale)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtmlText(copy.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f5f5f5;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td align="center" style="padding:32px 24px;background-color:#5b63d9;">
              <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1.25;color:#ffffff;font-weight:bold;">${heroTitle}</h1>
              <p style="margin:12px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.4;color:#e8e9ff;">${heroSubtitle}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px 32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;">
              <h2 style="margin:0 0 16px 0;font-size:20px;line-height:1.3;color:#111827;">${bodyHeading}</h2>
              <p style="margin:0 0 16px 0;">${bodyLead}</p>
            </td>
          </tr>
          ${onboardingStepsNote}
          <tr>
            <td align="center" style="padding:8px 32px 24px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                  <td align="center" bgcolor="#2563eb" style="background-color:#2563eb;border-radius:8px;">
                    <a href="${ctaHref}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#ffffff !important;text-decoration:none;border-radius:8px;">${escapeHtmlText(copy.cta)}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${pwdBlock}
          ${antivirusBlock}
          <tr>
            <td style="padding:0 32px 24px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#fff8e6;border-left:4px solid #e6a800;border-radius:4px;">
                <tr>
                  <td style="padding:16px 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#6d5200;">
                    <strong>${escapeHtmlText(copy.importantTitle)}</strong> ${copy.importantBody}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px 32px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#4b5563;">
              <p style="margin:0 0 8px 0;">${escapeHtmlText(copy.fallbackLine)}</p>
              <p style="margin:0;word-break:break-all;font-size:13px;color:#2563eb;">${plainUrlText}</p>
            </td>
          </tr>
          ${trackingPixel}
          <tr>
            <td style="padding:20px 24px;background-color:#f8f9fa;border-top:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#6b7280;text-align:center;">
              <p style="margin:0;">${escapeHtmlText(copy.autoMsg)}</p>
              <p style="margin:8px 0 0 0;">© ${new Date().getFullYear()} Delfín Check-in</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    console.log('📧 [SEND ONBOARDING EMAIL] Intentando enviar email:', {
      to: params.to,
      from,
      hasOnboardingUrl: !!params.onboardingUrl,
      onboardingUrlPrefix: params.onboardingUrl.substring(0, 50) + '...',
      smtpHost: process.env.SMTP_HOST,
      smtpUser: process.env.SMTP_USER,
      smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && (process.env.SMTP_PASS || process.env.SMTP_PASSWORD))
    });

    const result = await transporter.sendMail({
      from,
      to: params.to,
      subject,
      html,
      text, // Versión texto plano para mejor deliverability
      // Headers adicionales para evitar spam
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
      },
    });

    console.log('✅ [SEND ONBOARDING EMAIL] Email enviado exitosamente:', {
      messageId: result.messageId,
      to: params.to,
      accepted: result.accepted,
      rejected: result.rejected
    });

    if (trackingId) {
      try {
        await sql`
          UPDATE email_tracking
          SET
            status = 'sent',
            message_id = ${result.messageId || null},
            updated_at = NOW()
          WHERE id = ${trackingId}::uuid
        `;
      } catch (e) {
        console.warn('⚠️ [SEND ONBOARDING EMAIL] No se pudo actualizar email_tracking tras envío:', e);
      }
    }

    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    if (trackingId) {
      try {
        await sql`
          UPDATE email_tracking
          SET
            status = 'failed',
            metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
              error: error?.message || 'send_failed',
            })}::jsonb,
            updated_at = NOW()
          WHERE id = ${trackingId}::uuid
        `;
      } catch (e) {
        console.warn('⚠️ [SEND ONBOARDING EMAIL] No se pudo marcar email_tracking como failed:', e);
      }
    }

    console.error('❌ [SEND ONBOARDING EMAIL] Error enviando email de onboarding:', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
      to: params.to,
      smtpHost: process.env.SMTP_HOST,
      smtpUser: process.env.SMTP_USER,
      smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && (process.env.SMTP_PASS || process.env.SMTP_PASSWORD))
    });
    
    // Re-lanzar el error para que el webhook pueda manejarlo
    throw error;
  }
}

export async function sendPaymentNotificationEmail(params: {
  to: string;
  type: 'payment_failed' | 'suspended' | 'payment_succeeded';
  tenantName: string;
  amount: number;
  retryCount?: number;
  remainingAttempts?: number;
  invoiceUrl?: string | null;
}) {
  const transporter = getTransport();
  const from = process.env.SMTP_FROM || `Delfín Check-in <noreply@delfincheckin.com>`;

  let subject = '';
  let html = '';

  if (params.type === 'payment_failed') {
    subject = `⚠️ Pago fallido - Delfín Check-in (Intento ${params.retryCount}/3)`;
    html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height:1.6; max-width:600px; margin:0 auto;">
      <h2 style="color:#dc2626;">⚠️ Pago Fallido</h2>
      <p>Hola ${params.tenantName},</p>
      <p>No hemos podido procesar el pago de tu suscripción a Delfín Check-in.</p>
      <div style="background:#fee2e2; border-left:4px solid #dc2626; padding:16px; margin:20px 0; border-radius:4px;">
        <p style="margin:0;"><strong>Importe:</strong> ${params.amount.toFixed(2)}€</p>
        <p style="margin:8px 0 0 0;"><strong>Intento:</strong> ${params.retryCount}/3</p>
        <p style="margin:8px 0 0 0;"><strong>Intentos restantes:</strong> ${params.remainingAttempts}</p>
      </div>
      <p>Si no actualizas tu método de pago, se intentará cobrar automáticamente ${params.remainingAttempts} ${params.remainingAttempts === 1 ? 'vez más' : 'veces más'}.</p>
      <p><strong>⚠️ Importante:</strong> Si después de 3 intentos fallidos no se puede cobrar, los servicios de Delfín Check-in serán suspendidos automáticamente.</p>
      ${params.invoiceUrl ? `<p><a href="${params.invoiceUrl}" target="_blank" style="background:#2563eb;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">Actualizar método de pago</a></p>` : ''}
      <p>Puedes acceder a tu panel de administración para actualizar tu método de pago y ver tus facturas pendientes.</p>
      <hr style="margin:30px 0; border:none; border-top:1px solid #e5e7eb;"/>
      <p style="color:#6b7280; font-size:14px;">Si ya has actualizado tu método de pago, por favor ignora este mensaje.</p>
    </div>`;
  } else if (params.type === 'suspended') {
    subject = '🚫 Servicios Suspendidos - Delfín Check-in';
    html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height:1.6; max-width:600px; margin:0 auto;">
      <h2 style="color:#dc2626;">🚫 Servicios Suspendidos</h2>
      <p>Hola ${params.tenantName},</p>
      <p>Después de 3 intentos fallidos de pago, hemos suspendido temporalmente los servicios de Delfín Check-in.</p>
      <div style="background:#fee2e2; border-left:4px solid #dc2626; padding:16px; margin:20px 0; border-radius:4px;">
        <p style="margin:0;"><strong>Importe pendiente:</strong> ${params.amount.toFixed(2)}€</p>
      </div>
      <p><strong>¿Qué significa esto?</strong></p>
      <ul>
        <li>Puedes acceder a tu panel de administración para ver tus datos</li>
        <li><strong>No podrás crear nuevos registros de viajeros</strong></li>
        <li><strong>No podrás usar el canal de comunicación</strong></li>
        <li><strong>No se procesarán nuevas reservas</strong></li>
      </ul>
      <p>Para reactivar tus servicios, por favor actualiza tu método de pago y realiza el pago pendiente.</p>
      ${params.invoiceUrl ? `<p><a href="${params.invoiceUrl}" target="_blank" style="background:#dc2626;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">Pagar factura pendiente</a></p>` : ''}
      <p>Una vez que el pago se procese correctamente, tus servicios se reactivarán automáticamente.</p>
      <hr style="margin:30px 0; border:none; border-top:1px solid #e5e7eb;"/>
      <p style="color:#6b7280; font-size:14px;">Si tienes alguna pregunta, no dudes en contactarnos.</p>
    </div>`;
  } else if (params.type === 'payment_succeeded') {
    subject = '✅ Pago Exitoso - Delfín Check-in';
    html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height:1.6; max-width:600px; margin:0 auto;">
      <h2 style="color:#059669;">✅ Pago Procesado Exitosamente</h2>
      <p>Hola ${params.tenantName},</p>
      <p>Tu pago de ${params.amount.toFixed(2)}€ ha sido procesado correctamente.</p>
      <p>Tu suscripción a Delfín Check-in está activa y todos los servicios están disponibles.</p>
      <p>Gracias por confiar en nosotros.</p>
    </div>`;
  }

  await transporter.sendMail({
    from,
    to: params.to,
    subject,
    html,
  });
}


