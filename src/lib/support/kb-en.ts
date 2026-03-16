import type { SupportKB } from './types';

export const KB_EN: SupportKB = {
  version: '2026-03-16',
  language: 'en',
  intro:
    'You are the Delfín Check-in Assistant. You ONLY help with using the software (screens, buttons, steps). ' +
    'You do not talk about source code, internal architecture or private guest data. ' +
    'Always answer in clear English, with short step-by-step instructions (max 8–12 lines). If context is missing, ask just for the current screen and the goal.',
  faqs: [
    {
      q: 'What is Delfín Check-in and what is it for?',
      a: 'Delfín Check-in lets you register guests and comply with MIR reporting in Spain, while organising properties/rooms and seeing useful information (holidays, local events, analytics).',
    },
    {
      q: 'How do I log in?',
      a: 'Open the admin panel and use your email/password. If you cannot access, ask your administrator to invite you or check your account status.',
    },
    {
      q: 'I cannot log in, what should I do?',
      a: '1) Check email/password. 2) Log out and log in again. 3) If it still fails, request a password reset or ask the admin to verify that your tenant/user is active.',
    },
    {
      q: 'What is a tenant?',
      a: 'It is your own “space” inside the system. Each tenant has its own properties, guests and configuration; data is not mixed between different owners.',
    },
    {
      q: 'How do I set up my MIR credentials?',
      a: 'Go to Settings → MIR. Enter: MIR user (CIF/NIF + ---WS), MIR password and your landlord code. Save. If you do not have them yet, you must obtain them from the official MIR portal when registering your property.',
    },
    {
      q: 'Where do I get my MIR user?',
      a: 'On the official MIR lodging portal: https://hospedajes.ses.mir.es. When you register your establishment with web service enabled, MIR gives you a user and password. The user is usually your CIF/NIF/NIE followed by “---WS” (example: B12345678---WS).',
    },
    {
      q: 'What is the MIR landlord code?',
      a: 'A unique identifier assigned by MIR when you register the establishment on the lodging portal (https://hospedajes.ses.mir.es). You can see it in your property details there. It must be configured in Delfín so submissions are accepted.',
    },
    {
      q: 'How do I know if I am in MIR test or production?',
      a: 'It depends on your environment (staging/production) and MIR configuration. In the MIR status panel you can see if submissions are being sent to the test or production endpoint.',
    },
    {
      q: 'I sent a registration, how do I confirm it was sent to MIR?',
      a: 'Open the MIR/Submission status panel. Look for the communication linked to that guest or date. It should appear as sent/accepted or with an error if something failed.',
    },
    {
      q: 'What does pending / sent / error mean in MIR?',
      a: 'Pending: not yet sent or still queued. Sent: submission executed. Error: MIR rejected the payload or there was a failure; check the error message and correct the relevant field.',
    },
    {
      q: 'How do I register a guest from the public form?',
      a: 'Share the public registration link. The guest fills their data, signs and accepts the terms. Once submitted, the registration appears automatically in your admin panel.',
    },
    {
      q: 'Do all travellers need to sign?',
      a: 'Yes. Each traveller must sign their part when there is more than one traveller (according to the form flow).',
    },
    {
      q: 'Where can I see guest signatures?',
      a: 'In Guest Registrations → open the registration detail. If there are 2 travellers, you will see 2 signatures (Traveller 1 and Traveller 2).',
    },
    {
      q: 'How do I create a property?',
      a: 'Go to Properties (or Settings → Properties). Click “Add” and fill in the details (name, address, etc.). Save.',
    },
    {
      q: 'How do I create rooms/units?',
      a: 'Inside the property, open Rooms/Units and click “Add”. Define name, capacity and details. Save.',
    },
    {
      q: 'How do I define the number of guests for a stay?',
      a: 'When creating the registration or reservation, specify how many travellers there are and fill in their data. The system should reflect the real number of occupants.',
    },
    {
      q: 'What is Market Intelligence?',
      a: 'A module to see holidays, local events and analytics to help you make better decisions (for example, adjusting prices based on demand).',
    },
    {
      q: 'Are holidays per city or per region?',
      a: 'Currently: national holidays plus the selected autonomous community (region). Local municipal holidays are not included automatically.',
    },
    {
      q: 'How do I add a local fair or event?',
      a: 'In Market Intelligence → Local events → “Add event”. Set title, dates, city, venue and impact level. Save. It will appear in the calendar.',
    },
    {
      q: 'How do I contact support?',
      a: 'For general support, write to contacto@delfincheckin.com describing your question or issue (ideally with screenshots and the email of your account). We use that email as the main support channel.',
    },
  ],
};

