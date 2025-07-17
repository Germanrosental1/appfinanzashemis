import { BankStatement, Transaction } from '@/types';
import { 
  supabase, 
  insertBankStatement, 
  insertTransactions, 
  SupabaseBankStatement, 
  SupabaseTransaction 
} from './supabaseClient';
import { v4 as uuidv4 } from 'uuid';

/**
 * Convierte un objeto SupabaseBankStatement a BankStatement
 * @param supabaseBankStatement Objeto SupabaseBankStatement
 * @returns Objeto BankStatement
 */
export const convertFromSupabaseBankStatement = (supabaseBankStatement: SupabaseBankStatement): BankStatement => {
  return {
    id: supabaseBankStatement.id,
    fileName: supabaseBankStatement.file_name,
    uploadDate: supabaseBankStatement.upload_date,
    period: supabaseBankStatement.period,
    status: supabaseBankStatement.status,
    transactionCount: supabaseBankStatement.transaction_count,
    accounts: supabaseBankStatement.accounts || []
  };
};

/**
 * Convierte un objeto BankStatement a SupabaseBankStatement
 * @param bankStatement Objeto BankStatement
 * @returns Objeto SupabaseBankStatement
 */
const convertToSupabaseBankStatement = (bankStatement: BankStatement): Omit<SupabaseBankStatement, 'created_at'> => {
  return {
    id: bankStatement.id, // Incluir el ID
    file_name: bankStatement.fileName,
    upload_date: bankStatement.uploadDate,
    period: bankStatement.period,
    status: bankStatement.status as 'processing' | 'processed' | 'error',
    transaction_count: bankStatement.transactionCount,
    accounts: bankStatement.accounts
  };
};

/**
 * Convierte un objeto Transaction a SupabaseTransaction
 * @param transaction Objeto Transaction
 * @param bankStatementId ID del extracto bancario
 * @returns Objeto SupabaseTransaction
 */
const convertToSupabaseTransaction = (transaction: Transaction, bankStatementId: string): Omit<SupabaseTransaction, 'created_at'> => {
  // Mapear el estado de la transacción al formato de Supabase
  let status: 'pending' | 'approved' | 'rejected';
  switch (transaction.status) {
    case 'classified':
      status = 'approved'; // Mapear 'classified' a 'approved'
      break;
    case 'approved':
      status = 'approved';
      break;
    default:
      status = 'pending'; // Por defecto, usar 'pending'
  }

  // Validar y normalizar la fecha
  let validatedDate = transaction.date;
  try {
    // Intentar parsear la fecha para verificar que sea válida
    const dateObj = new Date(transaction.date);
    if (isNaN(dateObj.getTime())) {
      console.warn(`Fecha inválida detectada en transacción ${transaction.id}: ${transaction.date}. Usando fecha actual.`);
      validatedDate = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
    } else {
      // Normalizar al formato YYYY-MM-DD para consistencia
      validatedDate = dateObj.toISOString().split('T')[0];
    }
  } catch (error) {
    console.error(`Error al procesar fecha de transacción ${transaction.id}:`, error);
    validatedDate = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD como fallback
  }

  // Verificar si la fecha parece ser 04/06/2025 (formato que aparece incorrectamente)
  if (validatedDate.includes('2025-06-04') || transaction.date.includes('04/06/2025')) {
    console.warn(`Fecha sospechosa detectada (04/06/2025) en transacción ${transaction.id}. Revisar extracción de datos.`);
  }

  return {
    id: transaction.id,
    bank_statement_id: bankStatementId,
    date: validatedDate,
    account: transaction.account,
    merchant: transaction.merchant,
    amount: transaction.amount,
    currency: transaction.currency,
    status: status,
    assigned_to: transaction.assigned_to || transaction.assignedTo || transaction.commercial, // Usar commercial como fallback si assigned_to está vacío
    category: transaction.category,
    project: transaction.project,
    comments: transaction.comments,
    commercial: transaction.commercial, // Agregar el campo commercial
    commercial_id: transaction.commercial_id, // Agregar el campo commercial_id
    card_number: transaction.cardNumber // Agregar el campo cardNumber
  };
};

/**
 * Convierte un objeto SupabaseBankStatement a BankStatement
 * @param supabaseBankStatement Objeto SupabaseBankStatement
 * @returns Objeto BankStatement
 */
const convertToBankStatement = (supabaseBankStatement: SupabaseBankStatement): BankStatement => {
  return {
    id: supabaseBankStatement.id,
    fileName: supabaseBankStatement.file_name,
    uploadDate: supabaseBankStatement.upload_date,
    period: supabaseBankStatement.period,
    status: supabaseBankStatement.status,
    transactionCount: supabaseBankStatement.transaction_count,
    accounts: supabaseBankStatement.accounts
  };
};

/**
 * Convierte un objeto SupabaseTransaction a Transaction
 * @param supabaseTransaction Objeto SupabaseTransaction
 * @returns Objeto Transaction
 */
const convertToTransaction = (supabaseTransaction: SupabaseTransaction): Transaction => {
  // Mapear el estado de Supabase al formato de la aplicación
  let status: 'pending' | 'approved' | 'classified';
  switch (supabaseTransaction.status) {
    case 'approved':
      status = 'approved';
      break;
    case 'rejected':
      status = 'classified'; // Mapear 'rejected' a 'classified'
      break;
    default:
      status = 'pending';
  }

  // Validar y normalizar la fecha
  let validatedDate = supabaseTransaction.date;
  try {
    // Verificar si la fecha es válida
    const dateObj = new Date(supabaseTransaction.date);
    if (isNaN(dateObj.getTime())) {
      console.warn(`Fecha inválida detectada al cargar transacción ${supabaseTransaction.id}: ${supabaseTransaction.date}`);
      validatedDate = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD como fallback
    }
  } catch (error) {
    console.error(`Error al procesar fecha de transacción ${supabaseTransaction.id}:`, error);
    validatedDate = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD como fallback
  }

  return {
    id: supabaseTransaction.id,
    date: validatedDate,
    account: supabaseTransaction.account,
    merchant: supabaseTransaction.merchant,
    amount: supabaseTransaction.amount,
    currency: supabaseTransaction.currency,
    status: status,
    assignedTo: supabaseTransaction.assigned_to,
    category: supabaseTransaction.category,
    project: supabaseTransaction.project,
    comments: supabaseTransaction.comments,
    commercial: supabaseTransaction.commercial || supabaseTransaction.assigned_to || 'Desconocido', // Usar assigned_to como fallback
    commercial_id: supabaseTransaction.commercial_id || null, // Incluir el ID del usuario comercial
    assigned_to: supabaseTransaction.assigned_to, // Incluir assigned_to para compatibilidad
    cardNumber: supabaseTransaction.card_number || (supabaseTransaction.account ? supabaseTransaction.account.match(/\d{4}$/)?.[0] : undefined) // Extraer últimos 4 dígitos si no existe
  };
};

/**
 * Sube un extracto bancario y sus transacciones a Supabase
 * @param file Archivo del extracto bancario
 * @param transactions Transacciones procesadas
 * @returns Promesa que resuelve al extracto bancario guardado
 */
export const uploadBankStatementToSupabase = async (file: File, transactions: Transaction[]): Promise<BankStatement> => {
  try {
    console.log(`Subiendo extracto bancario a Supabase: ${file.name} con ${transactions.length} transacciones`);
    
    // Verificar que haya transacciones para procesar
    if (!transactions || transactions.length === 0) {
      throw new Error('No hay transacciones para guardar. Verifica el procesamiento del archivo.');
    }
    
    // Extraer el período del nombre del archivo
    // Ejemplo: "PNC CC 042025.pdf" -> "Abril 2025"
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    let period = "2025"; // Valor por defecto
    
    const fileNameMatch = /(?:PNC|CC)\s*(\d{2})(\d{4})/i.exec(file.name);
    if (fileNameMatch && fileNameMatch[1] && fileNameMatch[2]) {
      const month = parseInt(fileNameMatch[1], 10);
      const year = parseInt(fileNameMatch[2], 10);
      
      if (month >= 1 && month <= 12) {
        period = `${monthNames[month - 1]} ${year}`;
      }
    }
    
    console.log(`Período detectado: ${period}`);
    
    // Crear el objeto BankStatement
    const bankStatement: BankStatement = {
      id: uuidv4(),
      fileName: file.name,
      uploadDate: new Date().toISOString(),
      period: period,
      status: 'processed',
      transactionCount: transactions.length,
      accounts: [...new Set(transactions.map(tx => tx.account))]
    };
    
    console.log('Objeto BankStatement creado:', bankStatement);
    
    // Convertir a formato Supabase
    const supabaseBankStatement = convertToSupabaseBankStatement(bankStatement);
    console.log('Objeto convertido para Supabase:', supabaseBankStatement);
    
    // Verificar la conexión a Supabase antes de intentar insertar
    console.log('Verificando conexión a Supabase...');
    try {
      const { data: testData, error: testError } = await supabase.from('bank_statements').select('id').limit(1);
      if (testError) {
        console.error('Error al verificar conexión a Supabase:', testError);
        throw new Error(`Error de conexión a Supabase: ${testError.message}`);
      }
      console.log('Conexión a Supabase verificada correctamente');
    } catch (connError) {
      console.error('Error al conectar con Supabase:', connError);
      throw new Error(`No se pudo conectar a Supabase: ${(connError as Error).message}`);
    }
    
    // Insertar el extracto bancario en Supabase
    console.log('Insertando extracto bancario en Supabase...');
    let savedBankStatement;
    try {
      savedBankStatement = await insertBankStatement(supabaseBankStatement);
      console.log(`Extracto bancario guardado en Supabase con ID: ${savedBankStatement.id}`);
    } catch (insertError) {
      console.error('Error al insertar extracto bancario:', insertError);
      throw new Error(`Error al insertar extracto bancario: ${(insertError as Error).message}`);
    }
    
    // Preparar las transacciones para Supabase
    console.log('Preparando transacciones para Supabase...');
    const supabaseTransactions = transactions.map(transaction => {
      const converted = convertToSupabaseTransaction(transaction, savedBankStatement.id);
      return converted;
    });
    
    // Insertar las transacciones en Supabase
    console.log(`Insertando ${supabaseTransactions.length} transacciones en Supabase...`);
    try {
      await insertTransactions(supabaseTransactions);
      console.log(`${supabaseTransactions.length} transacciones guardadas en Supabase`);
    } catch (transError) {
      console.error('Error al insertar transacciones:', transError);
      throw new Error(`Error al insertar transacciones: ${(transError as Error).message}`);
    }
    
    // Devolver el extracto bancario convertido
    return convertToBankStatement(savedBankStatement);
  } catch (error) {
    console.error('Error al subir extracto bancario a Supabase:', error);
    throw new Error(`Error al subir extracto bancario a Supabase: ${(error as Error).message}`);
  }
};
