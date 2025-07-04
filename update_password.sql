-- Script para actualizar la contraseña del usuario existente
-- Ejecutar en la consola SQL de Supabase

-- Actualizar la contraseña del usuario existente
UPDATE auth.users
SET 
    encrypted_password = crypt('admin123', gen_salt('bf')),
    raw_user_meta_data = '{"name": "German Rosental", "role": "admin"}'
WHERE email = 'german.rosental@gmail.com';

-- Asegurarse de que el usuario existe en public.users
INSERT INTO public.users (id, email, name, role)
SELECT id, email, 'German Rosental' as name, 'admin' as role
FROM auth.users
WHERE email = 'german.rosental@gmail.com'
ON CONFLICT (id) DO UPDATE
SET name = 'German Rosental', role = 'admin';

-- También actualizar por email en caso de que el ID haya cambiado
UPDATE public.users
SET 
    id = (SELECT id FROM auth.users WHERE email = 'german.rosental@gmail.com'),
    name = 'German Rosental',
    role = 'admin'
WHERE email = 'german.rosental@gmail.com';

-- Mostrar el usuario actualizado
SELECT 
    a.id, 
    a.email, 
    a.raw_user_meta_data,
    u.name,
    u.role
FROM 
    auth.users a
    LEFT JOIN public.users u ON a.id = u.id
WHERE 
    a.email = 'german.rosental@gmail.com';
