import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ConditionalNavigation from "@/components/ConditionalNavigation";
import SWRegister from "@/components/SWRegister";
import dynamic from "next/dynamic";
const PWAInstallGuide = dynamic(() => import("@/components/PWAInstallGuide"), { ssr: false });

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
        <div className="min-h-screen bg-gray-50">
          <SWRegister />
          <ConditionalNavigation />
          <PWAInstallGuide />
          <main>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
