import { sql } from '@vercel/postgres';

// Eventos locales de Fuengirola que afectan la demanda
const LOCAL_EVENTS = [
  {
    title: "Feria de Fuengirola",
    startsAt: "2024-09-15T00:00:00Z",
    endsAt: "2024-09-22T23:59:59Z",
    venue: "Centro de Fuengirola",
    city: "Fuengirola",
    impact: 4,
    distance: 0.5
  },
  {
    title: "Festival de Música en el Puerto",
    startsAt: "2024-09-28T20:00:00Z", 
    endsAt: "2024-09-29T02:00:00Z",
    venue: "Puerto Deportivo",
    city: "Fuengirola",
    impact: 3,
    distance: 1.2
  },
  {
    title: "Mercado Artesanal Los Boliches",
    startsAt: "2024-09-07T10:00:00Z",
    endsAt: "2024-09-07T18:00:00Z", 
    venue: "Plaza de Los Boliches",
    city: "Fuengirola",
    impact: 2,
    distance: 0.8
  },
  {
    title: "Semana de la Tapa",
    startsAt: "2024-09-10T12:00:00Z",
    endsAt: "2024-09-16T23:59:59Z",
    venue: "Centro y Puerto",
    city: "Fuengirola", 
    impact: 2,
    distance: 0.3
  },
  {
    title: "Fiesta de la Virgen del Carmen",
    startsAt: "2024-09-08T18:00:00Z",
    endsAt: "2024-09-08T23:59:59Z",
    venue: "Iglesia del Carmen",
    city: "Fuengirola",
    impact: 2,
    distance: 0.4
  }
];

/**
 * Inicializa eventos locales de Fuengirola en la base de datos
 */
export async function initializeLocalEvents(): Promise<void> {
  console.log('🎉 Inicializando eventos locales de Fuengirola...');
  
  for (const event of LOCAL_EVENTS) {
    try {
      await sql`
        INSERT INTO local_events (title, starts_at, ends_at, venue, city, impact_level, distance_km, source)
        VALUES (${event.title}, ${event.startsAt}, ${event.endsAt}, ${event.venue}, ${event.city}, ${event.impact}, ${event.distance}, 'fuengirola_local')
        ON CONFLICT (title, starts_at) DO UPDATE SET
          ends_at = EXCLUDED.ends_at,
          venue = EXCLUDED.venue,
          city = EXCLUDED.city,
          impact_level = EXCLUDED.impact_level,
          distance_km = EXCLUDED.distance_km,
          updated_at = NOW()
      `;
      console.log(`✅ Evento agregado: ${event.title}`);
    } catch (error) {
      console.error(`❌ Error agregando evento ${event.title}:`, error);
    }
  }
}

/**
 * Obtiene eventos próximos de Fuengirola
 */
export async function getUpcomingFuengirolaEvents(days: number = 30): Promise<Array<{
  title: string;
  startsAt: string;
  endsAt: string;
  venue: string;
  impact: number;
  distance: number;
}>> {
  try {
    const result = await sql`
      SELECT 
        title,
        starts_at,
        ends_at,
        venue,
        impact_level as impact,
        distance_km as distance
      FROM local_events
      WHERE starts_at >= NOW()
        AND starts_at <= NOW() + INTERVAL '${days} days'
        AND source = 'fuengirola_local'
      ORDER BY starts_at ASC
    `;
    
    return result.rows.map(row => ({
      title: row.title,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      venue: row.venue,
      impact: row.impact,
      distance: row.distance
    }));
  } catch (error) {
    console.error('Error obteniendo eventos de Fuengirola:', error);
    return [];
  }
}

/**
 * Calcula el impacto total de eventos para una fecha específica
 */
export async function getEventImpactForDate(date: string): Promise<{
  totalImpact: number;
  events: Array<{ title: string; impact: number; distance: number }>;
}> {
  try {
    const result = await sql`
      SELECT 
        title,
        impact_level as impact,
        distance_km as distance
      FROM local_events
      WHERE starts_at::date <= ${date}
        AND ends_at::date >= ${date}
        AND source = 'fuengirola_local'
      ORDER BY impact_level DESC
    `;
    
    const events = result.rows.map(row => ({
      title: row.title,
      impact: row.impact,
      distance: row.distance
    }));
    
    const totalImpact = events.reduce((sum, event) => {
      // Reducir impacto por distancia (más cerca = más impacto)
      const distanceFactor = Math.max(0.1, 1 - (event.distance / 5));
      return sum + (event.impact * distanceFactor);
    }, 0);
    
    return {
      totalImpact: Math.min(5, totalImpact), // Máximo impacto de 5
      events
    };
  } catch (error) {
    console.error('Error calculando impacto de eventos:', error);
    return {
      totalImpact: 0,
      events: []
    };
  }
}
