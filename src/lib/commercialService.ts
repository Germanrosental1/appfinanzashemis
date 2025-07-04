import { supabase } from './supabaseClient';
import { Commercial, CommercialAccessToken, CommercialNotification } from '@/types/commercial';
import { BankStatement } from '@/types';
import emailjs from '@emailjs/browser';

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
 * Genera un token de acceso para un comercial asociado a un extracto bancario específico
 * @param commercialEmail Email del comercial
 * @param commercialName Nombre del comercial
 * @param statementId ID del extracto bancario
 * @param expiryDays Días hasta la expiración del token
 * @returns Token generado
 */
export const generateCommercialTokenForStatement = async (
  commercialEmail: string,
  commercialName: string,
  statementId: string,
  expiryDays = 7
): Promise<CommercialAccessToken> => {
  // Generar token único
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  // Calcular fecha de expiración
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);
  
  // Crear objeto de token
  const newToken = {
    token,
    commercial_name: commercialName,
    commercial_email: commercialEmail,
    statement_id: statementId,
    expires_at: expiresAt.toISOString(),
    used: false
  };
  
  // Guardar el token en la base de datos
  const { data, error } = await supabase
    .from('commercial_access_tokens')
    .insert([newToken])
    .select()
    .single();
  
  if (error) {
    console.error('Error al generar token de acceso para comercial:', error);
    throw error;
  }
  
  return data;
};

/**
 * Envía un email con el token de acceso a un comercial
 * @param email Email del comercial
 * @param name Nombre del comercial
 * @param token Token de acceso
 * @param statementPeriod Período del extracto bancario
 * @returns Resultado del envío
 */
export const sendTokenEmail = async (
  email: string,
  name: string,
  token: string,
  statementPeriod: string
): Promise<boolean> => {
  try {
    // Construir la URL de acceso
    const baseUrl = window.location.origin;
    const accessUrl = `${baseUrl}/token-login?token=${token}`;
    
    // Enviar el email usando EmailJS
    const result = await emailjs.send(
      import.meta.env.VITE_EMAILJS_SERVICE_ID,
      import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
      {
        to_email: email,
        to_name: name,
        subject: `Acceso a extracto bancario - ${statementPeriod}`,
        message: `Hola ${name}, se te ha concedido acceso al extracto bancario del período ${statementPeriod}. 
                  Haz clic en el siguiente enlace para acceder: ${accessUrl}`,
        access_link: accessUrl
      },
      import.meta.env.VITE_EMAILJS_PUBLIC_KEY
    );
    
    return result.status === 200;
  } catch (error) {
    console.error('Error al enviar email:', error);
    return false;
  }
};

/**
 * Registra una notificación enviada a un comercial
 * @param commercialId ID del comercial
 * @param statementId ID del extracto bancario
 * @param tokenId ID del token generado
 * @param success Indica si el envío fue exitoso
 * @param errorMessage Mensaje de error en caso de fallo
 */
export const registerNotification = async (
  commercialId: string,
  statementId: string,
  tokenId: string,
  success: boolean,
  errorMessage?: string
): Promise<void> => {
  const notification = {
    commercial_id: commercialId,
    statement_id: statementId,
    token_id: tokenId,
    sent_at: new Date().toISOString(),
    status: success, // Usar directamente el valor booleano
    error_message: errorMessage
  };
  
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
  
  // Generar tokens y enviar notificaciones para cada comercial
  await Promise.all(commercials.map(async (commercial) => {
    try {
      // Generar token
      const token = await generateCommercialTokenForStatement(
        commercial.email,
        commercial.name,
        statement.id,
        7 // 7 días de validez
      );
      
      // Enviar email
      const emailSent = await sendTokenEmail(
        commercial.email,
        commercial.name,
        token.token,
        statement.period
      );
      
      // Registrar notificación
      await registerNotification(
        commercial.id,
        statement.id,
        token.id,
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
          '0', // ID inválido para indicar que no se generó token
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
