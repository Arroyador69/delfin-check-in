-- Script para actualizar la tabla reservations con los nuevos campos
-- Ejecutar este script para añadir los campos guest_phone y guest_count

-- Añadir columna guest_phone si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' 
                   AND column_name = 'guest_phone') THEN
        ALTER TABLE reservations ADD COLUMN guest_phone VARCHAR(50);
    END IF;
END $$;

-- Añadir columna guest_count si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' 
                   AND column_name = 'guest_count') THEN
        ALTER TABLE reservations ADD COLUMN guest_count INTEGER DEFAULT 1 CHECK (guest_count > 0);
    END IF;
END $$;

-- Actualizar registros existentes que tengan guest_count NULL
UPDATE reservations 
SET guest_count = 1 
WHERE guest_count IS NULL;

-- Añadir comentarios a las nuevas columnas
COMMENT ON COLUMN reservations.guest_phone IS 'Teléfono de contacto del huésped';
COMMENT ON COLUMN reservations.guest_count IS 'Número de personas en la reserva';

-- Verificar que los cambios se aplicaron correctamente
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'reservations' 
AND column_name IN ('guest_phone', 'guest_count')
ORDER BY column_name;
