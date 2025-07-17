-- Script para verificar y crear usuarios comerciales de prueba
-- Este script debe ejecutarse en la consola SQL de Supabase

-- 1. Verificar si existen usuarios comerciales
SELECT 
  id, email, raw_user_meta_data->>'name' as name, raw_user_meta_data->>'role' as role
FROM 
  auth.users
WHERE 
  raw_user_meta_data->>'role' = 'commercial';

-- 2. Verificar si existe la tabla users personalizada
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'users'
);

-- 3. Si existe la tabla users, verificar usuarios comerciales allí
-- Descomenta esta consulta si la tabla users existe
/*
SELECT 
  id, name, email, role
FROM 
  public.users
WHERE 
  role = 'commercial';
*/

-- 4. Verificar si existe la función RPC get_commercial_users
SELECT EXISTS (
  SELECT FROM pg_proc
  WHERE proname = 'get_commercial_users'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
);

-- 5. Probar la función get_commercial_users si existe
-- Descomenta esta consulta si la función existe
/*
SELECT * FROM get_commercial_users();
*/

-- 6. Crear usuarios comerciales de prueba si no existen
-- NOTA: Esto solo actualiza los metadatos de usuarios existentes
-- Para crear nuevos usuarios, usa la interfaz de Supabase Auth o la API de autenticación

-- Ejemplo para actualizar un usuario existente a rol comercial
-- Reemplaza 'ID_DEL_USUARIO' con un ID real de un usuario existente
/*
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "commercial", "name": "Usuario Comercial 1"}'::jsonb
WHERE id = 'ID_DEL_USUARIO';
*/

-- 7. Verificar permisos de la función get_commercial_users
SELECT 
  grantee, privilege_type
FROM 
  information_schema.routine_privileges
WHERE 
  routine_name = 'get_commercial_users'
  AND routine_schema = 'public';
