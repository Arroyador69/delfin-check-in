/**
 * CRON: Generar 2 borradores de blog al día.
 * OpenAI (~1600 palabras, temas SEO) → BD como borrador. Superadmin revisa y pulsa "En GitHub".
 * Vercel Cron (o Bearer CRON_SECRET).
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateBlogArticle } from '@/lib/blog-daily';

const CRON_ARTICLES_PER_DAY = 2;
const TARGET_WORDS = 1600;

const SEO_TOPICS: string[] = [
  'Plazo para registrar viajeros y consecuencias de retraso',
  'Declaración informativa alquileres corta duración 2026',
  'Diferencias por comunidad autónoma en registro de huéspedes',
  'Errores frecuentes al enviar datos al SES',
  'Mejor software de registro de huéspedes España 2026',
  'Automatizar el registro de viajeros con un PMS',
  'Nueva normativa alquiler turístico 2027 y registro viajeros',
  'Check-in digital obligatorio y envío al Ministerio del Interior',
  'Multas por no registrar en Airbnb y Booking actualizado 2026',
  'Quién debe registrar: propietario o plataforma',
  'Sanciones por no enviar el parte de viajeros a tiempo',
  'Cómo cumplir el RD 933/2021 en alquiler vacacional',
  'Registro de viajeros paso a paso Ministerio del Interior 2026',
  'Airbnb y Booking: ¿registran a los huéspedes por el propietario?',
  'Parte de viajeros electrónico: plazos y obligaciones',
  'Registro de huéspedes en viviendas turísticas por comunidad autónoma',
  'Software de registro de viajeros para múltiples propiedades',
  'Multas por no registrar viajeros: importes y casos reales',
  'Obligaciones del propietario en alquiler vacacional España 2026',
  'Envío telemático de datos de viajeros al Ministerio del Interior',
  'Check-in digital obligatorio: qué cambia en 2026',
  'Cómo evitar sanciones por no registrar huéspedes',
  'Registro de viajeros en apartamentos turísticos: guía completa',
  'Declaración informativa y registro de viajeros: diferencias',
  'Plazos legales para registrar viajeros en España',
  'PMS para alquiler vacacional con registro de viajeros integrado',
  'Responsabilidad del propietario en el registro de huéspedes',
  'Normativa registro viajeros por comunidades autónomas 2026',
  'SES hospedajes: cómo enviar el parte de viajeros correctamente',
  'Registro de viajeros y cumplimiento normativo en Airbnb',
  'Ventajas de automatizar el registro de viajeros',
  'Qué datos hay que enviar al registrar viajeros',
  'Registro de viajeros en temporada alta: recomendaciones',
  'Comparativa de software de registro de viajeros España',
  'Obligaciones de registro en alquiler por habitaciones',
  'Registro de viajeros y protección de datos RGPD',
  'Cómo corregir errores en el envío del parte de viajeros',
  'Registro de viajeros para propietarios con varias propiedades',
  'Guía práctica: registro de viajeros en 2026',
  'Consecuencias de no registrar a los huéspedes a tiempo',
];

function getTopicsForToday(): string[] {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  const index = (dayOfYear * CRON_ARTICLES_PER_DAY) % SEO_TOPICS.length;
  const topics: string[] = [];
  for (let i = 0; i < CRON_ARTICLES_PER_DAY; i++) {
    topics.push(SEO_TOPICS[(index + i) % SEO_TOPICS.length]);
  }
  return topics;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const isVercelCron = req.headers.get('x-vercel-cron') === '1';
    const cronSecret = process.env.CRON_SECRET;
    if (!isVercelCron && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const topics = getTopicsForToday();
    const results: { topic: string; slug?: string; url?: string; error?: string }[] = [];

    for (const topic of topics) {
      try {
        const { slug } = await generateBlogArticle(topic, TARGET_WORDS);
        results.push({ topic, slug, url: undefined });
      } catch (err: any) {
        console.error(`Cron blog: error con tema "${topic}":`, err);
        results.push({ topic, error: err?.message || 'Error' });
      }
    }

    const ok = results.filter((r) => r.slug);
    return NextResponse.json({
      success: true,
      message: `Borradores creados ${ok.length}/${CRON_ARTICLES_PER_DAY}. Revisa en Superadmin → Gestión de artículos y publica en GitHub.`,
      results,
    });
  } catch (err: any) {
    console.error('Cron publish-blog-articles:', err);
    return NextResponse.json(
      { error: err?.message || 'Error en el cron' },
      { status: 500 }
    );
  }
}
