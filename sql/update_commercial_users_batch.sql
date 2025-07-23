-- Script para actualizar múltiples usuarios a rol "commercial"
-- Script con los IDs reales de los usuarios de Supabase

-- Función para actualizar un usuario a rol commercial
CREATE OR REPLACE FUNCTION update_user_to_commercial(user_id UUID, user_email TEXT, user_name TEXT)
RETURNS VOID AS $$
BEGIN
  -- Actualizar metadatos en auth.users
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object(
    'email_verified', true,
    'role', 'commercial',
    'name', user_name
  )
  WHERE id = user_id;
  
  -- Insertar/actualizar en tabla users si existe
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    INSERT INTO public.users (id, email, name, role, created_at, updated_at)
    VALUES 
      (user_id, user_email, user_name, 'commercial', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE 
    SET 
      name = user_name,
      role = 'commercial',
      updated_at = NOW();
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Actualizar cada usuario con sus IDs reales
-- Alexis
SELECT update_user_to_commercial('cdb8f94b-fd25-48ce-803d-6c805ed03f95', 'alexis@hemibrands.com', 'Alexis');

-- Allia
SELECT update_user_to_commercial('639d56b7-5c1f-478d-89dc-ef3d7c943344', 'allia@hemibrands.com', 'Allia');

-- Danielle
SELECT update_user_to_commercial('673a9757-dc9f-447d-b9b2-719423dc8a28', 'bdanielle@hemibrands.com', 'Danielle');

-- Denise
SELECT update_user_to_commercial('0821bd57-99ac-4382-a634-cc5883032813', 'denise@hemibrands.com', 'Denise');

-- Erica
SELECT update_user_to_commercial('a55106ad-444f-49af-9e2b-76ba197dba56', 'erica@hemibrands.com', 'Erica');

-- Fabio
SELECT update_user_to_commercial('cbbe4153-8398-4125-8dc8-67b2bf589989', 'fabio@hemibrands.com', 'Fabio');

-- Gail
SELECT update_user_to_commercial('b32b2009-577c-4c63-8525-58cb7b7f3ab6', 'gail@hemibrands.com', 'Gail');

-- Ivana
SELECT update_user_to_commercial('cb43471d-10aa-4e92-b838-cbeef3e89dd3', 'ivana@hemibrands.com', 'Ivana');

-- Josue
SELECT update_user_to_commercial('493a4d65-1467-40bc-a3e0-e192f9db66db', 'josue@hemibrands.com', 'Josue');

-- Landon
SELECT update_user_to_commercial('21d07421-5467-486c-b367-0a9366c88b04', 'landon@hemibrands.com', 'Landon');

-- Meredith
SELECT update_user_to_commercial('f576edae-9cf9-4a08-89fd-1a76da4b0ca3', 'meredith@hemibrands.com', 'Meredith');

-- Nancy
SELECT update_user_to_commercial('b1363186-4ac3-4a18-a2ec-8a8784574378', 'nancy@hemibrands.com', 'Nancy');

-- Sharon
SELECT update_user_to_commercial('d1bf8fc2-327a-4202-b3f8-aeb765821691', 'sharon@hemibrands.com', 'Sharon');

-- Suzanne
SELECT update_user_to_commercial('d7548711-c9e6-4a8e-a067-68330835c206', 'suzanne@hemibrands.com', 'Suzanne');

-- Tara
SELECT update_user_to_commercial('3a01a4e4-34f5-40aa-8cf2-08b03201564e', 'tara@hemibrands.com', 'Tara');

-- Tim
SELECT update_user_to_commercial('fe84a9e7-d2b6-4b82-b969-60b1df2b9195', 'timhs@hemibrands.com', 'Tim');

-- Verificar que todos los usuarios se hayan actualizado correctamente
SELECT id, email, raw_user_meta_data
FROM auth.users
WHERE id IN (
  '639d56b7-5c1f-478d-89dc-ef3d7c943344', -- allia
  'cdb8f94b-fd25-48ce-803d-6c805ed03f95', -- alexis
  '673a9757-dc9f-447d-b9b2-719423dc8a28', -- bdanielle
  '0821bd57-99ac-4382-a634-cc5883032813', -- denise
  'a55106ad-444f-49af-9e2b-76ba197dba56', -- erica
  'cbbe4153-8398-4125-8dc8-67b2bf589989', -- fabio
  'b32b2009-577c-4c63-8525-58cb7b7f3ab6', -- gail
  'cb43471d-10aa-4e92-b838-cbeef3e89dd3', -- ivana
  '493a4d65-1467-40bc-a3e0-e192f9db66db', -- josue
  '21d07421-5467-486c-b367-0a9366c88b04', -- landon
  'f576edae-9cf9-4a08-89fd-1a76da4b0ca3', -- meredith
  'b1363186-4ac3-4a18-a2ec-8a8784574378', -- nancy
  'd1bf8fc2-327a-4202-b3f8-aeb765821691', -- sharon
  'd7548711-c9e6-4a8e-a067-68330835c206', -- suzanne
  '3a01a4e4-34f5-40aa-8cf2-08b03201564e', -- tara
  'fe84a9e7-d2b6-4b82-b969-60b1df2b9195'  -- timhs
);

-- Limpiar la función temporal
DROP FUNCTION update_user_to_commercial;
