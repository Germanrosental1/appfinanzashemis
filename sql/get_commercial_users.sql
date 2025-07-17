-- Función para obtener usuarios comerciales
-- Esta función debe ser ejecutada en la consola SQL de Supabase
CREATE OR REPLACE FUNCTION public.get_commercial_users()
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    json_build_object(
      'id', au.id,
      'email', au.email,
      'user_metadata', au.raw_user_meta_data
    )
  FROM 
    auth.users au
  WHERE 
    au.raw_user_meta_data->>'role' = 'commercial'
    OR EXISTS (
      SELECT 1 FROM auth.users_roles ur
      WHERE ur.user_id = au.id AND ur.role = 'commercial'
    )
  ORDER BY 
    COALESCE(au.raw_user_meta_data->>'name', au.email);
END;
$$;

-- Otorgar permisos para ejecutar la función
GRANT EXECUTE ON FUNCTION public.get_commercial_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_commercial_users() TO service_role;
