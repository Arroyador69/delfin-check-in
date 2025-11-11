import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ConditionalNavigation from "@/components/ConditionalNavigation";
import SWRegister from "@/components/SWRegister";
import PWAInstallGuide from "@/components/PWAInstallGuide";
import ConditionalFooter from "@/components/ConditionalFooter";
import CookieConsentModal from "@/components/CookieConsentModal";

// Importar Sentry
import '@sentry/nextjs';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Delfín Check-in 🐬",
  description: "Gestión inteligente de habitaciones Airbnb y Booking.com",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <SWRegister />
          <ConditionalNavigation />
          <PWAInstallGuide />
          {/* Compensar la barra de navegación fija (h-16) */}
          <main className="pt-16 flex-1">
            {children}
          </main>
          <ConditionalFooter />
          <CookieConsentModal />
        </div>
      </body>
    </html>
  );
}
