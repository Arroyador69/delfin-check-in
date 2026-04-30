import type { SupportKB } from './types';

export const KB_IT: SupportKB = {
  version: '2026-03-16',
  language: 'it',
  intro:
    'Sei l’Assistente di Delfín Check-in. Aiuti SOLO a usare il software (schermate, pulsanti, passaggi). ' +
    'Non parli di codice sorgente, architettura interna o dati privati degli ospiti. ' +
    'Rispondi sempre in italiano, con istruzioni brevi passo per passo (max 8–12 righe). Se manca contesto, chiedi solo in quale schermata si trova l’utente e cosa vuole ottenere.',
  faqs: [
    {
      q: 'A cosa serve la pagina “Registro di Conformità” (audit)?',
      a:
        'Il registro di conformità è una timeline tecnica di azioni e validazioni del sistema. ' +
        'Serve per capire cosa è successo e quando (es. creazione/validazione, export AEAT/PV e tentativi di reinvio della coda). ' +
        'Per diagnosticare, filtra per Azione (es. VALIDATE_OK o ERROR), Tipo (es. AEAT_EXPORT/PV_EXPORT) e intervallo di date. ' +
        'La colonna “Meta” aggiunge contesto e l’“Hash” identifica il payload senza esporre dati sensibili.',
    },
    {
      q: 'Che cos’è Delfín Check-in?',
      a: 'Delfín Check-in ti permette di registrare gli ospiti e gestire l’invio obbligatorio al Ministero dell’Interno spagnolo (MIR), oltre a organizzare proprietà/camere e vedere informazioni utili (festività, eventi locali, analitiche).',
    },
    {
      q: 'Come accedo al pannello?',
      a: 'Apri il pannello di amministrazione e usa email e password. Se non riesci ad accedere, chiedi all’amministratore di verificare il tuo account o di invitarti.',
    },
    {
      q: 'Non riesco ad accedere, cosa posso fare?',
      a: '1) Controlla email/password. 2) Esci e rientra. 3) Se continua a non funzionare, richiedi il reset della password o verifica con l’admin che il tenant/utente sia attivo.',
    },
    {
      q: 'Come configuro le credenziali MIR?',
      a: 'Vai in Impostazioni → MIR. Inserisci: utente MIR (CIF/NIF + ---WS), password MIR e codice locatore. Salva. Se non li hai ancora, devi ottenerli dal portale ufficiale MIR registrando la struttura.',
    },
    {
      q: 'Dove trovo utente e codice locatore MIR?',
      a: 'Nel portale ufficiale degli alloggi del MIR: https://hospedajes.ses.mir.es. Registrando la struttura con invio tramite web service, il MIR ti fornisce utente (di solito CIF/NIF/NIE + ---WS) e codice locatore nella scheda della struttura.',
    },
    {
      q: 'Come registro un ospite dal modulo pubblico?',
      a: 'Condividi il link del modulo pubblico. L’ospite compila i dati, firma e accetta i termini. Dopo l’invio, la registrazione appare automaticamente nel pannello.',
    },
    {
      q: 'Tutti i viaggiatori devono firmare?',
      a: 'Sì. Ogni viaggiatore deve firmare la propria parte quando ci sono più viaggiatori nella stessa registrazione.',
    },
    {
      q: 'Come contatto il supporto?',
      a: 'Per assistenza scrivi a contacto@delfincheckin.com spiegando la domanda o il problema (meglio con screenshot e email del tuo account). È il canale principale di supporto.',
    },
  ],
};

