-- Crear la tabla de comerciales
CREATE TABLE IF NOT EXISTS public.commercials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  "isActive" BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurar políticas de seguridad (RLS)
ALTER TABLE public.commercials ENABLE ROW LEVEL SECURITY;

-- Crear políticas
DROP POLICY IF EXISTS "Permitir lectura a usuarios autenticados" ON public.commercials;
CREATE POLICY "Permitir lectura a usuarios autenticados" 
  ON public.commercials FOR SELECT 
  USING (auth.role() = 'authenticated');
  
DROP POLICY IF EXISTS "Permitir inserción/actualización a admin y finance" ON public.commercials;
CREATE POLICY "Permitir inserción/actualización a admin y finance" 
  ON public.commercials FOR ALL 
  USING (auth.jwt() ->> 'role' IN ('admin', 'finance'));

-- Insertar comerciales iniciales (solo si no existen)
DO $$
DECLARE
  commercial_name TEXT;
BEGIN
  -- Lista de nombres de comerciales
  FOR commercial_name IN 
    SELECT unnest(ARRAY[
      'Allia Klipp',
      'Danielle Bury',
      'Denise Urbach',
      'Erica Chaparro',
      'Fabio Novick',
      'Gail Moore',
      'Ivana Novick',
      'Josue Garcia',
      'Landon Hamel',
      'Meredith Wellen',
      'Nancy Colon',
      'Sharon Pinto',
      'Suzanne Strazzeri',
      'Tara Sarris',
      'Timothy Hawver Scott'
    ])
  LOOP
    -- Verificar si el comercial ya existe
    IF NOT EXISTS (SELECT 1 FROM public.commercials WHERE name = commercial_name) THEN
      -- Insertar el comercial con email vacío e isActive = true
      INSERT INTO public.commercials (name, email, "isActive")
      VALUES (commercial_name, '', true);
    END IF;
  END LOOP;
END;
$$;
