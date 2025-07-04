import { Transaction } from '@/types';

interface GroqTransactionData {
  posting_date: string;
  transaction_date: string;
  account: string;
  supplier: string;
  amount: number;
}

interface GroqPersonData {
  name: string;
  transactions: GroqTransactionData[];
  transaction_count: number;
}

interface GroqResponse {
  transactions: GroqPersonData[];
}

// Valores por defecto para desarrollo
const GROQ_API_KEY_DEFAULT = 'gsk_'; // Reemplazar con tu API key de Groq
const GROQ_API_ENDPOINT_DEFAULT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL_DEFAULT = 'llama-3.3-70b-versatile'; // Modelo de Groq a utilizar (más reciente y versátil)

// Flag para forzar el uso de datos simulados (para desarrollo)
const USE_MOCK_DATA = true; // Cambiar a false cuando se quiera usar la API real

/**
 * Obtiene la API key de Groq
 * @returns API key de Groq
 */
const getGroqApiKey = (): string => {
  // Primero intentamos obtener la API key desde las variables de entorno
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  
  // Si está configurada en las variables de entorno, la usamos
  if (apiKey) {
    return apiKey;
  }
  
  // Si no, usamos la API key por defecto (solo para desarrollo)
  return GROQ_API_KEY_DEFAULT;
};

/**
 * Obtiene el endpoint de la API de Groq
 * @returns URL del endpoint de la API de Groq
 */
const getGroqApiEndpoint = (): string => {
  // Primero intentamos obtener el endpoint desde las variables de entorno
  const endpoint = import.meta.env.VITE_GROQ_API_ENDPOINT;
  
  // Si está configurado en las variables de entorno, lo usamos
  if (endpoint) {
    return endpoint;
  }
  
  // Si no, usamos el endpoint por defecto
  return GROQ_API_ENDPOINT_DEFAULT;
};

/**
 * Obtiene el modelo de Groq a utilizar
 * @returns Nombre del modelo de Groq
 */
const getGroqModel = (): string => {
  // Primero intentamos obtener el modelo desde las variables de entorno
  const model = import.meta.env.VITE_GROQ_MODEL;
  
  // Si está configurado en las variables de entorno, lo usamos
  if (model) {
    return model;
  }
  
  // Si no, usamos el modelo por defecto
  return GROQ_MODEL_DEFAULT;
};

/**
 * Extrae el texto de un archivo PDF usando pdfjs-dist
 * @param file Archivo PDF
 * @returns Promesa que resuelve al texto extraído del PDF
 */
const extractTextFromPdf = async (file: File): Promise<string> => {
  try {
    // Importar pdfjs-dist dinámicamente
    const pdfjsLib = await import('pdfjs-dist');
    
    // Configurar el worker
    const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.entry');
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
    
    // Leer el archivo como ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Cargar el PDF
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    
    let extractedText = '';
    
    // Extraer texto de cada página
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      extractedText += pageText + '\n';
    }
    
    return extractedText;
  } catch (error) {
    console.error('Error al extraer texto del PDF:', error);
    throw new Error(`No se pudo extraer texto del PDF: ${(error as Error).message}`);
  }
};

/**
 * Envía un PDF a la API de Groq para su análisis y extracción de transacciones
 * @param file Archivo PDF a procesar
 * @returns Promesa que resuelve a la respuesta de Groq
 */
const sendPdfToGroq = async (file: File): Promise<GroqResponse> => {
  try {
    console.log(`Enviando PDF a Groq para análisis: ${file.name}`);
    
    const apiKey = getGroqApiKey();
    const apiEndpoint = getGroqApiEndpoint();
    const model = getGroqModel();
    
    // Verificar si tenemos las credenciales necesarias
    if (!apiKey || apiKey === 'gsk_') {
      console.log('Usando respuesta simulada de Groq (no hay API key válida)');
      
      // Si no hay API key, simular la respuesta
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
    }
    
    // En producción, enviamos el archivo a la API de Groq
    console.log('Enviando PDF a la API de Groq real:', apiEndpoint);
    
    try {
      // Extraer texto del PDF
      const pdfText = await extractTextFromPdf(file);
      
      // Limitar el tamaño del texto para evitar errores de la API
      // La mayoría de los modelos tienen un límite de tokens, así que limitamos a ~8000 caracteres
      const truncatedText = pdfText.length > 8000 ? pdfText.substring(0, 8000) + '...' : pdfText;
      
      console.log('Texto extraído del PDF (truncado):', truncatedText.substring(0, 200) + '...');
      
      // Crear el mensaje para la API de Groq
      const requestBody = {
        model: model,
        messages: [
          {
            role: "system",
            content: "Eres un asistente especializado en extraer transacciones de extractos bancarios. Analiza la información proporcionada y devuelve un JSON con las transacciones organizadas por comercial asignado."
          },
          {
            role: "user",
            content: `Estoy procesando un extracto bancario en PDF. Necesito que extraigas todas las transacciones bancarias del siguiente texto y las organices por comercial asignado:\n\n${truncatedText}\n\nDevuelve los resultados en formato JSON con esta estructura exactamente:\n{\n  "transactions": [\n    {\n      "name": "Nombre del Comercial",\n      "transactions": [\n        {\n          "posting_date": "MM/DD/YYYY",\n          "transaction_date": "MM/DD/YYYY",\n          "account": "XXXX-XXXX-XXXX-1234",\n          "supplier": "Nombre del proveedor",\n          "amount": 123.45\n        }\n      ],\n      "transaction_count": 1\n    }\n  ]\n}`
          }
        ],
        temperature: 0.2,
        max_completion_tokens: 4000,
        response_format: { type: "json_object" }
      };
      
      console.log('Enviando solicitud a Groq:', JSON.stringify(requestBody).substring(0, 500) + '...');
      
      // Enviar la solicitud a la API de Groq
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      });
      
      // Verificar si la respuesta es exitosa
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error de Groq API:', response.status, errorText);
        
        // Intentar recuperar datos del failed_generation si está disponible
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error && errorData.error.failed_generation) {
            console.log('Intentando recuperar datos del failed_generation');
            // Intenta completar el JSON incompleto
            const fixedJson = fixIncompleteJson(errorData.error.failed_generation);
            if (fixedJson) {
              console.log('Se recuperaron datos del failed_generation');
              return fixedJson;
            }
          }
        } catch (parseError) {
          console.error('Error al intentar recuperar datos del failed_generation:', parseError);
        }
        
        throw new Error(`Error en la API de Groq: ${response.status} ${response.statusText}. Detalles: ${errorText}`);
      }
      
      // Parsear la respuesta
      const responseData = await response.json();
      console.log('Respuesta de Groq:', JSON.stringify(responseData).substring(0, 500) + '...');
      
      try {
        // Extraer el contenido de la respuesta
        const content = responseData.choices[0].message.content;
        return JSON.parse(content);
      } catch (jsonError) {
        console.error('Error al parsear la respuesta JSON:', jsonError, 'Respuesta completa:', responseData);
        throw new Error(`No se pudo extraer un JSON válido de la respuesta de Groq`);
      }
    } catch (apiError) {
      console.error('Error al comunicarse con la API de Groq:', apiError);
      throw new Error(`Error al comunicarse con la API de Groq: ${(apiError as Error).message}`);
    }
  } catch (error) {
    console.error('Error al enviar PDF a Groq:', error);
    throw new Error('No se pudo procesar el archivo PDF con Groq: ' + (error as Error).message);
  }
};

/**
 * Intenta reparar un JSON incompleto
 * @param jsonString Cadena JSON potencialmente incompleta
 * @returns Objeto JSON reparado o null si no se pudo reparar
 */
const fixIncompleteJson = (jsonString: string): GroqResponse | null => {
  try {
    // Primero intentamos parsear tal como está
    try {
      return JSON.parse(jsonString) as GroqResponse;
    } catch (e) {
      // Si falla, intentamos repararlo
      console.log('Intentando reparar JSON incompleto');
    }
    
    // Verificar si el JSON está incompleto pero tiene la estructura básica
    if (jsonString.includes('"transactions":[') && !jsonString.endsWith('}}')) {
      // Intentar completar el JSON añadiendo los corchetes y llaves que faltan
      let fixedJson = jsonString;
      
      // Contar corchetes y llaves abiertas vs cerradas
      const openBraces = (jsonString.match(/\{/g) || []).length;
      const closeBraces = (jsonString.match(/\}/g) || []).length;
      const openBrackets = (jsonString.match(/\[/g) || []).length;
      const closeBrackets = (jsonString.match(/\]/g) || []).length;
      
      // Añadir corchetes que faltan
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        fixedJson += ']';
      }
      
      // Añadir llaves que faltan
      for (let i = 0; i < openBraces - closeBraces; i++) {
        fixedJson += '}';
      }
      
      // Intentar parsear el JSON reparado
      try {
        const parsed = JSON.parse(fixedJson) as GroqResponse;
        console.log('JSON reparado exitosamente');
        return parsed;
      } catch (repairError) {
        console.error('No se pudo reparar el JSON:', repairError);
      }
    }
    
    // Si llegamos aquí, no pudimos reparar el JSON
    return null;
  } catch (error) {
    console.error('Error al intentar reparar JSON:', error);
    return null;
  }
};

/**
 * Convierte los datos de Groq a nuestro formato de transacciones
 * @param groqData Datos recibidos de Groq
 * @returns Array de transacciones en nuestro formato
 */
export const convertGroqDataToTransactions = (groqData: GroqResponse): Transaction[] => {
  const transactions: Transaction[] = [];
  
  groqData.transactions.forEach(person => {
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
        id: `tx-groq-${Date.now()}-${Math.floor(Math.random() * 1000)}-${transactions.length}`,
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
 * Procesa un PDF utilizando Groq y devuelve las transacciones extraídas
 * @param file Archivo PDF a procesar
 * @returns Promesa que resuelve a un array de transacciones
 */
export const processWithGroq = async (file: File): Promise<Transaction[]> => {
  try {
    const groqResponse = await sendPdfToGroq(file);
    const transactions = convertGroqDataToTransactions(groqResponse);
    
    console.log(`Procesamiento con Groq completado: ${transactions.length} transacciones extraídas`);
    return transactions;
  } catch (error) {
    console.error('Error en el procesamiento con Groq:', error);
    throw error;
  }
};
