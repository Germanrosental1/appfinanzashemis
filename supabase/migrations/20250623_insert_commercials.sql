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
