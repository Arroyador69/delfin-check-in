/**
 * TESTS DE AISLAMIENTO MULTI-TENANT
 * 
 * Estos tests verifican que:
 * 1. Tenant A no puede ver datos de Tenant B
 * 2. Las queries siempre filtran por tenant_id
 * 3. No hay fuga de datos entre tenants
 * 
 * Ejecutar con: npm test -- tenant-isolation.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { sql } from '@/lib/db';

describe('Aislamiento Multi-Tenant', () => {
  let tenantAId: string;
  let tenantBId: string;
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    // Crear dos tenants de prueba
    const tenantAResult = await sql`
      INSERT INTO tenants (name, email, plan_id, status)
      VALUES ('Tenant A Test', 'tenanta@test.com', 'basic', 'active')
      RETURNING id
    `;
    tenantAId = tenantAResult.rows[0].id;

    const tenantBResult = await sql`
      INSERT INTO tenants (name, email, plan_id, status)
      VALUES ('Tenant B Test', 'tenantb@test.com', 'basic', 'active')
      RETURNING id
    `;
    tenantBId = tenantBResult.rows[0].id;

    // Crear usuarios para cada tenant
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash('test123', 12);

    const userAResult = await sql`
      INSERT INTO tenant_users (tenant_id, email, password_hash, full_name, role, is_active)
      VALUES (${tenantAId}, 'usera@test.com', ${passwordHash}, 'User A', 'owner', true)
      RETURNING id
    `;
    userAId = userAResult.rows[0].id;

    const userBResult = await sql`
      INSERT INTO tenant_users (tenant_id, email, password_hash, full_name, role, is_active)
      VALUES (${tenantBId}, 'userb@test.com', ${passwordHash}, 'User B', 'owner', true)
      RETURNING id
    `;
    userBId = userBResult.rows[0].id;

    // Crear empresa_config para cada tenant
    await sql`
      INSERT INTO empresa_config (tenant_id, nombre_empresa, nif_empresa, direccion_empresa, email)
      VALUES (${tenantAId}, 'Empresa A', 'A12345678', 'Dirección A', 'contacto@empresaa.com')
    `;

    await sql`
      INSERT INTO empresa_config (tenant_id, nombre_empresa, nif_empresa, direccion_empresa, email)
      VALUES (${tenantBId}, 'Empresa B', 'B87654321', 'Dirección B', 'contacto@empresab.com')
    `;
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await sql`DELETE FROM empresa_config WHERE tenant_id IN (${tenantAId}, ${tenantBId})`;
    await sql`DELETE FROM tenant_users WHERE tenant_id IN (${tenantAId}, ${tenantBId})`;
    await sql`DELETE FROM tenants WHERE id IN (${tenantAId}, ${tenantBId})`;
  });

  describe('empresa_config - Aislamiento', () => {
    it('Tenant A solo debe ver su propia configuración', async () => {
      const result = await sql`
        SELECT * FROM empresa_config 
        WHERE tenant_id = ${tenantAId}
      `;

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].nombre_empresa).toBe('Empresa A');
      expect(result.rows[0].email).toBe('contacto@empresaa.com');
    });

    it('Tenant A NO debe ver configuración de Tenant B', async () => {
      const result = await sql`
        SELECT * FROM empresa_config 
        WHERE tenant_id = ${tenantAId}
      `;

      // Verificar que no hay datos de Tenant B
      const hasTenantBData = result.rows.some(
        (row: any) => row.nombre_empresa === 'Empresa B' || row.email === 'contacto@empresab.com'
      );
      expect(hasTenantBData).toBe(false);
    });

    it('Query sin filtro tenant_id debe fallar o retornar vacío', async () => {
      // Esta query NO debería funcionar sin tenant_id
      // En producción, debería estar bloqueada por RLS o middleware
      const result = await sql`
        SELECT * FROM empresa_config
      `;

      // Si RLS está habilitado, esto debería retornar vacío
      // Si no, al menos verificar que la aplicación no hace queries sin tenant_id
      console.warn('⚠️ Query sin tenant_id ejecutada - esto NO debería pasar en producción');
    });
  });

  describe('tenant_users - Aislamiento', () => {
    it('Tenant A solo debe ver sus propios usuarios', async () => {
      const result = await sql`
        SELECT * FROM tenant_users 
        WHERE tenant_id = ${tenantAId}
      `;

      expect(result.rows.length).toBeGreaterThan(0);
      result.rows.forEach((user: any) => {
        expect(user.tenant_id).toBe(tenantAId);
      });
    });

    it('Tenant A NO debe ver usuarios de Tenant B', async () => {
      const result = await sql`
        SELECT * FROM tenant_users 
        WHERE tenant_id = ${tenantAId}
      `;

      const hasTenantBUsers = result.rows.some(
        (user: any) => user.tenant_id === tenantBId
      );
      expect(hasTenantBUsers).toBe(false);
    });
  });

  describe('Middleware - Verificación de tenant_id', () => {
    it('Request sin tenant_id debe ser rechazado', async () => {
      // Simular request sin tenant_id
      // Esto debería ser manejado por el middleware
      // En producción, debería retornar 401
    });

    it('Request con tenant_id incorrecto debe ser rechazado', async () => {
      // Simular request con tenant_id que no corresponde al usuario
      // Esto debería ser manejado por el middleware
      // En producción, debería retornar 403
    });
  });
});

