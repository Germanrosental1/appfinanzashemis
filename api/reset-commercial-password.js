import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase con la clave de servicio
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Crear cliente de Supabase con la clave de servicio
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Manejar preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Solo permitir método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Obtener datos del cuerpo de la solicitud
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({ 
        error: 'Se requiere userId y newPassword' 
      });
    }

    // Validar que la contraseña cumpla con los requisitos mínimos
    if (newPassword.length < 8) {
      return res.status(400).json({ 
        error: 'La contraseña debe tener al menos 8 caracteres' 
      });
    }

    // Actualizar la contraseña usando la API de administración de Supabase
    const { data, error } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      console.error('Error al restablecer la contraseña:', error);
      return res.status(500).json({ 
        error: 'Error al restablecer la contraseña',
        details: error.message
      });
    }

    // Respuesta exitosa
    return res.status(200).json({ 
      success: true, 
      message: 'Contraseña restablecida con éxito' 
    });
  } catch (error) {
    console.error('Error en el servidor:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message
    });
  }
}
