import OpenAI from 'openai';

let openaiSingleton: OpenAI | undefined;

/** Cliente OpenAI para rutas API; lazy para que `next build` no falle sin OPENAI_API_KEY. */
export function getOpenAI(): OpenAI {
  if (openaiSingleton) return openaiSingleton;
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error('OPENAI_API_KEY no está configurada');
  }
  openaiSingleton = new OpenAI({ apiKey: key });
  return openaiSingleton;
}
