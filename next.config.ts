import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // En Vercel define CLEANING_PUBLIC_BASE_URL (p. ej. https://clean.delfincheckin.com).
  // Nombre propio para no mezclar con NEXT_PUBLIC_APP_URL. Se inyecta al cliente en build.
  env: {
    NEXT_PUBLIC_CLEANING_PUBLIC_BASE_URL:
      process.env.CLEANING_PUBLIC_BASE_URL?.trim() ||
      process.env.NEXT_PUBLIC_CLEANING_PUBLIC_BASE_URL?.trim() ||
      '',
  },
  // Evita que Next infiera la raíz del workspace (p.ej. $HOME) por múltiples lockfiles.
  // Esto mejora el output file tracing y previene errores en runtime en Vercel.
  outputFileTracingRoot: path.resolve(__dirname),
  // Certificado intermedio FNMT para TLS con hospedajes.ses.mir.es (lectura en runtime vía fs).
  outputFileTracingIncludes: {
    '/api/ministerio': ['./certs/ACCOMP.pem'],
    '/api/registro-flex': ['./certs/ACCOMP.pem'],
    '/api/public/form': ['./certs/ACCOMP.pem'],
  },
  productionBrowserSourceMaps: false,
  // output: 'standalone' REMOVIDO - causaba conflictos con next-intl
  // Usamos dynamic: 'force-dynamic' en layouts en su lugar
  serverExternalPackages: ['pdfkit'],
  images: {
    domains: ['localhost', 'supabase.co'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizeCss: false, // Deshabilitado para evitar problemas con critters
  },
  // Excluir carpeta scripts de la compilación
  webpack: (config, { isServer }) => {
    config.watchOptions = {
      ignored: ['**/scripts/**']
    };
    return config;
  },
  // Si la raíz devuelve 404 en producción, redirigir a login para que el usuario pueda entrar
  async redirects() {
    return [
      { source: '/', destination: '/admin-login', permanent: false },
    ];
  },
  /** Algunos navegadores resuelven iconos del manifest bajo /{locale}/… y piden /es/vercel.svg (404). */
  async rewrites() {
    const locales = ['es', 'en', 'it', 'fr', 'pt', 'fi'];
    return locales.flatMap((locale) => [
      { source: `/${locale}/vercel.svg`, destination: '/vercel.svg' },
      { source: `/${locale}/next.svg`, destination: '/vercel.svg' },
      {
        source: `/${locale}/affiliate-recommendation-product.png`,
        destination: '/affiliate-recommendation-product.png',
      },
    ]);
  },
  // Cabeceras de seguridad (pentest Penligent 2026-09: F-005 CSP/HSTS)
  async headers() {
    // CSP pragmática para Next.js + Stripe/Polar/Sentry/YouTube embeds.
    // frame-ancestors refuerza clickjacking junto a X-Frame-Options.
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self' https://admin.delfincheckin.com https://polar.sh https://checkout.polar.sh",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline' https:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.sentry-cdn.com https://www.youtube.com https://www.googletagmanager.com",
      "connect-src 'self' https: wss:",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://polar.sh https://checkout.polar.sh https://www.youtube.com https://www.youtube-nocookie.com",
      "worker-src 'self' blob:",
      "upgrade-insecure-requests",
    ].join('; ');

    const security = [
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(self)',
      },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      },
      { key: 'Content-Security-Policy', value: csp },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
    ];
    return [
      {
        source: '/:path*',
        headers: security,
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

// Wrapping con next-intl primero, luego Sentry
const configWithIntl = withNextIntl(nextConfig);

export default withSentryConfig(configWithIntl, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: undefined,
  project: undefined,

  // Only print logs for uploading source maps in CI
  silent: true,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that this configured value matches your `publicPath` if you're using Apex Charts or similar libraries.
  // tunnelRoute: "/monitoring",

  // Sustituye hideSourceMaps (SDK v10+): control de source maps vía SentryBuildOptions
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
    // Automatically create cron monitors for Vercel Cron Jobs (if configured via vercel.json).
    automaticVercelMonitors: true,
  },
});
