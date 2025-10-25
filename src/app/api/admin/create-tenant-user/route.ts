import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { generateTokenPair } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// POST: Crear usuario para un tenant
export async function POST(request: NextRequest) {
  try {
    // Para desarrollo, permitir sin autenticación
    // En producción, deberías añadir autenticación aquí

    const { tenantId, email, password, role = 'owner' } = await request.json();
    
    if (!tenantId || !email) {
      return NextResponse.json(
        { error: 'tenantId y email son obligatorios' },
        { status: 400 }
      );
    }

    // Verificar que el tenant existe
    const tenantResult = await sql`
      SELECT id, name, email
      FROM tenants
      WHERE id = ${tenantId}
    `;
    
    if (tenantResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }
    
    const tenant = tenantResult.rows[0];
    
    // Verificar que no existe ya un usuario con ese email para ese tenant
    const existingUser = await sql`
      SELECT id
      FROM tenant_users
      WHERE tenant_id = ${tenantId} AND email = ${email}
    `;
    
    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con ese email para este tenant' },
        { status: 409 }
      );
    }
    
    // Generar contraseña si no se proporciona
    const finalPassword = password || 'temp123456';
    const passwordHash = await bcrypt.hash(finalPassword, 12);
    
    // Crear usuario
    const userResult = await sql`
      INSERT INTO tenant_users (
        tenant_id, email, password_hash, role, is_active, email_verified
      ) VALUES (
        ${tenantId}, ${email}, ${passwordHash}, ${role}, true, true
      )
      RETURNING id, email, role
    `;
    
    const newUser = userResult.rows[0];
    
    // Generar token para el nuevo usuario
    const tokenPair = generateTokenPair({
      userId: newUser.id,
      tenantId: tenantId,
      email: email,
      role: role
    });
    
    // Actualizar usuario con el token
    await sql`
      UPDATE tenant_users
      SET auth_token = ${tokenPair.accessToken}
      WHERE id = ${newUser.id}
    `;
    
    return NextResponse.json({
      success: true,
      message: `Usuario creado para ${tenant.name}`,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        tenant_name: tenant.name,
        has_token: true
      }
    });
    
  } catch (error) {
    console.error('❌ Error creando usuario:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}
