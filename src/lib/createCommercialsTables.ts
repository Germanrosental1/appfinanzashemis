import { supabase } from './supabaseClient';

/**
 * Crea las tablas necesarias para el sistema de comerciales si no existen
 */
export const createCommercialsTables = async () => {
  try {
    // Crear tabla de comerciales
    const { error: commercialsError } = await supabase.rpc('create_commercials_table');
    
    if (commercialsError) {
      console.error('Error al crear tabla de comerciales:', commercialsError);
    } else {
      console.log('Tabla de comerciales creada o ya existía');
    }
    
    // Crear tabla de tokens de acceso
    const { error: tokensError } = await supabase.rpc('create_commercial_tokens_table');
    
    if (tokensError) {
      console.error('Error al crear tabla de tokens:', tokensError);
    } else {
      console.log('Tabla de tokens creada o ya existía');
    }
    
    // Crear tabla de notificaciones
    const { error: notificationsError } = await supabase.rpc('create_commercial_notifications_table');
    
    if (notificationsError) {
      console.error('Error al crear tabla de notificaciones:', notificationsError);
    } else {
      console.log('Tabla de notificaciones creada o ya existía');
    }
    
    return true;
  } catch (error) {
    console.error('Error al crear tablas:', error);
    return false;
  }
};
