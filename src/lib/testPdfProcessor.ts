import { processPDF } from './pdfProcessor';

/**
 * Función para probar el procesador de PDFs con un archivo local
 */
export const testPdfProcessor = async () => {
  try {
    console.log('Iniciando prueba del procesador de PDFs...');
    
    // Cargar el archivo PDF de prueba
    const response = await fetch('/test-data/PNC CC 042025.pdf');
    const blob = await response.blob();
    
    // Convertir el blob a un objeto File
    const file = new File([blob], 'PNC CC 042025.pdf', { type: 'application/pdf' });
    
    console.log('Archivo PDF cargado correctamente:', file.name, file.size, 'bytes');
    
    // Procesar el PDF
    console.log('Procesando PDF...');
    const transactions = await processPDF(file);
    
    console.log('Procesamiento completado.');
    console.log(`Se encontraron ${transactions.length} transacciones:`);
    
    // Mostrar las transacciones encontradas
    transactions.forEach((tx, index) => {
      console.log(`Transacción ${index + 1}:`);
      console.log(`  Fecha: ${tx.date}`);
      console.log(`  Comerciante: ${tx.merchant}`);
      console.log(`  Monto: ${tx.amount} ${tx.currency}`);
      console.log(`  Cuenta: ${tx.account}`);
      console.log('---');
    });
    
    return transactions;
  } catch (error) {
    console.error('Error en la prueba del procesador de PDFs:', error);
    throw error;
  }
};
