import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import "./globals.css";
import SWRegister from "@/components/SWRegister";
import ConditionalNavigation from "@/components/ConditionalNavigation";
import HtmlLangSync from "@/components/HtmlLangSync";

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
  // Provider por defecto para rutas sin locale (admin-login, forgot-password)
  const defaultMessages = (await import('../../messages/es.json')).default;

  return (
    <html lang="es">
      <head>
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🐬</text></svg>" />
        <link rel="apple-touch-icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🐬</text></svg>" />
      </head>
      <body className={inter.className}>
        <NextIntlClientProvider locale="es" messages={defaultMessages}>
          <HtmlLangSync />
          <SWRegister />
          <ConditionalNavigation />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
