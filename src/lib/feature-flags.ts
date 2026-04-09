export function isMarketIntelligenceEnabled(): boolean {
  // Desactivado por defecto hasta integrar una fuente fiable de eventos/precios.
  return process.env.NEXT_PUBLIC_MARKET_INTELLIGENCE_ENABLED === 'true';
}

