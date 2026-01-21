import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n/config';

/**
 * 🌍 LAYOUT PARA RUTAS INTERNACIONALIZADAS
 * 
 * Este layout envuelve todas las páginas del tenant admin con el provider de i18n.
 * Las rutas bajo [locale]/ tendrán acceso a traducciones.
 */

// Forzar rendering dinámico para TODAS las páginas bajo [locale]
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Validar que el locale sea soportado
  if (!locales.includes(locale as any)) {
    notFound();
  }

  // Cargar mensajes del locale
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
