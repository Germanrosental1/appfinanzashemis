-- Función para crear la tabla de comerciales si no existe
CREATE OR REPLACE FUNCTION create_commercials_table()
RETURNS void AS $$
BEGIN
  -- Verificar si la tabla ya existe
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'commercials') THEN
    -- Crear la tabla
    CREATE TABLE public.commercials (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      email TEXT,
      isActive BOOLEAN DEFAULT TRUE,
      createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Agregar comentarios
    COMMENT ON TABLE public.commercials IS 'Tabla para almacenar información de comerciales';
    
    -- Configurar políticas de seguridad (RLS)
    ALTER TABLE public.commercials ENABLE ROW LEVEL SECURITY;
    
    -- Crear políticas
    CREATE POLICY "Permitir lectura a usuarios autenticados" 
      ON public.commercials FOR SELECT 
      USING (auth.role() = 'authenticated');
      
    CREATE POLICY "Permitir inserción/actualización a admin y finance" 
      ON public.commercials FOR ALL 
      USING (auth.jwt() ->> 'role' IN ('admin', 'finance'));
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Función para crear la tabla de tokens de acceso comerciales si no existe
CREATE OR REPLACE FUNCTION create_commercial_tokens_table()
RETURNS void AS $$
BEGIN
  -- Verificar si la tabla ya existe
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'commercial_access_tokens') THEN
    -- Crear la tabla
    CREATE TABLE public.commercial_access_tokens (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      commercial_id UUID NOT NULL REFERENCES public.commercials(id) ON DELETE CASCADE,
      statement_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      used_at TIMESTAMP WITH TIME ZONE
    );

    -- Agregar comentarios
    COMMENT ON TABLE public.commercial_access_tokens IS 'Tokens de acceso temporal para comerciales';
    
    -- Configurar políticas de seguridad (RLS)
    ALTER TABLE public.commercial_access_tokens ENABLE ROW LEVEL SECURITY;
    
    -- Crear políticas
    CREATE POLICY "Permitir lectura a usuarios autenticados" 
      ON public.commercial_access_tokens FOR SELECT 
      USING (auth.role() = 'authenticated');
      
    CREATE POLICY "Permitir inserción/actualización a admin y finance" 
      ON public.commercial_access_tokens FOR ALL 
      USING (auth.jwt() ->> 'role' IN ('admin', 'finance'));
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Función para crear la tabla de notificaciones comerciales si no existe
CREATE OR REPLACE FUNCTION create_commercial_notifications_table()
RETURNS void AS $$
BEGIN
  -- Verificar si la tabla ya existe
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'commercial_notifications') THEN
    -- Crear la tabla
    CREATE TABLE public.commercial_notifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      commercial_id UUID NOT NULL REFERENCES public.commercials(id) ON DELETE CASCADE,
      statement_id TEXT NOT NULL,
      token_id UUID NOT NULL REFERENCES public.commercial_access_tokens(id) ON DELETE CASCADE,
      sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'error')),
      error_message TEXT
    );

    -- Agregar comentarios
    COMMENT ON TABLE public.commercial_notifications IS 'Registro de notificaciones enviadas a comerciales';
    
    -- Configurar políticas de seguridad (RLS)
    ALTER TABLE public.commercial_notifications ENABLE ROW LEVEL SECURITY;
    
    -- Crear políticas
    CREATE POLICY "Permitir lectura a usuarios autenticados" 
      ON public.commercial_notifications FOR SELECT 
      USING (auth.role() = 'authenticated');
      
    CREATE POLICY "Permitir inserción/actualización a admin y finance" 
      ON public.commercial_notifications FOR ALL 
      USING (auth.jwt() ->> 'role' IN ('admin', 'finance'));
  END IF;
END;
$$ LANGUAGE plpgsql;
