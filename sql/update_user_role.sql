-- Actualizar los metadatos del usuario para asignarle el rol comercial
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
  'email_verified', true,
  'role', 'commercial',
  'name', 'Ivana'
)
WHERE id = '183d9674-0268-4d8b-8393-8a0eac57ed5b';

-- Verificar que se haya actualizado correctamente
SELECT id, email, raw_user_meta_data
FROM auth.users
WHERE id = '183d9674-0268-4d8b-8393-8a0eac57ed5b';

-- Insertar el usuario en la tabla personalizada users si existe
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    INSERT INTO public.users (id, email, name, role, created_at, updated_at)
    VALUES 
      ('183d9674-0268-4d8b-8393-8a0eac57ed5b', 'ivana@hemibrands.com', 'Ivana', 'commercial', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE 
    SET 
      name = 'Ivana',
      role = 'commercial',
      updated_at = NOW();
      
    RAISE NOTICE 'Usuario insertado/actualizado en la tabla users';
  ELSE
    RAISE NOTICE 'La tabla users no existe, solo se actualizaron los metadatos en auth.users';
  END IF;
END $$;
