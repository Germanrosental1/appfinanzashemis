// API serverless para eliminar usuarios comerciales usando la clave de servicio
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Solo permitir solicitudes DELETE
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Se requiere el ID del usuario' });
    }

    // Crear cliente de Supabase con la clave de servicio
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Eliminar el usuario
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      throw error;
    }

    // Intentar eliminar también de la tabla users si existe
    try {
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', userId);
    } catch (tableError) {
      console.log('No se pudo eliminar de la tabla users o no existía:', tableError);
      // No lanzamos error aquí porque lo importante es que se eliminó de Auth
    }

    // Devolver éxito
    return res.status(200).json({ success: true, message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario comercial:', error);
    return res.status(500).json({ error: error.message });
  }
}
