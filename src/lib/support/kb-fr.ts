import type { SupportKB } from './types';

export const KB_FR: SupportKB = {
  version: '2026-03-16',
  language: 'fr',
  intro:
    'Tu es l’Assistant de Delfín Check-in. Tu aides UNIQUEMENT à utiliser le logiciel (écrans, boutons, étapes). ' +
    'Tu ne parles pas de code source, d’architecture interne ni de données privées des clients. ' +
    'Réponds toujours en français, avec des étapes courtes (max 8–12 lignes). Si le contexte manque, demande simplement sur quel écran se trouve l’utilisateur et ce qu’il veut faire.',
  faqs: [
    {
      q: 'Qu’est-ce que Delfín Check-in ?',
      a: 'Delfín Check-in permet d’enregistrer les voyageurs et de gérer l’envoi obligatoire au Ministère de l’Intérieur espagnol (MIR), tout en organisant les propriétés/chambres et en affichant des informations utiles (jours fériés, événements locaux, analytique).',
    },
    {
      q: 'Comment me connecter au panneau ?',
      a: 'Ouvre le panneau d’administration et utilise ton email et ton mot de passe. Si tu ne peux pas te connecter, demande à ton administrateur de vérifier ton compte ou de t’inviter.',
    },
    {
      q: 'Je n’arrive pas à me connecter, que faire ?',
      a: '1) Vérifie email/mot de passe. 2) Déconnecte-toi puis reconnecte-toi. 3) Si le problème persiste, demande une réinitialisation de mot de passe ou vérifie auprès de l’admin si ton tenant/utilisateur est actif.',
    },
    {
      q: 'Comment configurer mes identifiants MIR ?',
      a: 'Va dans Paramètres → MIR. Renseigne : utilisateur MIR (CIF/NIF + ---WS), mot de passe MIR et ton code de bailleur. Sauvegarde. Si tu ne les as pas encore, tu dois les obtenir sur le portail officiel du MIR en enregistrant ton établissement.',
    },
    {
      q: 'Où trouver mon utilisateur MIR et mon code de bailleur ?',
      a: 'Sur le portail officiel des hébergements du MIR : https://hospedajes.ses.mir.es. En t’enregistrant avec le service web, le MIR te fournit un utilisateur (souvent CIF/NIF/NIE + ---WS) et un code de bailleur visible dans la fiche de ton établissement.',
    },
    {
      q: 'Comment enregistrer un voyageur depuis le formulaire public ?',
      a: 'Partage le lien du formulaire public. Le voyageur remplit ses données, signe et accepte les conditions. Une fois envoyé, l’enregistrement apparaît automatiquement dans ton panneau.',
    },
    {
      q: 'Est-ce que tous les voyageurs doivent signer ?',
      a: 'Oui. Chaque voyageur doit signer sa partie lorsqu’il y a plusieurs voyageurs dans le même enregistrement.',
    },
    {
      q: 'Où voir les signatures des voyageurs ?',
      a: 'Dans Enregistrements d’hôtes → ouvre le détail de l’enregistrement. S’il y a 2 voyageurs, tu verras 2 signatures (Voyageur 1 et Voyageur 2).',
    },
    {
      q: 'Comment ajouter un événement local ?',
      a: 'Dans Intelligence de Marché → Événements locaux → “Ajouter un événement”. Renseigne le titre, les dates, la ville, le lieu et l’impact. Sauvegarde. Il apparaîtra dans le calendrier.',
    },
    {
      q: 'Comment contacter le support ?',
      a: 'Pour le support, écris à contacto@delfincheckin.com avec les détails de ta question ou de ton problème (captures d’écran + email de ton compte). C’est le canal principal d’assistance.',
    },
  ],
};

