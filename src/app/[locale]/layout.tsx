import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n/config';
import Navigation from '@/components/Navigation';
import ConditionalMainPadding from '@/components/ConditionalMainPadding';
import ConditionalFooter from '@/components/ConditionalFooter';
import CookieConsentModal from '@/components/CookieConsentModal';
import AdsBanner from '@/components/AdsBanner';
import PWAInstallGuide from '@/components/PWAInstallGuide';
import AdBlockDetector from '@/components/AdBlockDetector';

/**
 * 🌍 LAYOUT PARA RUTAS INTERNACIONALIZADAS
 *
 * Incluye el shell completo (nav, footer, anuncios) para que el idioma del
 * selector se aplique a toda la UI (menú, enlaces, etc.).
 */

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navigation />
        <AdsBanner />
        <PWAInstallGuide />
        <AdBlockDetector />
        <ConditionalMainPadding>
          {children}
        </ConditionalMainPadding>
        <ConditionalFooter />
        <CookieConsentModal />
      </div>
    </NextIntlClientProvider>
  );
}
