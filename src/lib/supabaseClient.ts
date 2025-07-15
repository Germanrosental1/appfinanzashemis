import { createClient, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';

// Valores reales para producción y desarrollo
const SUPABASE_URL_DEFAULT = 'https://rddzqobawkdysjugiwzp.supabase.co';
const SUPABASE_ANON_KEY_DEFAULT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkZHpxb2Jhd2tkeXNqdWdpd3pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5MTk5MjksImV4cCI6MjA2MzQ5NTkyOX0.WBNIArU5QSBhczXWcsm4X1u5xp5fhF1bZ0-LVfpeQYA';

/**
 * Obtiene la URL de Supabase
 * @returns URL de Supabase
 */
const getSupabaseUrl = (): string => {
  // Primero intentamos obtener la URL desde las variables de entorno
  const url = import.meta.env.VITE_SUPABASE_URL;
  
  // Si está configurada en las variables de entorno, la usamos
  if (url) {
    return url;
  }
  
  // Si no, usamos la URL por defecto (solo para desarrollo)
  return SUPABASE_URL_DEFAULT;
};

/**
 * Obtiene la clave anónima de Supabase
 * @returns Clave anónima de Supabase
 */
const getSupabaseAnonKey = (): string => {
  // Primero intentamos obtener la clave desde las variables de entorno
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  // Si está configurada en las variables de entorno, la usamos
  if (key) {
    return key;
  }
  
  // Si no, usamos la clave por defecto (solo para desarrollo)
  return SUPABASE_ANON_KEY_DEFAULT;
};

// Crear el cliente de Supabase
export const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());

// Funciones de autenticación
export const signUp = async (email: string, password: string, name: string, role: 'admin' | 'finance' | 'commercial' = 'finance') => {
  // Registrar usuario en Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role
      }
    }
  });
  
  if (error) {
    console.error('Error al registrar usuario:', error);
    throw error;
  }
  
  // El trigger en Supabase se encarga de crear el registro en la tabla users
  // Pero podemos verificar que se haya creado correctamente
  if (data.user) {
    try {
      // Esperar un momento para que el trigger tenga tiempo de ejecutarse
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verificar si el usuario se creó en la tabla users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      if (userError || !userData) {
        console.warn('El usuario no se creó automáticamente en la tabla users, intentándolo manualmente');
        
        // Si no se creó automáticamente, lo creamos manualmente
        const { error: insertError } = await supabase
          .from('users')
          .insert([
            {
              id: data.user.id,
              email,
              name,
              role
            }
          ]);
        
        if (insertError) {
          console.error('Error al crear usuario en tabla users:', insertError);
        }
      }
    } catch (err) {
      console.error('Error al verificar creación de usuario en tabla users:', err);
    }
  }
  
  return data;
};

export const signIn = async (email: string, password: string) => {
  // Iniciar sesión con Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    console.error('Error al iniciar sesión:', error);
    throw error;
  }
  
  if (!data.user) {
    return data;
  }
  
  try {
    // Obtener la información adicional del usuario desde la tabla users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    if (userError) {
      console.error('Error al obtener datos del usuario:', userError);
      return data; // Devolver solo los datos de auth si hay error
    }
    
    // Combinar la información de auth y users
    return {
      ...data,
      user: {
        ...data.user,
        user_metadata: {
          ...data.user.user_metadata,
          name: userData.name,
          role: userData.role,
          avatar: userData.avatar
        }
      }
    };
  } catch (error) {
    console.error('Error al procesar datos del usuario:', error);
    return data; // Devolver solo los datos de auth si hay error
  }
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Error al cerrar sesión:', error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    // Obtener el usuario autenticado de Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      // Si el error es AuthSessionMissingError, no lo mostramos en la consola
      if (!authError.message.includes('Auth session missing')) {
        console.error('Error al obtener usuario actual:', authError);
      }
      return null;
    }
    
    if (!authData?.user) {
      return null;
    }
    
    // Obtener la información adicional del usuario desde la tabla users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    
    if (userError) {
      console.error('Error al obtener datos del usuario:', userError);
      return authData.user; // Devolver solo el usuario de auth si hay error
    }
    
    // Combinar la información de auth y users
    return {
      ...authData.user,
      user_metadata: {
        ...authData.user.user_metadata,
        name: userData.name,
        role: userData.role,
        avatar: userData.avatar
      }
    };
  } catch (error) {
    // Capturar cualquier otro error
    console.error('Error inesperado al obtener usuario:', error);
    return null;
  }
};

// Esta función se implementa más abajo

/**
 * Crea un usuario administrador
 * @param email Email del administrador
 * @param password Contraseña del administrador
 * @param name Nombre del administrador
 * @returns Promesa que resuelve a los datos del usuario creado
 */
export const createAdminUser = async (email: string, password: string, name: string) => {
  return signUp(email, password, name, 'admin');
};

// Tipos para las tablas de Supabase
export type SupabaseBankStatement = {
  id: string;
  file_name: string;
  upload_date: string;
  period: string;
  status: 'processing' | 'processed' | 'error';
  transaction_count: number;
  accounts: string[];
  created_at?: string;
};

export type SupabaseTransaction = {
  id: string;
  bank_statement_id: string;
  date: string;
  account: string;
  merchant: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected';
  assigned_to?: string;
  category?: string;
  subcategory?: string;
  project?: string;
  comments?: string;
  created_at?: string;
  commercial?: string; // Nombre del comercial asignado según los últimos 4 dígitos de la tarjeta
  card_number?: string; // Últimos 4 dígitos del número de tarjeta
};

// Tipo para los tokens temporales de acceso para comerciales
export type CommercialAccessToken = {
  id: string;
  token: string;
  commercial_name: string;
  expires_at: string;
  created_at: string;
  used: boolean;
  statement_id: string; // ID del extracto bancario asociado
  created_by?: string; // Opcional hasta que la columna exista en la base de datos
};

/**
 * Obtiene todos los extractos bancarios
 * @returns Promesa que resuelve a un array de extractos bancarios
 */
export const getBankStatements = async (): Promise<SupabaseBankStatement[]> => {
  const { data, error } = await supabase
    .from('bank_statements')
    .select('*')
    .order('upload_date', { ascending: false });
  
  if (error) {
    console.error('Error al obtener extractos bancarios:', error);
    throw error;
  }
  
  return data || [];
};

/**
 * Obtiene un extracto bancario por su ID
 * @param id ID del extracto bancario
 * @returns Promesa que resuelve a un extracto bancario
 */
export const getBankStatementById = async (id: string): Promise<SupabaseBankStatement | null> => {
  const { data, error } = await supabase
    .from('bank_statements')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error(`Error al obtener extracto bancario con ID ${id}:`, error);
    throw error;
  }
  
  return data;
};

/**
 * Inserta un nuevo extracto bancario
 * @param bankStatement Extracto bancario a insertar
 * @returns Promesa que resuelve al extracto bancario insertado
 */
export const insertBankStatement = async (bankStatement: Omit<SupabaseBankStatement, 'created_at'>): Promise<SupabaseBankStatement> => {
  const { data, error } = await supabase
    .from('bank_statements')
    .insert([bankStatement])
    .select()
    .single();
  
  if (error) {
    console.error('Error al insertar extracto bancario:', error);
    throw error;
  }
  
  return data;
};

/**
 * Obtiene todas las transacciones de un extracto bancario
 * @param bankStatementId ID del extracto bancario
 * @returns Promesa que resuelve a un array de transacciones
 */
export const getTransactionsByBankStatementId = async (bankStatementId: string): Promise<SupabaseTransaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('bank_statement_id', bankStatementId)
    .order('date', { ascending: true });
  
  if (error) {
    console.error(`Error al obtener transacciones del extracto bancario ${bankStatementId}:`, error);
    throw error;
  }
  
  return data || [];
};

/**
 * Obtiene todos los extractos bancarios
 * @returns Promesa que resuelve a un array de extractos bancarios
 */
export const getAllBankStatements = async (): Promise<SupabaseBankStatement[]> => {
  try {
    const { data, error } = await supabase
      .from('bank_statements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error al obtener extractos bancarios:', error);
    throw error;
  }
};

/**
 * Elimina un extracto bancario y todas sus transacciones asociadas
 * @param bankStatementId ID del extracto bancario a eliminar
 * @returns Promesa que resuelve cuando se completa la eliminación
 */
export const deleteBankStatement = async (bankStatementId: string): Promise<void> => {
  try {
    // Paso 1: Eliminar todos los tokens comerciales asociados al extracto
    const { error: tokensError } = await supabase
      .from('commercial_access_tokens')
      .delete()
      .eq('statement_id', bankStatementId);

    if (tokensError) {
      console.error('Error al eliminar tokens comerciales:', tokensError);
      throw tokensError;
    }

    // Paso 2: Eliminar notificaciones comerciales si existen
    const { error: notificationsError } = await supabase
      .from('commercial_notifications')
      .delete()
      .eq('statement_id', bankStatementId);

    if (notificationsError) {
      console.warn('Error al eliminar notificaciones comerciales:', notificationsError);
      // Continuamos aunque haya error, ya que podría ser que no existan notificaciones
    }

    // Paso 3: Eliminar transacciones asociadas
    const { error: transactionsError } = await supabase
      .from('transactions')
      .delete()
      .eq('bank_statement_id', bankStatementId);

    if (transactionsError) {
      console.error('Error al eliminar transacciones:', transactionsError);
      throw transactionsError;
    }

    // Paso 4: Eliminar el extracto bancario
    const { error: statementError } = await supabase
      .from('bank_statements')
      .delete()
      .eq('id', bankStatementId);

    if (statementError) {
      console.error('Error al eliminar extracto bancario:', statementError);
      throw statementError;
    }

    console.log('Extracto bancario eliminado correctamente');
  } catch (error) {
    console.error('Error al eliminar el extracto bancario:', error);
    throw error;
  }
};  

/**
 * Inserta nuevas transacciones
 * @param transactions Transacciones a insertar
 * @returns Promesa que resuelve a las transacciones insertadas
 */
export const insertTransactions = async (transactions: Omit<SupabaseTransaction, 'created_at'>[]): Promise<SupabaseTransaction[]> => {
  console.log(`Intentando insertar ${transactions.length} transacciones en Supabase`);
  
  // Verificar que haya transacciones para insertar
  if (!transactions || transactions.length === 0) {
    console.warn('No hay transacciones para insertar');
    return [];
  }
  
  // Verificar que todas las transacciones tengan los campos requeridos
  const invalidTransactions = transactions.filter(t => !t.id || !t.bank_statement_id || !t.date || !t.merchant);
  if (invalidTransactions.length > 0) {
    console.error(`Se encontraron ${invalidTransactions.length} transacciones inválidas:`, invalidTransactions);
    throw new Error(`${invalidTransactions.length} transacciones no tienen los campos requeridos`);
  }
  
  try {
    // Insertar en lotes más pequeños para evitar problemas con límites de tamaño
    const BATCH_SIZE = 50;
    let allInsertedData: SupabaseTransaction[] = [];
    
    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);
      console.log(`Insertando lote ${Math.floor(i/BATCH_SIZE) + 1} de ${Math.ceil(transactions.length/BATCH_SIZE)} (${batch.length} transacciones)`);
      
      const { data, error } = await supabase
        .from('transactions')
        .insert(batch)
        .select();
      
      if (error) {
        console.error(`Error al insertar lote de transacciones ${i}-${i+batch.length}:`, error);
        throw error;
      }
      
      if (data) {
        allInsertedData = [...allInsertedData, ...data];
        console.log(`Lote ${Math.floor(i/BATCH_SIZE) + 1} insertado correctamente: ${data.length} transacciones`);
      }
    }
    
    console.log(`Total de transacciones insertadas: ${allInsertedData.length} de ${transactions.length}`);
    return allInsertedData;
  } catch (error) {
    console.error('Error al insertar transacciones:', error);
    throw error;
  }
};

/**
 * Actualiza una transacción
 * @param id ID de la transacción
 * @param updates Actualizaciones a aplicar
 * @returns Promesa que resuelve a la transacción actualizada
 */
export const updateTransaction = async (id: string, updates: Partial<SupabaseTransaction>): Promise<SupabaseTransaction> => {
  // Si se actualiza el campo assigned_to, sincronizamos también el campo commercial
  const updatesToApply = { ...updates };
  
  if (updates.assigned_to) {
    updatesToApply.commercial = updates.assigned_to;
  } else if (updates.commercial) {
    updatesToApply.assigned_to = updates.commercial;
  }
  
  const { data, error } = await supabase
    .from('transactions')
    .update(updatesToApply)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error(`Error al actualizar transacción con ID ${id}:`, error);
    throw error;
  }
  
  return data;
};

/**
 * Elimina una transacción
 * @param id ID de la transacción
 * @returns Promesa que resuelve cuando la transacción se ha eliminado
 */
export const deleteTransaction = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error(`Error al eliminar transacción con ID ${id}:`, error);
    throw error;
  }
};

/**
 * Crea una nueva transacción
 * @param transaction Transacción a crear
 * @returns Promesa que resuelve a la transacción creada
 */
export const createTransaction = async (transaction: Omit<SupabaseTransaction, 'id' | 'created_at'>): Promise<SupabaseTransaction> => {
  // Sincronizar los campos assigned_to y commercial
  const transactionToCreate = { ...transaction };
  
  if (transaction.assigned_to && !transaction.commercial) {
    transactionToCreate.commercial = transaction.assigned_to;
  } else if (transaction.commercial && !transaction.assigned_to) {
    transactionToCreate.assigned_to = transaction.commercial;
  }
  
  // Asegurar que el status sea 'pending' por defecto si no se especifica
  if (!transactionToCreate.status) {
    transactionToCreate.status = 'pending';
  }
  
  const { data, error } = await supabase
    .from('transactions')
    .insert([transactionToCreate])
    .select()
    .single();
  
  if (error) {
    console.error('Error al crear transacción:', error);
    throw error;
  }
  
  return data;
};

/**
 * Genera un token de acceso temporal para un comercial
 * @param commercialName Nombre del comercial
 * @param statementId ID del extracto bancario asociado (opcional)
 * @param expiryDays Número de días hasta que expire el token (por defecto 7)
 * @returns Promesa que resuelve al token generado
 */
export const generateCommercialAccessToken = async (commercialName: string, statementId?: string | number, expiryDays = 7): Promise<CommercialAccessToken> => {
  // Verificar si el usuario está autenticado
  const user = await getCurrentUser();
  let userId = user?.id;
  
  // Si no hay usuario autenticado, usamos un ID genérico para desarrollo
  if (!userId) {
    console.warn('No hay usuario autenticado. Usando ID genérico para desarrollo.');
    userId = 'dev-user-id';
  }
  
  // Generar token único
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  // Calcular fecha de expiración
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);
  
  // Crear objeto de token (omitiendo created_by temporalmente hasta que la columna exista)
  const newToken: Omit<CommercialAccessToken, 'id' | 'created_at' | 'created_by'> = {
    token,
    commercial_name: commercialName,
    statement_id: statementId ? String(statementId) : 'general', // Convertir a string y usar 'general' si no se proporciona
    expires_at: expiresAt.toISOString(),
    used: false
    // created_by: userId  // Comentado temporalmente hasta que la columna exista
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
 * Valida un token de acceso temporal para un comercial
 * @param token Token a validar
 * @returns Promesa que resuelve al nombre del comercial si el token es válido, o null si no lo es
 */
export const validateCommercialAccessToken = async (token: string): Promise<string | null> => {
  // Obtener el token de la base de datos
  const { data, error } = await supabase
    .from('commercial_access_tokens')
    .select('*')
    .eq('token', token)
    .single();
  
  if (error || !data) {
    console.error('Token no encontrado o inválido:', error);
    return null;
  }
  
  // Verificar si el token ha expirado
  const expiresAt = new Date(data.expires_at);
  const now = new Date();
  
  if (now > expiresAt) {
    console.error('Token expirado');
    return null;
  }
  
  // Marcar el token como usado
  await supabase
    .from('commercial_access_tokens')
    .update({ used: true })
    .eq('id', data.id);
  
  return data.commercial_name;
};

/**
 * Obtiene las transacciones pendientes asignadas a un comercial específico
 * @param commercialName Nombre del comercial
 * @returns Promesa que resuelve a un array de transacciones pendientes con comentarios limpios
 */
export const getTransactionsByCommercial = async (commercialName: string): Promise<SupabaseTransaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .or(`assigned_to.eq.${commercialName},commercial.eq.${commercialName}`)
    .eq('status', 'pending') // Solo transacciones pendientes
    .order('date', { ascending: true });
  
  if (error) {
    console.error(`Error al obtener transacciones del comercial ${commercialName}:`, error);
    throw error;
  }
  
  // Limpiar los comentarios predeterminados
  const cleanedData = (data || []).map(transaction => {
    // Eliminar comentarios que contienen información predeterminada
    if (transaction.comments && (
      transaction.comments.includes(`Comercial: ${commercialName}`) ||
      transaction.comments.includes('Fecha original:') ||
      transaction.comments.includes('Fecha transacción:') ||
      transaction.comments.includes('Fecha corregida:')
    )) {
      return { ...transaction, comments: '' };
    }
    return transaction;
  });
  
  return cleanedData;
};

/**
 * Actualiza múltiples transacciones en una sola operación
 * @param updates Array de objetos con id y actualizaciones para cada transacción
 * @returns Promesa que resuelve cuando todas las transacciones se han actualizado
 */
export const bulkUpdateTransactions = async (updates: { id: string, updates: Partial<SupabaseTransaction> }[]): Promise<void> => {
  // Supabase no tiene una API nativa para actualizaciones masivas, así que hacemos múltiples llamadas
  const promises = updates.map(({ id, updates }) => {
    return supabase
      .from('transactions')
      .update(updates)
      .eq('id', id);
  });
  
  try {
    await Promise.all(promises);
  } catch (error) {
    console.error('Error al actualizar transacciones en lote:', error);
    throw error;
  }
};
