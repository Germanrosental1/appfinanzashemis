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
 * Envía una notificación por email a un comercial usando la plantilla fija
 * @param email Email del comercial
 * @param name Nombre del comercial (ya no se usa en la plantilla fija)
 * @param period Período del extracto (ya no se usa en la plantilla fija)
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
    
    // Enviar email con la plantilla fija y enlace directo a la plataforma
    // La plantilla ya contiene el texto fijo: "Hello Team, You have been granted access..."
    const result = await sendCommercialAccessToken(
      email,
      name, // Este parámetro ya no se usa en la plantilla fija
      appUrl,
      period, // Este parámetro ya no se usa en la plantilla fija
      true // Mantener por compatibilidad
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
    
    // Filtrar los comerciales que tienen un email válido
    const validCommercials = (commercials || []).filter(commercial => {
      const hasValidEmail = commercial.email && commercial.email.includes('@');
      if (!hasValidEmail) {
        console.warn(`El comercial ${commercial.name} no tiene un email válido configurado`);
      }
      return hasValidEmail;
    });
    
    return validCommercials;
  } catch (error) {
    console.error('Error al identificar comerciales con transacciones:', error);
    throw error;
  }
};
/**
 * Notifica a todos los comerciales que tienen transacciones en un extracto bancario
 * @param statement Extracto bancario
 * @returns Resultado de la operación con contadores
 */
/**
 * Asocia un usuario comercial a todas las transacciones pendientes que coincidan con su nombre
 * @param userId ID del usuario comercial
 * @param userName Nombre del usuario comercial
 * @returns Número de transacciones actualizadas
 */
/**
 * Obtiene la lista de usuarios comerciales para mostrar en un desplegable
 * @returns Lista de usuarios comerciales con su ID y nombre
 */
/**
 * Asigna un usuario comercial a una transacción específica
 * @param transactionId ID de la transacción
 * @param userId ID del usuario comercial (null para desasignar)
 * @param userName Nombre del usuario comercial (null para desasignar)
 * @returns La transacción actualizada o null si hubo un error
 */
export const assignCommercialToTransaction = async (
  transactionId: string,
  userId: string | null,
  userName: string | null
) => {
  try {
    // Actualizar la transacción con el usuario comercial asignado
    const { data, error } = await supabase
      .from('transactions')
      .update({
        commercial_id: userId,
        assigned_to: userName
      })
      .eq('id', transactionId)
      .select()
      .single();
    
    if (error) {
      console.error('Error al asignar usuario comercial a la transacción:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error al asignar usuario comercial a la transacción:', error);
    return null;
  }
};

/**
 * Asigna masivamente un usuario comercial a múltiples transacciones
 * @param transactionIds Array de IDs de transacciones
 * @param userId ID del usuario comercial (null para desasignar)
 * @param userName Nombre del usuario comercial (null para desasignar)
 * @returns Número de transacciones actualizadas correctamente
 */
export const assignCommercialToMultipleTransactions = async (
  transactionIds: string[],
  userId: string | null,
  userName: string | null
): Promise<number> => {
  try {
    // Dividir los IDs en lotes más pequeños para evitar errores 409
    const batchSize = 20; // Tamaño de lote recomendado
    let totalUpdated = 0;
    
    // Procesar en lotes
    for (let i = 0; i < transactionIds.length; i += batchSize) {
      const batch = transactionIds.slice(i, i + batchSize);
      console.log(`Procesando lote ${i/batchSize + 1} con ${batch.length} transacciones`);
      
      const { data, error } = await supabase
        .from('transactions')
        .update({
          commercial_id: userId,
          assigned_to: userName
        })
        .in('id', batch)
        .select();
      
      if (error) {
        console.error(`Error en lote ${i/batchSize + 1}:`, error);
        // Continuar con el siguiente lote en lugar de fallar completamente
        continue;
      }
      
      totalUpdated += data?.length || 0;
    }
    
    return totalUpdated;
  } catch (error) {
    console.error('Error al asignar usuario comercial a múltiples transacciones:', error);
    return 0;
  }
};

export const getCommercialUsersForDropdown = async (): Promise<{id: string, name: string}[]> => {
  try {
    // En entorno de desarrollo, no intentar usar la API serverless
    // ya que Vite no la procesa correctamente
    
    // Plan A: Consultar directamente la tabla users
    console.log('Intentando obtener usuarios comerciales de la tabla users...');
    const { data: usersFromUsersTable, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('role', 'commercial')
      .order('name');
    
    if (!usersError && usersFromUsersTable && usersFromUsersTable.length > 0) {
      console.log(`Encontrados ${usersFromUsersTable.length} usuarios comerciales en la tabla users`);
      return usersFromUsersTable.map(user => ({
        id: user.id,
        name: user.name || user.email?.split('@')[0] || 'Usuario sin nombre'
      }));
    } else if (usersError) {
      console.warn('Error al consultar la tabla users:', usersError);
    } else {
      console.warn('No se encontraron usuarios comerciales en la tabla users');
    }
    
    // Plan B: Intentar obtener usuarios con rol comercial de cualquier tabla
    console.log('Buscando usuarios comerciales en otras tablas...');
    
    // Intentar con la tabla auth.users directamente (requiere permisos)
    try {
      const { data: authUsers, error: authError } = await supabase
        .from('auth_users')
        .select('id, email, raw_user_meta_data')
        .contains('raw_user_meta_data', {role: 'commercial'})
        .order('email');
      
      if (!authError && authUsers && authUsers.length > 0) {
        console.log(`Encontrados ${authUsers.length} usuarios comerciales en auth_users`);
        return authUsers.map(user => ({
          id: user.id,
          name: user.raw_user_meta_data?.name || user.email?.split('@')[0] || 'Usuario sin nombre'
        }));
      }
    } catch (authError) {
      console.warn('Error al consultar auth_users:', authError);
    }
    
    // Último intento: consultar la tabla commercials si existe
    console.log('Intentando con la tabla commercials...');
    const { data: commercials, error: commercialsError } = await supabase
      .from('commercials')
      .select('id, name, email')
      .order('name');
    
    if (!commercialsError && commercials && commercials.length > 0) {
      console.log(`Encontrados ${commercials.length} usuarios en la tabla commercials`);
      return commercials.map(commercial => ({
        id: commercial.id,
        name: commercial.name || commercial.email?.split('@')[0] || 'Usuario sin nombre'
      }));
    }
    
    if (commercialsError) {
      console.error('Error al obtener comerciales de la tabla commercials:', commercialsError);
    }
    
    // Si todo lo demás falla, crear al menos un usuario de prueba para desarrollo
    console.log('Creando usuario comercial de prueba para desarrollo');
    return [{
      id: '12345678-1234-1234-1234-123456789012',
      name: 'Usuario Comercial (Prueba)'
    }];
    
  } catch (error) {
    console.error('Error al obtener usuarios comerciales para el desplegable:', error);
    // Devolver al menos un usuario de prueba para que la interfaz funcione
    return [{
      id: '12345678-1234-1234-1234-123456789012',
      name: 'Usuario Comercial (Prueba)'
    }];
  }
};

export const associateCommercialToTransactions = async (userId: string, userName: string): Promise<number> => {
  try {
    // Normalizar el nombre para la búsqueda
    const normalizedName = userName.toLowerCase();
    
    // Obtener todas las transacciones pendientes
    const { data: pendingTransactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('id, assigned_to')
      .eq('status', 'pending')
      .not('assigned_to', 'is', null);
    
    if (transactionsError) {
      console.error('Error al obtener transacciones pendientes:', transactionsError);
      throw transactionsError;
    }
    
    if (!pendingTransactions || pendingTransactions.length === 0) {
      return 0;
    }
    
    // Filtrar transacciones que coincidan con el nombre del comercial
    // Usando diferentes formas de normalización para aumentar las coincidencias
    const matchingTransactions = pendingTransactions.filter(t => {
      if (!t.assigned_to) return false;
      
      const transactionName = t.assigned_to.toLowerCase();
      
      // Verificar coincidencia exacta
      if (transactionName === normalizedName) return true;
      
      // Verificar coincidencia sin espacios
      if (transactionName.replace(/\s+/g, '') === normalizedName.replace(/\s+/g, '')) return true;
      
      // Verificar si el nombre de la transacción contiene el nombre del usuario
      if (transactionName.includes(normalizedName)) return true;
      
      // Verificar si el nombre del usuario contiene el nombre de la transacción
      if (normalizedName.includes(transactionName)) return true;
      
      // Para nombres compuestos, verificar coincidencia con la primera parte
      if (normalizedName.includes(' ')) {
        const firstName = normalizedName.split(' ')[0];
        if (transactionName.includes(firstName)) return true;
      }
      
      return false;
    });
    
    if (matchingTransactions.length === 0) {
      return 0;
    }
    
    // Actualizar las transacciones coincidentes
    const transactionIds = matchingTransactions.map(t => t.id);
    
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ commercial: userId })
      .in('id', transactionIds);
    
    if (updateError) {
      console.error('Error al actualizar transacciones:', updateError);
      throw updateError;
    }
    
    return matchingTransactions.length;
  } catch (error) {
    console.error('Error al asociar comercial a transacciones:', error);
    throw error;
  }
};

export const notifyAllCommercials = async (statement: BankStatement): Promise<{
  total: number;
  success: number;
  failed: number;
}> => {
  // MODIFICACIÓN TEMPORAL: Solo enviar a un correo específico para pruebas
  const testEmail = "german.rosental0@gmail.com";
  console.log(`MODO PRUEBA: Enviando solo a ${testEmail}`);
  
  // Obtener comerciales con transacciones en este extracto (para mantener el conteo)
  const commercials = await getCommercialsWithTransactionsInStatement(statement.id);
  
  // Inicializar contadores
  let successCount = 0;
  let failedCount = 0;
  
  // MODIFICACIÓN TEMPORAL: En lugar de enviar a todos los comerciales, solo enviamos al correo de prueba
  try {
    console.log(`Enviando notificación de prueba a ${testEmail}`);
    
    // Enviar email de notificación al correo de prueba
    const emailResult = await sendCommercialNotification(
      testEmail,
      "Usuario de Prueba",
      statement.period
    );
    
    const emailSent = emailResult.status === 200;
    
    if (emailSent) {
      successCount = 1;
      console.log(`Notificación enviada con éxito a ${testEmail}`);
      
      // Si hay comerciales reales, registramos la notificación para el primero
      if (commercials.length > 0) {
        await registerNotification(
          commercials[0].id,
          statement.id,
          null,
          true,
          "Notificación de prueba enviada"
        );
      }
    } else {
      failedCount = 1;
      console.error(`Error al enviar notificación de prueba a ${testEmail}`);
    }
  } catch (error) {
    console.error('Error al enviar notificación de prueba:', error);
    failedCount = 1;
    
    // Si hay comerciales reales, registramos el error para el primero
    if (commercials.length > 0) {
      try {
        await registerNotification(
          commercials[0].id,
          statement.id,
          null,
          false,
          error instanceof Error ? error.message : 'Error desconocido'
        );
      } catch (regError) {
        console.error('Error al registrar notificación de error:', regError);
      }
    }
  }
  
  return {
    total: commercials.length > 0 ? 1 : 0, // Solo contamos 1 para la prueba
    success: successCount,
    failed: failedCount
  };
};
