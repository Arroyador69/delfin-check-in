export type SupportKB = {
  version: string;
  language: 'es' | 'en' | 'fr' | 'it' | 'pt' | 'fi';
  intro: string;
  faqs: Array<{ q: string; a: string }>;
};

