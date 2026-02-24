import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import "./globals.css";
import ConditionalNavigation from "@/components/ConditionalNavigation";
import ConditionalMainPadding from "@/components/ConditionalMainPadding";
import SWRegister from "@/components/SWRegister";
import PWAInstallGuide from "@/components/PWAInstallGuide";
import ConditionalFooter from "@/components/ConditionalFooter";
import CookieConsentModal from "@/components/CookieConsentModal";
import AdsBanner from "@/components/AdsBanner";
import AdBlockDetector from "@/components/AdBlockDetector";

// Importar Sentry
import '@sentry/nextjs';

const inter = Inter({ subsets: ["latin"] });

// Forzar rendering dinámico para evitar errores de SSG con i18n
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Delfín Check-in 🐬",
  description: "Gestión inteligente de habitaciones Airbnb y Booking.com",
  manifest: "/manifest.json",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Provider por defecto en español para Navigation/Footer (evita Application error)
  const defaultMessages = (await import('../../messages/es.json')).default;

  return (
    <html lang="es">
      <head>
        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🐬</text></svg>" />
        <link rel="apple-touch-icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🐬</text></svg>" />
        {/* Google AdSense Script - Verificación de propiedad del sitio */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6039298229774115"
          crossOrigin="anonymous"
        />
      </head>
      <body className={inter.className}>
        <NextIntlClientProvider locale="es" messages={defaultMessages}>
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <SWRegister />
            <ConditionalNavigation />
            <AdsBanner />
            <PWAInstallGuide />
            {/* Detector de AdBlock - bloquea la página si está activo */}
            <AdBlockDetector />
            {/* Padding condicional: solo aplicar pt-16 si hay header */}
            <ConditionalMainPadding>
              {children}
            </ConditionalMainPadding>
            <ConditionalFooter />
            <CookieConsentModal />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
