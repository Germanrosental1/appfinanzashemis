import { Transaction } from '@/types';

interface GrokTransactionData {
  posting_date: string;
  transaction_date: string;
  account: string;
  supplier: string;
  amount: number;
}

interface GrokPersonData {
  name: string;
  transactions: GrokTransactionData[];
  transaction_count: number;
}

interface GrokResponse {
  transactions: GrokPersonData[];
}

// API Key de x.ai (Grok)
const X_AI_API_KEY = 'xai-bQV3Ke0b58pfZtbRL8ZPY8KfoeI4MBx3UAioil9uSCYIsZLgVaITufHxd70dBn93EKJQEC92dXig6wRR';

// Endpoint de la API de x.ai
const X_AI_API_ENDPOINT = 'https://api.x.ai/v1/chat/completions';

/**
 * Obtiene la API key de x.ai (Grok)
 * @returns API key de x.ai
 */
const getGrokApiKey = (): string => {
  // Primero intentamos obtener la API key desde las variables de entorno
  const apiKey = import.meta.env.VITE_GROK_API_KEY;
  
  // Si está configurada en las variables de entorno, la usamos
  if (apiKey) {
    return apiKey;
  }
  
  // Si no, usamos la API key hardcodeada (solo para desarrollo)
  return X_AI_API_KEY;
};

/**
 * Obtiene el endpoint de la API de x.ai (Grok)
 * @returns URL del endpoint de la API de x.ai
 */
const getGrokApiEndpoint = (): string => {
  // Primero intentamos obtener el endpoint desde las variables de entorno
  const endpoint = import.meta.env.VITE_GROK_API_ENDPOINT;
  
  // Si está configurado en las variables de entorno, lo usamos
  if (endpoint) {
    return endpoint;
  }
  
  // Si no, usamos el endpoint hardcodeado
  return X_AI_API_ENDPOINT;
};

/**
 * Convierte un archivo PDF a texto base64
 * @param file Archivo PDF
 * @returns Promesa que resuelve a una cadena base64
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Obtenemos el resultado como string y eliminamos el prefijo 'data:application/pdf;base64,'
      const base64 = reader.result as string;
      const base64Clean = base64.split(',')[1];
      resolve(base64Clean);
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * Envía un PDF a la API de x.ai (Grok) para su análisis y extracción de transacciones
 * @param file Archivo PDF a procesar
 * @returns Promesa que resuelve a la respuesta de Grok
 */
export const sendPdfToGrok = async (file: File): Promise<GrokResponse> => {
  try {
    const apiKey = getGrokApiKey();
    const apiEndpoint = getGrokApiEndpoint();
    
    console.log('Enviando PDF a x.ai (Grok) para análisis:', file.name);
    
    // Verificar si tenemos las credenciales necesarias
    if (!apiKey) {
      throw new Error('No se ha configurado la API key de x.ai. Por favor, configura VITE_GROK_API_KEY en el archivo .env');
    }
    
    // En un entorno de desarrollo, simulamos la respuesta
    if (import.meta.env.DEV && !import.meta.env.VITE_USE_REAL_GROK_API) {
      // Simulamos un tiempo de procesamiento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Usando respuesta simulada de x.ai (entorno de desarrollo)');
      
      // Por ahora, devolvemos una respuesta simulada
    } else {
      // En producción, enviamos el archivo a la API de x.ai
      console.log('Enviando PDF a la API de x.ai real:', apiEndpoint);
      
      try {
        // Convertir el PDF a base64
        const pdfBase64 = await fileToBase64(file);
        
        // Crear el mensaje para la API de x.ai
        const requestBody = {
          messages: [
            {
              role: "system",
              content: "Eres un asistente especializado en extraer transacciones de extractos bancarios en formato PDF. Analiza el PDF y devuelve un JSON con las transacciones organizadas por comercial asignado."
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analiza este extracto bancario y extrae todas las transacciones. Organiza las transacciones por comercial asignado y devuelve los resultados en formato JSON."
                },
                {
                  type: "file",
                  file_data: {
                    mime_type: "application/pdf",
                    data: pdfBase64
                  }
                }
              ]
            }
          ],
          model: "grok-3-latest",
          stream: false,
          temperature: 0.2
        };
        
        // Enviar la solicitud a la API de x.ai
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
          throw new Error(`Error en la API de x.ai: ${response.status} ${response.statusText}`);
        }
        
        // Procesar la respuesta
        const responseData = await response.json();
        console.log('Respuesta de x.ai:', responseData);
        
        // Extraer el contenido JSON de la respuesta
        const assistantMessage = responseData.choices[0].message.content;
        
        // Intentar parsear el JSON de la respuesta
        try {
          // Buscar un bloque de código JSON en la respuesta
          const jsonMatch = assistantMessage.match(/```json\n([\s\S]*?)\n```/) || 
                           assistantMessage.match(/```([\s\S]*?)```/) ||
                           [null, assistantMessage];
          
          const jsonString = jsonMatch[1].trim();
          const parsedData = JSON.parse(jsonString);
          
          return parsedData;
        } catch (jsonError) {
          console.error('Error al parsear la respuesta JSON:', jsonError);
          throw new Error(`No se pudo extraer un JSON válido de la respuesta de x.ai`);
        }
      } catch (apiError) {
        console.error('Error al comunicarse con la API de x.ai:', apiError);
        throw new Error(`Error al comunicarse con la API de x.ai: ${(apiError as Error).message}`);
      }
    }
    
    // Respuesta simulada para desarrollo
    return {
      transactions: [
        {
          name: "Comercial 1",
          transactions: [
            {
              posting_date: "02/04/2025",
              transaction_date: "02/03/2025",
              account: "XXXX-XXXX-XXXX-5456",
              supplier: "Fineline Technologies",
              amount: 46.00
            },
            {
              posting_date: "02/10/2025",
              transaction_date: "02/07/2025",
              account: "XXXX-XXXX-XXXX-5456",
              supplier: "Fineline Technologies",
              amount: 133.51
            }
          ],
          transaction_count: 2
        },
        {
          name: "Comercial 2",
          transactions: [
            {
              posting_date: "02/06/2025",
              transaction_date: "02/05/2025",
              account: "XXXX-XXXX-XXXX-5456",
              supplier: "Uber *trip",
              amount: 12.06
            },
            {
              posting_date: "02/06/2025",
              transaction_date: "02/05/2025",
              account: "XXXX-XXXX-XXXX-5456",
              supplier: "Uber *trip",
              amount: 66.99
            }
          ],
          transaction_count: 2
        }
      ]
    };
    
  } catch (error) {
    console.error('Error al enviar PDF a Grok:', error);
    throw new Error('No se pudo procesar el archivo PDF con Grok: ' + (error as Error).message);
  }
};

/**
 * Convierte los datos de Grok a nuestro formato de transacciones
 * @param grokData Datos recibidos de Grok
 * @returns Array de transacciones en nuestro formato
 */
export const convertGrokDataToTransactions = (grokData: GrokResponse): Transaction[] => {
  const transactions: Transaction[] = [];
  
  grokData.transactions.forEach(person => {
    person.transactions.forEach(tx => {
      // Extraer los últimos 4 dígitos de la cuenta
      const accountMatch = tx.account.match(/(\d{4})$/);
      const accountLast4 = accountMatch ? accountMatch[1] : '0000';
      
      // Convertir fecha de MM/DD/YYYY a YYYY-MM-DD
      const dateParts = tx.transaction_date.split('/');
      if (dateParts.length !== 3) return;
      
      const month = parseInt(dateParts[0], 10);
      const day = parseInt(dateParts[1], 10);
      const year = parseInt(dateParts[2], 10);
      
      const isoDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      
      transactions.push({
        id: `tx-grok-${Date.now()}-${Math.floor(Math.random() * 1000)}-${transactions.length}`,
        date: isoDate,
        account: accountLast4,
        merchant: tx.supplier,
        amount: -Math.abs(tx.amount), // Convertir a negativo para gastos
        currency: "EUR", // Asumir EUR como moneda por defecto
        status: "pending",
        assignedTo: person.name, // Asignar al comercial correspondiente
        category: undefined,
        project: undefined,
        comments: undefined
      });
    });
  });
  
  return transactions;
};

/**
 * Procesa un PDF utilizando Grok y devuelve las transacciones extraídas
 * @param file Archivo PDF a procesar
 * @returns Promesa que resuelve a un array de transacciones
 */
export const processWithGrok = async (file: File): Promise<Transaction[]> => {
  try {
    const grokResponse = await sendPdfToGrok(file);
    const transactions = convertGrokDataToTransactions(grokResponse);
    
    console.log(`Procesamiento con Grok completado: ${transactions.length} transacciones extraídas`);
    return transactions;
  } catch (error) {
    console.error('Error en el procesamiento con Grok:', error);
    throw error;
  }
};
