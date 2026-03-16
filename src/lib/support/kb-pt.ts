import type { SupportKB } from './types';

export const KB_PT: SupportKB = {
  version: '2026-03-16',
  language: 'pt',
  intro:
    'Você é o Assistente do Delfín Check-in. Ajuda APENAS a usar o software (ecrãs, botões, passos). ' +
    'Não fala de código-fonte, arquitetura interna nem de dados privados de hóspedes. ' +
    'Responda sempre em português claro, com passos curtos (máx. 8–12 linhas). Se faltar contexto, peça apenas em que ecrã o utilizador está e o que quer fazer.',
  faqs: [
    {
      q: 'O que é o Delfín Check-in?',
      a: 'O Delfín Check-in permite registar hóspedes e gerir o envio obrigatório ao Ministério do Interior espanhol (MIR), além de organizar propriedades/quartos e ver informação útil (feriados, eventos locais, análises).',
    },
    {
      q: 'Como entro no painel?',
      a: 'Abra o painel de administração e use o seu email e palavra-passe. Se não conseguir entrar, peça ao administrador para verificar a sua conta ou convidá-lo novamente.',
    },
    {
      q: 'Não consigo entrar, o que faço?',
      a: '1) Verifique email/palavra-passe. 2) Termine sessão e volte a entrar. 3) Se continuar, peça um reset de palavra-passe ou confirme com o admin se o tenant/utilizador está ativo.',
    },
    {
      q: 'Como configuro as credenciais do MIR?',
      a: 'Vá a Definições → MIR. Introduza: utilizador MIR (CIF/NIF + ---WS), palavra-passe MIR e o seu código de arrendador. Guarde. Se ainda não os tiver, terá de os obter no portal oficial do MIR ao registar o alojamento.',
    },
    {
      q: 'Onde obtenho o utilizador e o código de arrendador do MIR?',
      a: 'No portal oficial de alojamentos do MIR: https://hospedajes.ses.mir.es. Ao registar o alojamento com envio por web service, o MIR fornece um utilizador (normalmente CIF/NIF/NIE + ---WS) e um código de arrendador visível na ficha do estabelecimento.',
    },
    {
      q: 'Como registo um hóspede pelo formulário público?',
      a: 'Partilhe o link do formulário público. O hóspede preenche os dados, assina e aceita os termos. Depois de enviar, o registo aparece automaticamente no painel.',
    },
    {
      q: 'Todos os viajantes têm de assinar?',
      a: 'Sim. Cada viajante deve assinar a sua parte quando há vários viajantes no mesmo registo.',
    },
    {
      q: 'Como contacto o suporte?',
      a: 'Para suporte geral escreva para contacto@delfincheckin.com explicando a sua dúvida ou problema (de preferência com capturas de ecrã e o email da sua conta). Esse é o canal principal de suporte.',
    },
  ],
};

