-- Script para limpiar completamente un usuario de la base de datos
-- Útil para testing: elimina todas las referencias de un email
-- 
-- USO: Reemplaza 'EMAIL_AQUI' con el email que quieres limpiar
-- Ejemplo: SELECT clean_user_completely('alberto80558@gmail.com');

CREATE OR REPLACE FUNCTION clean_user_completely(user_email VARCHAR)
RETURNS TABLE(
  deleted_from_waitlist BOOLEAN,
  deleted_from_tenants BOOLEAN,
  deleted_from_tenant_users BOOLEAN,
  deleted_from_referrals BOOLEAN,
  deleted_from_affiliate_customers BOOLEAN,
  tenant_id_deleted UUID
) AS $$
DECLARE
  tenant_uuid UUID;
  deleted_waitlist BOOLEAN := false;
  deleted_tenants BOOLEAN := false;
  deleted_tenant_users BOOLEAN := false;
  deleted_referrals BOOLEAN := false;
  deleted_affiliate_customers BOOLEAN := false;
BEGIN
  -- 1. Obtener tenant_id si existe
  SELECT id INTO tenant_uuid FROM tenants WHERE email = user_email LIMIT 1;
  
  -- 2. Eliminar de affiliate_customers (si existe tenant_id)
  IF tenant_uuid IS NOT NULL THEN
    DELETE FROM affiliate_customers WHERE tenant_id = tenant_uuid;
    IF FOUND THEN
      deleted_affiliate_customers := true;
    END IF;
  END IF;
  
  -- 3. Eliminar de referrals (como referido y como referente)
  IF tenant_uuid IS NOT NULL THEN
    DELETE FROM referrals WHERE referred_tenant_id = tenant_uuid OR referrer_tenant_id = tenant_uuid;
    IF FOUND THEN
      deleted_referrals := true;
    END IF;
  END IF;
  
  -- 4. Eliminar tenant_users (se elimina automáticamente con CASCADE, pero lo hacemos explícito)
  IF tenant_uuid IS NOT NULL THEN
    DELETE FROM tenant_users WHERE tenant_id = tenant_uuid;
    IF FOUND THEN
      deleted_tenant_users := true;
    END IF;
  END IF;
  
  -- 5. Eliminar de tenants (esto debería eliminar en cascada tenant_users)
  IF tenant_uuid IS NOT NULL THEN
    DELETE FROM tenants WHERE id = tenant_uuid;
    IF FOUND THEN
      deleted_tenants := true;
    END IF;
  END IF;
  
  -- 6. Eliminar de waitlist
  DELETE FROM waitlist WHERE email = user_email;
  IF FOUND THEN
    deleted_waitlist := true;
  END IF;
  
  -- Retornar resultados
  RETURN QUERY SELECT 
    deleted_waitlist,
    deleted_tenants,
    deleted_tenant_users,
    deleted_referrals,
    deleted_affiliate_customers,
    tenant_uuid;
END;
$$ LANGUAGE plpgsql;

-- Función de ayuda para limpiar múltiples emails
CREATE OR REPLACE FUNCTION clean_multiple_users(user_emails VARCHAR[])
RETURNS TABLE(
  email VARCHAR,
  deleted_from_waitlist BOOLEAN,
  deleted_from_tenants BOOLEAN,
  deleted_from_tenant_users BOOLEAN,
  deleted_from_referrals BOOLEAN,
  deleted_from_affiliate_customers BOOLEAN,
  tenant_id_deleted UUID
) AS $$
DECLARE
  email_item VARCHAR;
BEGIN
  FOREACH email_item IN ARRAY user_emails
  LOOP
    RETURN QUERY SELECT 
      email_item,
      r.deleted_from_waitlist,
      r.deleted_from_tenants,
      r.deleted_from_tenant_users,
      r.deleted_from_referrals,
      r.deleted_from_affiliate_customers,
      r.tenant_id_deleted
    FROM clean_user_completely(email_item) r;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Ejemplos de uso:
-- SELECT * FROM clean_user_completely('alberto80558@gmail.com');
-- SELECT * FROM clean_user_completely('sigmabya.arroyo@gmail.com');
-- SELECT * FROM clean_multiple_users(ARRAY['alberto80558@gmail.com', 'sigmabya.arroyo@gmail.com']);
