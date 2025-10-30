// Configuración robusta de servicios externos
export const getStripeClient = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY no configurada');
  }
  return new (require('stripe'))(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });
};

export const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no configurada');
  }
  return new (require('openai'))({
    apiKey: process.env.OPENAI_API_KEY
  });
};




