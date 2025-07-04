-- Añadir la columna created_by a la tabla commercial_access_tokens
ALTER TABLE public.commercial_access_tokens 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Actualizar la caché del esquema para PostgREST
NOTIFY pgrst, 'reload schema';
