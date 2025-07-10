// API para crear usuarios comerciales usando la clave de servicio de Supabase
import { createClient } from '@supabase/supabase-js';

// Inicializar cliente de Supabase con la clave de servicio
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Esta es la clave de servicio, no la anónima
);

export default async function handler(req, res) {
  // Solo permitir método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { email, name, password } = req.body;

    // Validar datos
    if (!email || !name) {
      return res.status(400).json({ error: 'Email y nombre son requeridos' });
    }

    // Generar contraseña aleatoria si no se proporciona
    const userPassword = password || generateRandomPassword();

    // Crear usuario en Supabase Auth con la clave de servicio
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: userPassword,
      email_confirm: true,
      user_metadata: {
        name,
        role: 'commercial',
      }
    });

    if (authError) {
      console.error('Error al crear usuario en Auth:', authError);
      return res.status(400).json({ error: authError.message });
    }

    // Crear registro en la tabla users si es necesario
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert([{
        id: authUser.user.id,
        email: email,
        name: name,
        role: 'commercial',
      }]);

    if (userError) {
      console.error('Error al crear registro en users:', userError);
      // No fallamos aquí porque el usuario ya está creado en Auth
    }

    // Devolver éxito
    return res.status(200).json({ 
      success: true, 
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        name: name,
        role: 'commercial'
      },
      password: userPassword
    });
  } catch (error) {
    console.error('Error al crear usuario comercial:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Función para generar contraseña aleatoria
function generateRandomPassword() {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}
