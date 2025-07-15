// API para crear usuarios comerciales
import { createClient } from '@supabase/supabase-js';

// Inicializar cliente de Supabase con la clave anónima
// Usamos la clave anónima porque estamos usando signUp que funciona con permisos normales
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
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
    const { email, name, password } = req.body;

    // Validar datos
    if (!email || !name) {
      return res.status(400).json({ error: 'Email y nombre son requeridos' });
    }

    // Generar contraseña aleatoria si no se proporciona
    const userPassword = password || generateRandomPassword();

    // Crear usuario en Supabase Auth usando signUp en lugar de admin.createUser
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email,
      password: userPassword,
      options: {
        data: {
          name,
          role: 'commercial',
        }
      }
    });

    if (authError) {
      console.error('Error al crear usuario en Auth:', authError);
      return res.status(400).json({ error: authError.message });
    }
    
    // Verificar que el usuario se creó correctamente
    if (!authUser || !authUser.user) {
      return res.status(500).json({ error: 'No se pudo crear el usuario en Auth' });
    }
    
    // Construir un objeto de usuario con la información disponible
    const userData = {
      id: authUser.user.id,
      email: email,
      name: name,
      role: 'commercial',
      created_at: new Date().toISOString(),
    };

    // Devolver éxito
    return res.status(200).json({ 
      success: true, 
      user: userData,
      password: userPassword
    });
  } catch (error) {
    console.error('Error al crear usuario comercial:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
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
