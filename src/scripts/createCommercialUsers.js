// Script para crear usuarios comerciales en Supabase
import { supabase } from '../lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

/**
 * Crea un usuario comercial en Supabase
 * @param {string} email Email del comercial
 * @param {string} name Nombre del comercial
 * @param {string} initialPassword Contraseña inicial (opcional, se genera una aleatoria si no se proporciona)
 * @returns {Promise<{user: Object, password: string}>} Usuario creado y contraseña
 */
export const createCommercialUser = async (email, name, initialPassword = null) => {
  try {
    // Generar contraseña aleatoria si no se proporciona
    const password = initialPassword || generateRandomPassword();
    
    // Crear usuario en Supabase Auth usando signUp en lugar de admin.createUser
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: 'commercial',
        }
      }
    });
    
    if (authError) {
      console.error('Error al crear usuario en Auth:', authError);
      throw authError;
    }
    
    // Verificar que el usuario se creó correctamente
    if (!authUser || !authUser.user) {
      throw new Error('No se pudo crear el usuario en Auth');
    }
    
    // Crear registro en la tabla users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([{
        id: authUser.user.id,
        email: email,
        name: name,
        role: 'commercial',
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();
    
    if (userError) {
      console.error('Error al crear usuario en la tabla users:', userError);
      throw userError;
    }
    
    console.log(`Usuario comercial creado con éxito: ${email}`);
    return { user: userData, password };
    
  } catch (error) {
    console.error('Error al crear usuario comercial:', error);
    throw error;
  }
};

/**
 * Genera una contraseña aleatoria segura
 * @returns {string} Contraseña aleatoria
 */
const generateRandomPassword = () => {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  
  return password;
};

// Ejemplo de uso:
// createCommercialUser('comercial1@ejemplo.com', 'Comercial 1')
//   .then(({ user, password }) => {
//     console.log(`Usuario creado: ${user.email}, Contraseña: ${password}`);
//   })
//   .catch(error => {
//     console.error('Error:', error);
//   });
