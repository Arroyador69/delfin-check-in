import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdfkit'],
  images: {
    domains: ['localhost', 'supabase.co'],
  },
  // Excluir carpeta scripts de la compilación
  webpack: (config, { isServer }) => {
    config.watchOptions = {
      ignored: ['**/scripts/**']
    };
    return config;
  },
  // Configuración PWA simplificada
  async headers() {
    return [
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

export default nextConfig;
