import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * API para obtener envíos de formularios del tenant actual
 * Solo accesible para usuarios autenticados del tenant
 */
export async function GET(req: NextRequest) {
  try {
    // Obtener tenant_id del header (enviado por el middleware)
    const tenantId = req.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No se pudo identificar el tenant' },
        { status: 400 }
      );
    }

    // Obtener parámetros de consulta
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const offset = (page - 1) * limit;

    // Construir query con filtros
    let whereClause = `WHERE fs.tenant_id = $1`;
    const queryParams = [tenantId];
    let paramIndex = 2;

    if (search) {
      whereClause += ` AND (fs.name ILIKE $${paramIndex} OR fs.email ILIKE $${paramIndex} OR fs.message ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Query principal
    const submissionsQuery = `
      SELECT 
        fs.id,
        fs.name,
        fs.email,
        fs.phone,
        fs.checkin,
        fs.checkout,
        fs.guests,
        fs.room_type,
        fs.message,
        fs.form_data,
        fs.ip_address,
        fs.created_at,
        fs.updated_at
      FROM form_submissions fs
      ${whereClause}
      ORDER BY fs.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    // Query de conteo total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM form_submissions fs
      ${whereClause}
    `;

    const countParams = queryParams.slice(0, paramIndex - 2);

    // Ejecutar queries
    const [submissionsResult, countResult] = await Promise.all([
      sql.query(submissionsQuery, queryParams),
      sql.query(countQuery, countParams)
    ]);

    const submissions = submissionsResult.rows;
    const total = parseInt(countResult.rows[0].total);

    // Estadísticas adicionales
    const statsQuery = `
      SELECT 
        COUNT(*) as total_submissions,
        COUNT(CASE WHEN fs.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as submissions_last_7_days,
        COUNT(CASE WHEN fs.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as submissions_last_30_days,
        COUNT(CASE WHEN fs.checkin IS NOT NULL THEN 1 END) as submissions_with_dates,
        COUNT(CASE WHEN fs.guests IS NOT NULL THEN 1 END) as submissions_with_guests
      FROM form_submissions fs
      WHERE fs.tenant_id = $1
    `;

    const statsResult = await sql.query(statsQuery, [tenantId]);
    const stats = statsResult.rows[0];

    console.log(`📊 Obtenidos ${submissions.length} envíos de formulario para tenant ${tenantId}`);

    return NextResponse.json({
      submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      stats: {
        total_submissions: parseInt(stats.total_submissions),
        submissions_last_7_days: parseInt(stats.submissions_last_7_days),
        submissions_last_30_days: parseInt(stats.submissions_last_30_days),
        submissions_with_dates: parseInt(stats.submissions_with_dates),
        submissions_with_guests: parseInt(stats.submissions_with_guests)
      }
    });

  } catch (error) {
    console.error('Error obteniendo envíos de formularios:', error);
    return NextResponse.json(
      { error: 'Error al obtener envíos de formularios' },
      { status: 500 }
    );
  }
}
