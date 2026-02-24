import { NextRequest, NextResponse } from 'next/server';

/** Manifest con URLs absolutas para iconos, evita 404 en /es/vercel.svg o /es/next.svg */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('host')
    ? `${req.nextUrl.protocol}//${req.headers.get('host')}`
    : (process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com');
  const manifest = {
    name: "Delfín Check-in",
    short_name: "Delfín Check-in",
    description: "Sistema de registro de viajeros para el Ministerio del Interior de España",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      { src: `${origin}/next.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" }
    ]
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
