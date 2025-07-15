import { supabase } from './supabaseClient';
import { Commercial, CommercialAccessToken, CommercialNotification } from '@/types/commercial';
import { BankStatement } from '@/types';
import { sendCommercialAccessToken } from './emailService';

/**
 * Obtiene todos los comerciales registrados
 * @returns Lista de comerciales
 */
export const getAllCommercials = async (): Promise<Commercial[]> => {
  const { data, error } = await supabase
    .from('commercials')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) {
    console.error('Error al obtener comerciales:', error);
    throw error;
  }
  
  return data || [];
};

/**
 * Obtiene comerciales activos
 * @returns Lista de comerciales activos
 */
export const getActiveCommercials = async (): Promise<Commercial[]> => {
  const { data, error } = await supabase
    .from('commercials')
    .select('*')
    .eq('isActive', true)
    .order('name', { ascending: true });
  
  if (error) {
    console.error('Error al obtener comerciales activos:', error);
    throw error;
  }
  
  return data || [];
};

/**
 * Actualiza el estado de un comercial
 * @param commercialId ID del comercial
 * @param isActive Nuevo estado
 * @returns Comercial actualizado
 */
export const updateCommercialStatus = async (commercialId: string, isActive: boolean): Promise<Commercial | null> => {
  try {
    console.log(`Actualizando estado del comercial ${commercialId} a ${isActive ? 'activo' : 'inactivo'}`);
    
    // Usar RPC para actualizar el estado
    const { data, error } = await supabase.rpc('update_commercial_status', {
      commercial_id: commercialId,
      is_active: isActive
    });
    
    if (error) {
      console.error('Error al actualizar estado del comercial:', error);
      throw error;
    }
    
    // Obtener el comercial actualizado
    const { data: updatedCommercial, error: fetchError } = await supabase
      .from('commercials')
      .select('*')
      .eq('id', commercialId)
      .single();
    
    if (fetchError) {
      console.error('Error al obtener comercial actualizado:', fetchError);
      throw fetchError;
    }
    
    return updatedCommercial;
  } catch (error) {
    console.error('Error en updateCommercialStatus:', error);
    throw error;
  }
};

/**
 * Actualiza el email de un comercial
 * @param commercialId ID del comercial
 * @param email Nuevo email
 * @param isActive Estado activo/inactivo
 * @returns Comercial actualizado
 */
export const updateCommercialEmail = async (
  commercialId: string, 
  email: string,
  isActive: boolean
): Promise<Commercial | null> => {
  try {
    console.log(`Actualizando email del comercial ${commercialId} a ${email}`);
    
    // Usar RPC para actualizar el email
    const { data, error } = await supabase.rpc('update_commercial_email', {
      commercial_id: commercialId,
      email_address: email,
      is_active: isActive
    });
    
    if (error) {
      console.error('Error al actualizar email del comercial:', error);
      throw error;
    }
    
    // Obtener el comercial actualizado
    const { data: updatedCommercial, error: fetchError } = await supabase
      .from('commercials')
      .select('*')
      .eq('id', commercialId)
      .single();
    
    if (fetchError) {
      console.error('Error al obtener comercial actualizado:', fetchError);
      throw fetchError;
    }
    
    return updatedCommercial;
  } catch (error) {
    console.error('Error en updateCommercialEmail:', error);
    throw error;
  }
};

/**
 * Envía un email con el token de acceso a un comercial
 * @param email Email del comercial
 * @param name Nombre del comercial
 * @param token Token de acceso
 * @param period Período del extracto bancario
 * @returns Resultado del envío
 */
export const sendTokenEmail = async (
  email: string,
  name: string,
  token: string,
  period: string
): Promise<boolean> => {
  try {
    // Construir URL con el token
    const baseUrl = window.location.origin;
    const tokenUrl = `${baseUrl}/token-login?token=${token}`;
    
    // Enviar email
    const result = await sendCommercialAccessToken(
      email,
      name,
      tokenUrl,
      period
    );
    
    return result.status === 200;
  } catch (error) {
    console.error('Error al enviar email:', error);
    return false;
  }
};

/**
 * Envía una notificación por email a un comercial (sin token)
 * @param email Email del comercial
 * @param name Nombre del comercial
 * @param period Período del extracto
 * @returns Resultado de la operación
 */
export const sendCommercialNotification = async (
  email: string,
  name: string,
  period: string
): Promise<{status: number, text: string}> => {
  try {
    // Construir URL directa a la plataforma
    const baseUrl = window.location.origin;
    const appUrl = `${baseUrl}/commercial/transactions`;
    
    // Enviar email con enlace directo a la plataforma
    const result = await sendCommercialAccessToken(
      email,
      name,
      appUrl,
      period,
      true // Indicar que es una notificación sin token
    );
    
    return result;
  } catch (error) {
    console.error('Error al enviar notificación:', error);
    throw error;
  }
};

/**
 * Registra una notificación enviada a un comercial
 * @param commercialId ID del comercial
 * @param statementId ID del extracto bancario
 * @param tokenId ID del token generado o null si no hay token
 * @param success Indica si el envío fue exitoso
 * @param errorMessage Mensaje de error en caso de fallo
 */
export const registerNotification = async (
  commercialId: string,
  statementId: string,
  tokenId: string | null,
  success: boolean,
  errorMessage?: string
): Promise<void> => {
  const notification: any = {
    commercial_id: commercialId,
    statement_id: statementId,
    sent_at: new Date().toISOString(),
    status: success, // Usar directamente el valor booleano
    error_message: errorMessage
  };
  
  // Solo incluir token_id si es un UUID válido
  if (tokenId && tokenId !== '0') {
    notification.token_id = tokenId;
  }
  
  try {
    const { error } = await supabase
      .from('commercial_notifications')
      .insert([notification]);
    
    if (error) {
      console.error('Error al registrar notificación:', error);
    }
  } catch (err) {
    console.error('Excepción al registrar notificación:', err);
  }
};

/**
 * Obtiene todas las notificaciones para un extracto bancario
 * @param statementId ID del extracto bancario
 * @returns Lista de notificaciones
 */
export const getNotificationsByStatement = async (statementId: string): Promise<CommercialNotification[]> => {
  try {
    // Primero obtenemos las notificaciones
    const { data: notifications, error: notificationsError } = await supabase
      .from('commercial_notifications')
      .select('*')
      .eq('statement_id', statementId)
      .order('sent_at', { ascending: false });
    
    if (notificationsError) {
      console.error('Error al obtener notificaciones:', notificationsError);
      throw notificationsError;
    }
    
    if (!notifications || notifications.length === 0) {
      return [];
    }
    
    // Luego obtenemos los detalles de los comerciales
    const commercialIds = notifications.map(n => n.commercial_id);
    const { data: commercials, error: commercialsError } = await supabase
      .from('commercials')
      .select('id, name, email')
      .in('id', commercialIds);
    
    if (commercialsError) {
      console.error('Error al obtener detalles de comerciales:', commercialsError);
      throw commercialsError;
    }
    
    // Combinamos los datos
    const result = notifications.map(notification => {
      const commercial = commercials?.find(c => c.id === notification.commercial_id);
      return {
        ...notification,
        commercial: commercial || { name: 'Desconocido', email: '' }
      };
    });
    
    return result;
  } catch (error) {
    console.error('Error en getNotificationsByStatement:', error);
    return [];
  }
};

/**
 * Identifica los comerciales que tienen transacciones en un extracto específico
 * @param statementId ID del extracto bancario
 * @returns Lista de comerciales con sus transacciones
 */
export const getCommercialsWithTransactionsInStatement = async (statementId: string): Promise<Commercial[]> => {
  try {
    // Primero obtenemos todas las transacciones del extracto
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('assigned_to')
      .eq('bank_statement_id', statementId)
      .not('assigned_to', 'is', null);
    
    if (transactionsError) {
      console.error('Error al obtener transacciones:', transactionsError);
      throw transactionsError;
    }
    
    // Extraemos los nombres de comerciales únicos
    const commercialNames = [...new Set(transactions
      .map(t => t.assigned_to)
      .filter(name => name && name.trim() !== '')
    )];
    
    if (commercialNames.length === 0) {
      return [];
    }
    
    // Obtenemos los detalles de los comerciales activos que tienen transacciones
    const { data: commercials, error: commercialsError } = await supabase
      .from('commercials')
      .select('*')
      .in('name', commercialNames)
      .eq('isActive', true)
      .not('email', 'is', null);
    
    if (commercialsError) {
      console.error('Error al obtener detalles de comerciales:', commercialsError);
      throw commercialsError;
    }
    
    return commercials || [];
  } catch (error) {
    console.error('Error al identificar comerciales con transacciones:', error);
    throw error;
  }
};

/**
 * Notifica a los comerciales que tienen transacciones en un extracto bancario
 * @param statement Extracto bancario
 * @returns Resultado de la operación con contadores
 */
export const notifyAllCommercials = async (statement: BankStatement): Promise<{
  total: number;
  success: number;
  failed: number;
}> => {
  // Obtener comerciales con transacciones en este extracto
  const commercials = await getCommercialsWithTransactionsInStatement(statement.id);
  
  if (commercials.length === 0) {
    return { total: 0, success: 0, failed: 0 };
  }
  
  let successCount = 0;
  let failedCount = 0;
  
  // Buscar usuarios comerciales en la autenticación de Supabase
  const { data: authUsers, error: authError } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'commercial');
  
  if (authError) {
    console.error('Error al obtener usuarios comerciales:', authError);
    return { 
      total: commercials.length, 
      success: 0, 
      failed: commercials.length 
    };
  }
  
  // Crear un mapa de nombres de comerciales a usuarios
  const commercialUserMap = new Map();
  authUsers?.forEach(user => {
    if (user.name) {
      commercialUserMap.set(user.name.toLowerCase(), user);
    }
  });
  
  // Enviar notificaciones para cada comercial
  await Promise.all(commercials.map(async (commercial) => {
    try {
      // Buscar si existe un usuario para este comercial
      const commercialUser = commercialUserMap.get(commercial.name.toLowerCase());
      
      if (!commercialUser) {
        console.warn(`No se encontró usuario para el comercial ${commercial.name}`);
        failedCount++;
        
        // Registrar notificación fallida
        await registerNotification(
          commercial.id,
          statement.id,
          null,
          false,
          `No existe usuario para el comercial ${commercial.name}`
        );
        return;
      }
      
      // Enviar email de notificación (sin token, solo con enlace a la plataforma)
      const emailResult = await sendCommercialNotification(
        commercial.email,
        commercial.name,
        statement.period
      );
      
      const emailSent = emailResult.status === 200;
      
      // Registrar notificación
      await registerNotification(
        commercial.id,
        statement.id,
        null, // Ya no usamos tokens
        emailSent,
        emailSent ? undefined : 'Error al enviar email'
      );
      
      if (emailSent) {
        successCount++;
      } else {
        failedCount++;
      }
    } catch (error) {
      console.error(`Error al notificar al comercial ${commercial.name}:`, error);
      failedCount++;
      
      // Intentar registrar el error
      try {
        await registerNotification(
          commercial.id,
          statement.id,
          null,
          false,
          error instanceof Error ? error.message : 'Error desconocido'
        );
      } catch (regError) {
        console.error('Error al registrar notificación de error:', regError);
      }
    }
  }));
  
  return {
    total: commercials.length,
    success: successCount,
    failed: failedCount
  };
};
