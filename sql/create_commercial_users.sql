-- Script simplificado para crear un usuario comercial
-- Ejecutar este script en la consola SQL de Supabase

-- Crear usuario comercial en la tabla users
INSERT INTO public.users (id, email, name, role, created_at, updated_at)
VALUES 
    (gen_random_uuid(), 'ivana@hemibrands.com', 'Ivana', 'commercial', NOW(), NOW())
ON CONFLICT (email) DO UPDATE 
SET 
    name = 'Ivana',
    role = 'commercial',
    updated_at = NOW();

-- Verificar que el usuario se haya creado correctamente
SELECT id, email, name, role, created_at, updated_at 
FROM public.users 
WHERE email = 'ivana@hemibrands.com';

-- NOTA: Para crear un usuario en auth.users con contraseña, necesitarías usar
-- la API de Supabase o la interfaz de administración, ya que la contraseña
-- debe estar encriptada correctamente. Este script solo crea/actualiza
-- el usuario en la tabla personalizada 'users'.
