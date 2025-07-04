-- Crear un usuario administrador en Supabase Auth
-- Ejecuta este script en la consola SQL de Supabase

-- 1. Crear el usuario en auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@example.com', -- Cambia esto por tu email
  crypt('admin123', gen_salt('bf')), -- Cambia 'admin123' por tu contraseña
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Administrador", "role": "admin"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- 2. Crear políticas RLS para la tabla commercial_access_tokens
-- Primero, asegúrate de que RLS está habilitado
ALTER TABLE public.commercial_access_tokens ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para evitar duplicados
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar tokens" ON "public"."commercial_access_tokens";
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "public"."commercial_access_tokens";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."commercial_access_tokens";
DROP POLICY IF EXISTS "Enable update for users based on email" ON "public"."commercial_access_tokens";

-- Crear política para permitir inserción solo a usuarios autenticados
CREATE POLICY "Enable insert for authenticated users only"
ON "public"."commercial_access_tokens"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Crear política para permitir lectura a usuarios autenticados
CREATE POLICY "Enable read for authenticated users"
ON "public"."commercial_access_tokens"
FOR SELECT
TO authenticated
USING (true);

-- Crear política para permitir actualización a usuarios autenticados
CREATE POLICY "Enable update for authenticated users"
ON "public"."commercial_access_tokens"
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
