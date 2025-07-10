// API serverless para listar usuarios comerciales usando la clave de servicio
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Solo permitir solicitudes GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Crear cliente de Supabase con la clave de servicio
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Obtener todos los usuarios
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      throw error;
    }

    // Filtrar solo usuarios comerciales basados en sus metadatos
    const commercialUsers = users
      .filter(user => user.user_metadata?.role === 'commercial')
      .map(user => ({
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || '',
        role: 'commercial',
        created_at: user.created_at
      }));

    // Devolver la lista de usuarios comerciales
    return res.status(200).json({ users: commercialUsers });
  } catch (error) {
    console.error('Error al listar usuarios comerciales:', error);
    return res.status(500).json({ error: error.message });
  }
}
