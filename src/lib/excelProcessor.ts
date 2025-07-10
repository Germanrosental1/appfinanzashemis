// Usamos la variable global XLSX cargada desde el CDN
// Declaramos el tipo para TypeScript
declare global {
  interface Window {
    XLSX: any;
  }
}

// Referencia a la variable global
const XLSX = window.XLSX;
import { v4 as uuidv4 } from 'uuid';
import { Transaction } from '../types';

// Palabras clave para detectar columnas
const DATE_KEYWORDS = ['date', 'fecha', 'posting', 'tran', 'transaction', 'post date', 'trans date', 'trans. date', 'posting date'];
const MERCHANT_KEYWORDS = ['merchant', 'supplier', 'description', 'concepto', 'detalle', 'payee', 'vendor', 'business'];
const AMOUNT_KEYWORDS = ['amount', 'monto', 'importe', 'valor', 'debit', 'credit', 'charge', 'payment', 'deposit', 'withdrawal'];
const ACCOUNT_KEYWORDS = ['account', 'cuenta', 'card', 'tarjeta', 'acct', 'acc'];
const CARD_NUMBER_KEYWORDS = ['card number', 'card #', 'account number', 'account #', 'número de tarjeta', 'número de cuenta'];

// Palabras clave para detectar la columna de fecha de transacción (diferente de la fecha de publicación)
const TRANSACTION_DATE_KEYWORDS = ['tran date', 'transaction date', 'fecha transacción'];

// Palabras clave que indican encabezados o información no transaccional
const HEADER_KEYWORDS = [
  'posting date', 'statement', 'period', 'balance', 'opening', 'closing', 'total', 
  'bank', 'pnc', 'account number', 'page', 'summary', 'beginning', 'ending',
  'transaction date', 'post date', 'description', 'deposits', 'withdrawals',
  'debit total', 'credit total', 'total usd'
];

// Transacciones específicas que deben ser excluidas del procesamiento
const EXCLUDED_TRANSACTION_DESCRIPTIONS = ['Payment - Auto Payment Deduction'];
const EXCLUDED_CARD_NUMBERS = ['1785'];

// Mapeo de números de tarjeta a comerciales
const CARD_TO_COMMERCIAL_MAP: Record<string, string> = {
  '5456': 'Allia Klipp',
  '0166': 'Danielle Bury',
  '1463': 'Denise Urbach',
  '3841': 'Erica Chaparro',
  '2469': 'Fabio Novick',
  '2543': 'Gail Moore',
  '2451': 'Ivana Novick',
  '2153': 'Josue Garcia',
  '0082': 'Landon Hamel',
  '7181': 'Meredith Wellen',
  '9923': 'Nancy Colon',
  '2535': 'Sharon Pinto',
  '0983': 'Suzanne Strazzeri',
  '8012': 'Tara Sarris',
  '4641': 'Timothy Hawver Scott'
};

// Función para extraer el número de tarjeta de un texto
function extractCardNumber(text: string): string | null {
  if (!text) return null;
  
  // Convertir a string si no lo es
  const textStr = text.toString().trim();
  
  console.log('Intentando extraer número de tarjeta de:', textStr);
  
  // Buscar patrones como *XXXX-XXXX-XXXX-2153 o similares
  const cardPattern = /[\*X](?:[\*X]{3,4}[\s-]?){3}(\d{4})/i;
  const match = textStr.match(cardPattern);
  
  if (match && match[1]) {
    console.log('Número de tarjeta encontrado:', match[1]);
    return match[1]; // Devuelve los últimos 4 dígitos
  }
  
  // Buscar patrones alternativos como "ending in 2153" o "...2153"
  const altPattern = /(?:ending in|ending|\.\.\.|last 4 digits|\d{4}-\d{4}-\d{4}-)(\d{4})(?:\s|$)/i;
  const altMatch = textStr.match(altPattern);
  
  if (altMatch && altMatch[1]) {
    console.log('Número de tarjeta alternativo encontrado:', altMatch[1]);
    return altMatch[1];
  }
  
  // Último intento: buscar cualquier secuencia de 4 dígitos al final del texto
  const lastFourDigits = textStr.match(/(\d{4})\s*$/); 
  if (lastFourDigits && lastFourDigits[1]) {
    console.log('Posible número de tarjeta (4 dígitos finales):', lastFourDigits[1]);
    return lastFourDigits[1];
  }
  
  console.log('No se encontró número de tarjeta en:', textStr);
  return null;
}

// Función para obtener el comercial asociado a un número de tarjeta
function getCommercialByCardNumber(cardNumber: string | null): string {
  if (!cardNumber) return 'Desconocido';
  
  // Si el número de tarjeta no está en el mapeo, devolver 'Desconocido'
  return CARD_TO_COMMERCIAL_MAP[cardNumber] || 'Desconocido';
}

/**
 * Verifica si una transacción debe ser excluida del procesamiento
 * @param merchant Descripción o concepto de la transacción
 * @param cardNumber Número de tarjeta (últimos 4 dígitos)
 * @returns true si la transacción debe ser excluida
 */
function shouldExcludeTransaction(merchant: string | null, cardNumber: string | null): boolean {
  if (!merchant || !cardNumber) return false;
  
  // Convertir a string y normalizar
  const merchantStr = merchant.toString().trim();
  const cardNumberStr = cardNumber.toString().trim();
  
  // Verificar si la descripción está en la lista de exclusiones
  const isExcludedDescription = EXCLUDED_TRANSACTION_DESCRIPTIONS.some(desc => 
    merchantStr.includes(desc)
  );
  
  // Verificar si el número de tarjeta está en la lista de exclusiones
  const isExcludedCard = EXCLUDED_CARD_NUMBERS.some(card => 
    cardNumberStr.includes(card)
  );
  
  // Excluir si coinciden ambos criterios
  return isExcludedDescription && isExcludedCard;
}

// Funciones auxiliares para detectar tipos de datos
function isDateLike(value: any): boolean {
  if (!value) return false;
  return isDateString(value);
}

function isAmountLike(value: any): boolean {
  if (!value) return false;
  const strValue = String(value).trim();
  return /^[\$\€\£\¥]?\s*[-+]?[0-9,.]+$/.test(strValue) || 
         /^[-+]?[0-9,.]+\s*[\$\€\£\¥]?$/.test(strValue) ||
         (strValue.startsWith('(') && strValue.endsWith(')') && /[0-9,.]+/.test(strValue));
}

/**
 * Procesa un archivo Excel directamente sin usar OpenAI
 * @param file Archivo Excel (.xlsx o .xls)
 * @returns Promesa que resuelve a un array de transacciones
 */
/**
 * Detecta una columna basada en el contenido de las celdas
 * @param rows Filas de datos a analizar
 * @param predicate Función que determina si una celda cumple con el criterio
 * @returns Índice de la columna o -1 si no se encuentra
 */
function detectColumnByContent(rows: any[][], predicate: (value: any) => boolean): number {
  if (!rows || rows.length === 0) return -1;
  
  // Contar cuántas celdas cumplen con el predicado en cada columna
  const columnMatches: number[] = [];
  const maxCols = Math.max(...rows.map(row => row.length));
  
  for (let col = 0; col < maxCols; col++) {
    columnMatches[col] = 0;
    
    for (let row = 0; row < rows.length; row++) {
      if (rows[row] && rows[row][col] !== undefined && predicate(rows[row][col])) {
        columnMatches[col]++;
      }
    }
  }
  
  // Encontrar la columna con más coincidencias
  let bestCol = -1;
  let maxMatches = 0;
  
  for (let col = 0; col < columnMatches.length; col++) {
    if (columnMatches[col] > maxMatches) {
      maxMatches = columnMatches[col];
      bestCol = col;
    }
  }
  
  // Solo devolver una columna si tiene al menos una coincidencia
  return maxMatches > 0 ? bestCol : -1;
}

/**
 * Procesa un archivo Excel directamente sin usar OpenAI
 * @param file Archivo Excel (.xlsx o .xls)
 * @returns Promesa que resuelve a un array de transacciones
 */
export const processExcelDirectly = async (file: File): Promise<Transaction[]> => {
  console.log('Iniciando procesamiento de Excel directamente...');
  try {
    console.log(`Procesando archivo Excel ${file.name} directamente...`);
    
    // Convertir el archivo a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Leer el archivo Excel con opciones para preservar fechas
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    
    // Obtener la primera hoja
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convertir la hoja a JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
    
    // Verificar si hay datos
    if (!jsonData || jsonData.length <= 1) {
      throw new Error('El archivo Excel no contiene datos suficientes.');
    }
    
    // Array para almacenar todas las transacciones
    const transactions: Transaction[] = [];
    
    // Buscar secciones de encabezados en el archivo
    // El formato PNC tiene múltiples secciones con sus propios encabezados
    const headerRows: number[] = [];
    
    // Buscar filas que contienen encabezados de columnas específicos del formato PNC
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] as string[];
      if (!row || row.length < 3) continue;
      
      // Convertir la fila a texto y verificar si contiene palabras clave de encabezados
      const rowText = row.join(' ').toLowerCase();
      if (rowText.includes('posting date') && rowText.includes('supplier') && rowText.includes('amount')) {
        headerRows.push(i);
        console.log(`Encontrada fila de encabezado en la línea ${i+1}: ${rowText}`);
      }
    }
    
    // Procesar el archivo según el formato detectado
    if (headerRows.length === 0) {
      // Método general para archivos que no tienen el formato PNC específico
      console.log('No se encontraron secciones de encabezados específicas, usando método general');
      
      // Detectar encabezados generales
      const headers = jsonData[0] as string[];
      
      // Buscar índices de columnas importantes
      const dateIndex = findColumnIndex(headers, DATE_KEYWORDS);
      const merchantIndex = findColumnIndex(headers, MERCHANT_KEYWORDS);
      const amountIndex = findColumnIndex(headers, AMOUNT_KEYWORDS);
      const accountIndex = findColumnIndex(headers, ACCOUNT_KEYWORDS);
      const cardNumberIndex = findColumnIndex(headers, CARD_NUMBER_KEYWORDS);
      
      console.log(`Columnas detectadas: Fecha (${dateIndex}), Comerciante (${merchantIndex}), Monto (${amountIndex}), Cuenta (${accountIndex})`);
      
      // Si no se encuentran las columnas esenciales, intentar detectarlas por contenido
      let detectedDateIndex = dateIndex;
      let detectedMerchantIndex = merchantIndex;
      let detectedAmountIndex = amountIndex;
      let detectedAccountIndex = accountIndex;
      
      if (detectedDateIndex === -1) {
        detectedDateIndex = detectColumnByContent(jsonData.slice(1) as any[][], isDateLike);
        console.log(`Columna de fecha detectada por contenido: ${detectedDateIndex}`);
      }
      
      if (detectedAmountIndex === -1) {
        detectedAmountIndex = detectColumnByContent(jsonData.slice(1) as any[][], isAmountLike);
        console.log(`Columna de monto detectada por contenido: ${detectedAmountIndex}`);
      }
      
      if (detectedDateIndex === -1 && detectedAmountIndex === -1) {
        throw new Error('No se pudieron detectar las columnas necesarias en el archivo Excel.');
      }
      
      // Procesar las filas de datos (omitir la fila de encabezados)
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        if (!row || row.length === 0) continue;
        
        // Verificar si esta fila parece ser un encabezado o información no transaccional
        const rowText = row.join(' ').toLowerCase();
        if (HEADER_KEYWORDS.some(keyword => rowText.includes(keyword))) {
          continue; // Saltar filas que parecen encabezados o totales
        }
        
        // Extraer valores de las columnas detectadas
        const dateValue = detectedDateIndex >= 0 && detectedDateIndex < row.length ? row[detectedDateIndex] : null;
        const merchantValue = detectedMerchantIndex >= 0 && detectedMerchantIndex < row.length ? row[detectedMerchantIndex] : null;
        const amountValue = detectedAmountIndex >= 0 && detectedAmountIndex < row.length ? row[detectedAmountIndex] : null;
        const accountValue = detectedAccountIndex >= 0 && detectedAccountIndex < row.length ? row[detectedAccountIndex] : null;
        
        // Limpiar y parsear el monto
        let amount = 0;
        if (amountValue) {
          // Convertir a string si no lo es
          const amountStr = amountValue.toString();
          
          // Eliminar símbolos de moneda y espacios
          let cleanAmount = amountStr.replace(/[$€£¥\s,]/g, '');
          
          // Manejar valores negativos (pueden estar entre paréntesis)
          if (cleanAmount.startsWith('(') && cleanAmount.endsWith(')')) {
            cleanAmount = '-' + cleanAmount.substring(1, cleanAmount.length - 1);
          }
          
          // Convertir a número
          amount = parseFloat(cleanAmount);
        }
        
        // Crear la transacción solo si tiene fecha y monto válido
        if (dateValue && !isNaN(amount) && amount !== 0) {
          // Asegurarse de que el monto no sea null o undefined
          const validAmount = isNaN(amount) ? 0 : amount;
          
          // Extraer número de tarjeta del campo de cuenta si existe
          let cardNumber: string | null = null;
          if (accountValue) {
            cardNumber = extractCardNumber(accountValue.toString());
            console.log(`Cuenta: ${accountValue}, Número de tarjeta extraido: ${cardNumber}`);
          }
          
          // Obtener el comercial asociado al número de tarjeta
          const commercial = getCommercialByCardNumber(cardNumber);
          
          const transaction: Transaction = {
            id: uuidv4(),
            date: formatDate(dateValue), // Formatear la fecha para consistencia
            merchant: merchantValue || 'Desconocido',
            amount: validAmount,
            account: accountValue || '',
            currency: 'USD', // Cambiado de ARS a USD
            status: 'pending',
            category: '',
            subcategory: '',
            commercial: commercial, // Agregar el comercial asociado a la tarjeta
            cardNumber: cardNumber || '', // Guardar los últimos 4 dígitos de la tarjeta
          };
          
          // Verificar que la fecha sea válida y que la transacción no deba ser excluida
          if (isDateString(transaction.date) && 
              !HEADER_KEYWORDS.some(keyword => transaction.date.toLowerCase().includes(keyword)) &&
              !HEADER_KEYWORDS.some(keyword => transaction.merchant.toLowerCase().includes(keyword)) &&
              !shouldExcludeTransaction(transaction.merchant, transaction.cardNumber)) {
            transactions.push(transaction);
            console.log(`Transacción extraída: ${transaction.merchant}, ${transaction.amount}, ${transaction.date}`);
          } else if (shouldExcludeTransaction(transaction.merchant, transaction.cardNumber)) {
            console.log(`Transacción excluida (Auto Payment): ${transaction.merchant}, ${transaction.amount}, tarjeta: ${transaction.cardNumber}`);
          }
        }
      }
    } else {
      // Procesar cada sección con sus propios encabezados (formato PNC)
      console.log(`Procesando ${headerRows.length} secciones de encabezados encontradas`);
      
      for (let h = 0; h < headerRows.length; h++) {
        const headerRowIndex = headerRows[h];
        const headers = jsonData[headerRowIndex] as string[];
        
        // Buscar índices de columnas importantes para esta sección
        const postingDateIndex = findColumnIndex(headers, ['posting date']);
        const tranDateIndex = findColumnIndex(headers, ['tran date']);
        const supplierIndex = findColumnIndex(headers, ['supplier']);
        const amountIndex = findColumnIndex(headers, ['amount']);
        const accountIndex = findColumnIndex(headers, ['account']);
        const cardNumberIndex = findColumnIndex(headers, ['card number', 'account number']);
        
        console.log(`Sección ${h+1} - Columnas detectadas: Posting Date (${postingDateIndex}), Tran Date (${tranDateIndex}), Supplier (${supplierIndex}), Amount (${amountIndex}), Account (${accountIndex})`);
        
        // Determinar hasta dónde llega esta sección (hasta el próximo encabezado o fin del archivo)
        const nextHeaderIndex = h < headerRows.length - 1 ? headerRows[h + 1] : jsonData.length;
        
        // Procesar las filas de esta sección
        for (let i = headerRowIndex + 1; i < nextHeaderIndex; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0 || row.length < 3) continue;
          
          // Verificar si esta fila parece ser un encabezado o información no transaccional
          const rowText = row.join(' ').toLowerCase();
          if (HEADER_KEYWORDS.some(keyword => rowText.includes(keyword))) {
            continue; // Saltar filas que parecen encabezados o totales
          }
          
          // Extraer valores de las columnas detectadas
          const postingDateValue = postingDateIndex >= 0 && postingDateIndex < row.length ? row[postingDateIndex] : null;
          const tranDateValue = tranDateIndex >= 0 && tranDateIndex < row.length ? row[tranDateIndex] : null;
          const supplierValue = supplierIndex >= 0 && supplierIndex < row.length ? row[supplierIndex] : null;
          const amountValue = amountIndex >= 0 && amountIndex < row.length ? row[amountIndex] : null;
          const accountValue = accountIndex >= 0 && accountIndex < row.length ? row[accountIndex] : null;
          
          // Usar la fecha de publicación (posting date) como fecha principal
          const dateValue = postingDateValue || tranDateValue;
          
          // Usar el valor de supplier como comerciante
          const merchantValue = supplierValue;
          
          // Limpiar y parsear el monto
          let amount = 0;
          if (amountValue) {
            // Convertir a string si no lo es
            const amountStr = amountValue.toString();
            
            // Eliminar símbolos de moneda y espacios
            let cleanAmount = amountStr.replace(/[$€£¥\s,]/g, '');
            
            // Manejar valores negativos (pueden estar entre paréntesis)
            if (cleanAmount.startsWith('(') && cleanAmount.endsWith(')')) {
              cleanAmount = '-' + cleanAmount.substring(1, cleanAmount.length - 1);
            }
            
            // Convertir a número
            amount = parseFloat(cleanAmount);
          }
          
          // Crear la transacción solo si tiene fecha, comerciante y monto válido
          if (dateValue && merchantValue && !isNaN(amount)) {
            // Asegurarse de que el monto no sea null o undefined
            const validAmount = isNaN(amount) ? 0 : amount;
            
            // Extraer número de tarjeta del campo de cuenta si existe
            let cardNumber: string | null = null;
            if (accountValue) {
              cardNumber = extractCardNumber(accountValue.toString());
              console.log(`Cuenta: ${accountValue}, Número de tarjeta extraido: ${cardNumber}`);
            }
            
            // Obtener el comercial asociado al número de tarjeta
            const commercial = getCommercialByCardNumber(cardNumber);
            
            const transaction: Transaction = {
              id: uuidv4(),
              date: formatDate(dateValue), // Formatear la fecha para consistencia
              merchant: merchantValue || 'Desconocido',
              amount: validAmount,
              account: accountValue || '',
              currency: 'USD', // Cambiado de ARS a USD
              status: 'pending',
              category: '',
              subcategory: '',
              commercial: commercial, // Agregar el comercial asociado a la tarjeta
              cardNumber: cardNumber || '', // Guardar los últimos 4 dígitos de la tarjeta
            };
            
            // Verificar que la fecha sea válida y que la transacción no deba ser excluida
            if (isDateString(transaction.date) && !shouldExcludeTransaction(transaction.merchant, transaction.cardNumber)) {
              transactions.push(transaction);
              console.log(`Transacción extraída: ${transaction.merchant}, ${transaction.amount}, ${transaction.date}`);
            } else if (shouldExcludeTransaction(transaction.merchant, transaction.cardNumber)) {
              console.log(`Transacción excluida (Auto Payment): ${transaction.merchant}, ${transaction.amount}, tarjeta: ${transaction.cardNumber}`);
            }
          }
        }
      }
    }
    
    console.log(`Procesamiento directo completado. Total de transacciones: ${transactions.length}`);
    return transactions;
    
  } catch (error) {
    console.error('Error al procesar el archivo Excel directamente:', error);
    throw error;
  }
};

/**
 * Encuentra el índice de una columna basado en palabras clave
 * @param headers Array de encabezados
 * @param keywords Palabras clave para buscar
 * @returns Índice de la columna o -1 si no se encuentra
 */
function findColumnIndex(headers: string[], keywords: string[]): number {
  if (!headers || headers.length === 0) return -1;
  
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i]?.toString().toLowerCase() || '';
    
    if (keywords.some(keyword => header.includes(keyword))) {
      return i;
    }
  }
  
  return -1;
}

/**
 * Verifica si una cadena parece ser una fecha
 * @param value Valor a verificar
 * @returns true si parece una fecha
 */
function isDateString(value: any): boolean {
  if (!value) return false;
  
  // Si es un objeto Date
  if (value instanceof Date) return true;
  
  const strValue = value.toString().trim();
  
  // Verificar patrones comunes de fecha
  // DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, etc.
  if (/\d{1,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,4}/.test(strValue)) return true;
  
  // MM/DD o DD/MM
  if (/^\d{1,2}[\/\-\.]\d{1,2}$/.test(strValue)) return true;
  
  // Fechas en formato texto como "Apr 21, 2025" o "April 21"
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
                      'ene', 'abr', 'ago', 'dic', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  
  const lowerValue = strValue.toLowerCase();
  if (monthNames.some(month => lowerValue.includes(month)) && /\d{1,2}/.test(lowerValue)) {
    return true;
  }
  
  // Intentar convertir a fecha
  const date = new Date(strValue);
  return !isNaN(date.getTime());
}

/**
 * Formatea una fecha para consistencia
 * @param dateValue Valor de fecha (string, Date, etc.)
 * @returns Fecha formateada como DD/MM/YYYY
 */
function formatDate(dateValue: any): string {
  if (!dateValue) return '';
  
  try {
    // Si ya es una fecha
    if (dateValue instanceof Date) {
      return `${dateValue.getDate().toString().padStart(2, '0')}/${(dateValue.getMonth() + 1).toString().padStart(2, '0')}/${dateValue.getFullYear()}`;
    }
    
    // Si es una cadena, intentar convertirla
    const dateStr = dateValue.toString();
    
    // Verificar formato MM/DD/YYYY (formato estadounidense)
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      const parts = dateStr.split('/');
      // Asumir que es MM/DD/YYYY y convertir a DD/MM/YYYY
      return `${parts[1].padStart(2, '0')}/${parts[0].padStart(2, '0')}/${parts[2]}`;
    }
    
    // Verificar formato YYYY-MM-DD (ISO)
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) {
      const parts = dateStr.split('-');
      return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
    
    // Si no coincide con formatos conocidos, devolver tal cual
    return dateStr;
    
  } catch (error) {
    console.error('Error al formatear fecha:', error, dateValue);
    return dateValue ? dateValue.toString() : '';
  }
}
