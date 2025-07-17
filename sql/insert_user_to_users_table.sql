-- Insertar el usuario en la tabla personalizada users
INSERT INTO public.users (id, email, name, role, created_at, updated_at)
VALUES 
  ('183d9674-0268-4d8b-8393-8a0eac57ed5b', 'ivana@hemibrands.com', 'Ivana', 'commercial', NOW(), NOW())
ON CONFLICT (id) DO UPDATE 
SET 
  name = 'Ivana',
  role = 'commercial',
  updated_at = NOW();

-- Verificar que el usuario se haya insertado correctamente
SELECT id, email, name, role, created_at, updated_at 
FROM public.users 
WHERE id = '183d9674-0268-4d8b-8393-8a0eac57ed5b';
