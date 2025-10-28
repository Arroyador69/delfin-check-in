import { sql } from '@/lib/db';

// Tipos para el sistema de precios dinámicos
export interface PricingFactors {
  basePrice: number;
  marketP40: number;
  leadDays: number;
  occupancyPct7d: number;
  eventImpact: number;
  dayOfWeek: number; // 0-6 (domingo-sábado)
  floor: number;
  ceiling: number;
  weekendMultiplier?: number;
  eventImpactFactor?: number;
  lowOccupancyMultiplier?: number;
  highOccupancyMultiplier?: number;
}

export interface PriceRecommendation {
  date: string;
  roomId: string;
  currentPrice: number;
  recommendedPrice: number;
  basePrice: number;
  marketP40: number;
  factors: {
    market: number;
    leadTime: number;
    occupancy: number;
    event: number;
    weekend: number;
    total: number;
  };
  confidence: number;
  applied: boolean;
}

export interface MarketData {
  date: string;
  p25: number;
  p40: number;
  p50: number;
  p75: number;
  sampleSize: number;
}

export interface EventData {
  id: number;
  title: string;
  startsAt: string;
  endsAt: string;
  venue: string;
  impactLevel: number;
  distanceKm: number;
}

/**
 * Calcula el precio recomendado basado en múltiples factores
 */
export function calculateRecommendedPrice(params: PricingFactors): {
  price: number;
  factors: {
    market: number;
    leadTime: number;
    occupancy: number;
    event: number;
    weekend: number;
    total: number;
  };
} {
  const {
    basePrice,
    marketP40,
    leadDays,
    occupancyPct7d,
    eventImpact,
    dayOfWeek,
    floor,
    ceiling,
    weekendMultiplier = 1.12,
    eventImpactFactor = 0.03,
    lowOccupancyMultiplier = 0.9,
    highOccupancyMultiplier = 1.15
  } = params;

  // Factor de mercado: anclar al percentil 40 del mercado
  const marketFactor = marketP40 / Math.max(1, basePrice);

  // Factor de antelación: más caro si hay poca disponibilidad temporal
  const leadTimeFactor = leadDays < 3 ? 1.12 : leadDays > 30 ? 0.95 : 1.0;

  // Factor de ocupación: ajustar según demanda
  const occupancyFactor = occupancyPct7d < 40 
    ? lowOccupancyMultiplier 
    : occupancyPct7d > 80 
      ? highOccupancyMultiplier 
      : 1.0;

  // Factor de eventos: +3% por nivel de impacto
  const eventFactor = 1 + (eventImpact * eventImpactFactor);

  // Factor de fin de semana
  const weekendFactor = (dayOfWeek === 5 || dayOfWeek === 6) ? weekendMultiplier : 1.0;

  // Cálculo final
  const totalFactor = marketFactor * leadTimeFactor * occupancyFactor * eventFactor * weekendFactor;
  const rawPrice = basePrice * totalFactor;
  
  // Aplicar límites
  const finalPrice = Math.min(ceiling, Math.max(floor, Math.round(rawPrice * 100) / 100));

  return {
    price: finalPrice,
    factors: {
      market: Math.round(marketFactor * 100) / 100,
      leadTime: Math.round(leadTimeFactor * 100) / 100,
      occupancy: Math.round(occupancyFactor * 100) / 100,
      event: Math.round(eventFactor * 100) / 100,
      weekend: Math.round(weekendFactor * 100) / 100,
      total: Math.round(totalFactor * 100) / 100
    }
  };
}

/**
 * Obtiene datos de mercado (percentiles) para un rango de fechas
 * Prioriza competidores locales de Fuengirola
 */
export async function getMarketData(
  startDate: string,
  endDate: string,
  roomType: string = 'standard'
): Promise<MarketData[]> {
  const result = await sql`
    SELECT 
      cdp.date,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY cdp.price) as p25,
      PERCENTILE_CONT(0.40) WITHIN GROUP (ORDER BY cdp.price) as p40,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY cdp.price) as p50,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY cdp.price) as p75,
      COUNT(*) as sample_size
    FROM competitor_daily_prices cdp
    JOIN competitor_listings cl ON cdp.listing_id = cl.id
    WHERE cdp.date BETWEEN ${startDate} AND ${endDate}
      AND cdp.room_type = ${roomType}
      AND cdp.price IS NOT NULL
      AND cdp.availability = true
      AND cl.source = 'fuengirola_local'  -- Priorizar competidores locales
    GROUP BY cdp.date
    ORDER BY cdp.date
  `;

  return result.rows as MarketData[];
}

/**
 * Obtiene eventos locales para un rango de fechas
 */
export async function getLocalEvents(
  startDate: string,
  endDate: string
): Promise<EventData[]> {
  const result = await sql`
    SELECT 
      id,
      title,
      starts_at,
      ends_at,
      venue,
      impact_level,
      COALESCE(distance_km, 0) as distance_km
    FROM local_events 
    WHERE starts_at BETWEEN ${startDate}::timestamp AND ${endDate}::timestamp
      AND impact_level > 0
    ORDER BY starts_at
  `;

  return result.rows as EventData[];
}

/**
 * Obtiene ocupación propia para un rango de fechas
 */
export async function getMyOccupancy(
  startDate: string,
  endDate: string
): Promise<Array<{ date: string; occupancyPct: number }>> {
  const result = await sql`
    SELECT 
      date,
      occupancy_pct
    FROM my_occupancy 
    WHERE date BETWEEN ${startDate} AND ${endDate}
    ORDER BY date
  `;

  return result.rows as Array<{ date: string; occupancyPct: number }>;
}

/**
 * Genera recomendaciones de precios para una habitación y rango de fechas
 */
export async function generatePriceRecommendations(
  roomId: string,
  startDate: string,
  endDate: string
): Promise<PriceRecommendation[]> {
  // Obtener configuración de la habitación
  const configResult = await sql`
    SELECT * FROM pricing_config WHERE room_id = ${roomId}
  `;
  
  if (configResult.rows.length === 0) {
    throw new Error(`No se encontró configuración para la habitación ${roomId}`);
  }
  
  const config = configResult.rows[0];

  // Obtener datos de mercado
  const marketData = await getMarketData(startDate, endDate);
  const marketMap = new Map(marketData.map(d => [d.date, d]));

  // Obtener eventos locales
  const events = await getLocalEvents(startDate, endDate);
  const eventsMap = new Map<string, EventData[]>();
  
  events.forEach(event => {
    const eventDate = new Date(event.startsAt).toISOString().split('T')[0];
    if (!eventsMap.has(eventDate)) {
      eventsMap.set(eventDate, []);
    }
    eventsMap.get(eventDate)!.push(event);
  });

  // Obtener ocupación propia
  const occupancyData = await getMyOccupancy(startDate, endDate);
  const occupancyMap = new Map(occupancyData.map(d => [d.date, d.occupancyPct]));

  // Generar recomendaciones día por día
  const recommendations: PriceRecommendation[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = d.getDay();
    
    // Calcular días de antelación
    const leadDays = Math.ceil((d.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    // Obtener datos del mercado para esta fecha
    const market = marketMap.get(dateStr);
    const marketP40 = market?.p40 || config.base_price;
    
    // Calcular ocupación promedio de los próximos 7 días
    let occupancyPct7d = 50; // valor por defecto
    if (occupancyMap.has(dateStr)) {
      occupancyPct7d = occupancyMap.get(dateStr)!;
    }
    
    // Calcular impacto de eventos
    const dayEvents = eventsMap.get(dateStr) || [];
    const maxEventImpact = dayEvents.length > 0 
      ? Math.max(...dayEvents.map(e => e.impactLevel))
      : 0;

    // Calcular precio recomendado
    const result = calculateRecommendedPrice({
      basePrice: config.base_price,
      marketP40,
      leadDays,
      occupancyPct7d,
      eventImpact: maxEventImpact,
      dayOfWeek,
      floor: config.min_price,
      ceiling: config.max_price,
      weekendMultiplier: config.weekend_multiplier,
      eventImpactFactor: config.event_impact_factor,
      lowOccupancyMultiplier: config.low_occupancy_multiplier,
      highOccupancyMultiplier: config.high_occupancy_multiplier
    });

    // Obtener precio actual (si existe)
    const currentPriceResult = await sql`
      SELECT price FROM price_recommendations 
      WHERE room_id = ${roomId} AND date = ${dateStr}
    `;
    
    const currentPrice = currentPriceResult.rows[0]?.price || config.base_price;

    // Calcular confianza basada en datos disponibles
    const confidence = Math.min(1.0, 
      (market?.sampleSize || 0) / 10 * 0.4 + // 40% por tamaño de muestra
      (maxEventImpact > 0 ? 1 : 0.5) * 0.3 + // 30% por eventos
      (occupancyMap.has(dateStr) ? 1 : 0.3) * 0.3 // 30% por datos de ocupación
    );

    recommendations.push({
      date: dateStr,
      roomId,
      currentPrice,
      recommendedPrice: result.price,
      basePrice: config.base_price,
      marketP40,
      factors: result.factors,
      confidence: Math.round(confidence * 100) / 100,
      applied: false
    });
  }

  return recommendations;
}

/**
 * Guarda recomendaciones de precios en la base de datos
 */
export async function savePriceRecommendations(
  recommendations: PriceRecommendation[]
): Promise<void> {
  for (const rec of recommendations) {
    await sql`
      INSERT INTO price_recommendations (
        room_id, date, current_price, recommended_price, base_price,
        market_p40, factors, confidence_score, applied
      ) VALUES (
        ${rec.roomId}, ${rec.date}, ${rec.currentPrice}, ${rec.recommendedPrice},
        ${rec.basePrice}, ${rec.marketP40}, ${JSON.stringify(rec.factors)},
        ${rec.confidence}, ${rec.applied}
      )
      ON CONFLICT (room_id, date) 
      DO UPDATE SET
        current_price = EXCLUDED.current_price,
        recommended_price = EXCLUDED.recommended_price,
        base_price = EXCLUDED.base_price,
        market_p40 = EXCLUDED.market_p40,
        factors = EXCLUDED.factors,
        confidence_score = EXCLUDED.confidence_score
    `;
  }
}

/**
 * Aplica una recomendación de precio (actualiza el precio de la habitación)
 */
export async function applyPriceRecommendation(
  roomId: string,
  date: string,
  newPrice: number
): Promise<void> {
  // Marcar como aplicada
  await sql`
    UPDATE price_recommendations 
    SET applied = true 
    WHERE room_id = ${roomId} AND date = ${date}
  `;

  // Aquí podrías actualizar el precio en tu sistema de reservas
  // Por ejemplo, actualizar la tabla rooms con precios dinámicos
  // o enviar a tu API de gestión de precios
  
  console.log(`Precio aplicado: ${roomId} - ${date} - €${newPrice}`);
}

/**
 * Obtiene recomendaciones existentes para un rango de fechas
 */
export async function getPriceRecommendations(
  roomId: string,
  startDate: string,
  endDate: string
): Promise<PriceRecommendation[]> {
  const result = await sql`
    SELECT 
      room_id as "roomId",
      date,
      current_price as "currentPrice",
      recommended_price as "recommendedPrice",
      base_price as "basePrice",
      market_p40 as "marketP40",
      factors,
      confidence_score as "confidence",
      applied
    FROM price_recommendations 
    WHERE room_id = ${roomId} 
      AND date BETWEEN ${startDate} AND ${endDate}
    ORDER BY date
  `;

  return result.rows as PriceRecommendation[];
}
