import { NextResponse } from 'next/server';

export async function GET() {
  const manifest = {
    name: "Delfín Check-in",
    short_name: "Delfín Check-in",
    description: "Sistema de registro de viajeros para el Ministerio del Interior de España",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/vercel.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
}
