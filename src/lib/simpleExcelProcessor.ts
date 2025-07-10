import { v4 as uuidv4 } from 'uuid';
import { Transaction } from '../types';

// Palabras clave para detectar columnas (reutilizadas del excelProcessor.ts)
const DATE_KEYWORDS = ['date', 'fecha', 'posting', 'tran', 'transaction', 'post date', 'trans date', 'trans. date', 'posting date'];
const MERCHANT_KEYWORDS = ['merchant', 'supplier', 'description', 'concepto', 'detalle', 'payee', 'vendor', 'business'];
const AMOUNT_KEYWORDS = ['amount', 'monto', 'importe', 'valor', 'debit', 'credit', 'charge', 'payment', 'deposit', 'withdrawal'];
const ACCOUNT_KEYWORDS = ['account', 'cuenta', 'card', 'tarjeta', 'acct', 'acc'];

// Constantes para filtrar transacciones no deseadas
const EXCLUDED_DESCRIPTIONS = ['Payment - Auto Payment Deduction'];
const EXCLUDED_CARD_NUMBERS = ['1785'];

/**
 * Determina si una transacción debe ser excluida del procesamiento
 * @param merchant Descripción o comercio de la transacción
 * @param accountNumber Número de cuenta o tarjeta
 * @returns true si la transacción debe ser excluida, false en caso contrario
 */
export function shouldExcludeTransaction(merchant: string | null, accountNumber: string | null): boolean {
  if (!merchant || !accountNumber) return false;
  
  // Convertir a minúsculas para comparación insensible a mayúsculas/minúsculas
  const merchantLower = merchant.toLowerCase();
  
  // Verificar si la descripción está en la lista de exclusiones
  const isExcludedDescription = EXCLUDED_DESCRIPTIONS.some(desc => 
    merchantLower.includes(desc.toLowerCase())
  );
  
  // Verificar si el número de tarjeta está en la lista de exclusiones
  const isExcludedCard = EXCLUDED_CARD_NUMBERS.some(card => 
    accountNumber.includes(card)
  );
  
  // Excluir si ambas condiciones se cumplen
  if (isExcludedDescription && isExcludedCard) {
    console.log(`Excluyendo transacción: ${merchant} - Tarjeta: ${accountNumber}`);
    return true;
  }
  
  return false;
}

/**
 * Procesa un archivo CSV (convertido desde Excel) directamente
 * @param csvText Texto CSV del archivo Excel
 * @returns Array de transacciones procesadas
 */
export const processCSVData = (csvText: string): Transaction[] => {
  console.log('Procesando datos CSV...');
  
  try {
    // Dividir el texto CSV en líneas
    const lines = csvText.split(/\\r?\\n/);
    if (lines.length <= 1) {
      throw new Error('El archivo CSV no contiene suficientes datos');
    }
    
    // Convertir cada línea en un array de valores
    const rows = lines.map(line => line.split(',').map(cell => cell.trim()));
    
    // Buscar los índices de las columnas relevantes en la primera fila (encabezados)
    const headers = rows[0].map(header => header.toLowerCase());
    
    let detectedDateIndex = -1;
    let detectedMerchantIndex = -1;
    let detectedAmountIndex = -1;
    let detectedAccountIndex = -1;
    
    // Encontrar los índices de las columnas basados en palabras clave
    headers.forEach((header, index) => {
      if (DATE_KEYWORDS.some(keyword => header.includes(keyword))) {
        detectedDateIndex = index;
      }
      if (MERCHANT_KEYWORDS.some(keyword => header.includes(keyword))) {
        detectedMerchantIndex = index;
      }
      if (AMOUNT_KEYWORDS.some(keyword => header.includes(keyword))) {
        detectedAmountIndex = index;
      }
      if (ACCOUNT_KEYWORDS.some(keyword => header.includes(keyword))) {
        detectedAccountIndex = index;
      }
    });
    
    // Verificar que se encontraron las columnas necesarias
    if (detectedDateIndex === -1 || detectedMerchantIndex === -1 || detectedAmountIndex === -1) {
      throw new Error('No se pudieron detectar todas las columnas necesarias en el archivo CSV');
    }
    
    const transactions: Transaction[] = [];
    
    // Procesar cada fila (excepto la primera que son encabezados)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Verificar que la fila tenga suficientes columnas
      if (row.length <= Math.max(detectedDateIndex, detectedMerchantIndex, detectedAmountIndex)) {
        continue; // Saltar filas incompletas
      }
      
      // Extraer valores
      const dateValue = detectedDateIndex >= 0 ? row[detectedDateIndex] : null;
      const merchantValue = detectedMerchantIndex >= 0 ? row[detectedMerchantIndex] : null;
      const amountValue = detectedAmountIndex >= 0 ? row[detectedAmountIndex] : null;
      const accountValue = detectedAccountIndex >= 0 ? row[detectedAccountIndex] : null;
      
      // Verificar si esta transacción debe ser excluida
      if (shouldExcludeTransaction(merchantValue, accountValue)) {
        continue; // Saltar esta transacción
      }
      
      // Limpiar y parsear el monto
      let amount = 0;
      if (amountValue) {
        // Eliminar caracteres no numéricos excepto punto y signo negativo
        const cleanedAmount = amountValue.replace(/[^0-9.-]/g, '');
        amount = parseFloat(cleanedAmount) || 0;
      }
      
      // Crear objeto de transacción
      const transaction: Transaction = {
        id: uuidv4(),
        date: dateValue || '',
        merchant: merchantValue || '',
        amount: amount,
        account: accountValue || '',
        category: '',
        subcategory: '',
        currency: 'USD',
        status: 'pending',
        commercial: determineCommercial(accountValue || ''),
        cardNumber: accountValue ? accountValue.replace(/[^0-9]/g, '').slice(-4) : '',
      };
      
      transactions.push(transaction);
    }
    
    console.log(`Procesadas ${transactions.length} transacciones desde CSV`);
    return transactions;
    
  } catch (error) {
    console.error('Error procesando CSV:', error);
    throw error;
  }
};

/**
 * Determina el comercial basado en el número de cuenta
 * @param accountNumber Número de cuenta o tarjeta
 * @returns Nombre del comercial asignado
 */
function determineCommercial(accountNumber: string): string {
  // Extraer los últimos 4 dígitos si es posible
  const last4Digits = accountNumber.replace(/[^0-9]/g, '').slice(-4);
  
  // Asignar comercial según los últimos 4 dígitos
  switch (last4Digits) {
    case '1785':
      return 'German';
    case '7637':
      return 'Hernán';
    case '5545':
      return 'Hernán';
    case '8304':
      return 'Hernán';
    default:
      return '';
  }
}

/**
 * Procesa un archivo Excel directamente sin usar la biblioteca xlsx
 * @param file Archivo Excel (.xlsx o .xls)
 * @returns Promesa que resuelve a un array de transacciones
 */
export const processExcelWithoutLibrary = async (file: File): Promise<Transaction[]> => {
  console.log(`Procesando archivo Excel ${file.name} sin biblioteca xlsx...`);
  
  try {
    // Leer el archivo como texto
    const text = await file.text();
    
    // Procesar el texto como CSV
    return processCSVData(text);
    
  } catch (error) {
    console.error('Error procesando Excel sin biblioteca:', error);
    throw error;
  }
};
