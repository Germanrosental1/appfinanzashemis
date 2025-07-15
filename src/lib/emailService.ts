import emailjs from '@emailjs/browser';

// Configuración de EmailJS
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'your_service_id';
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'your_template_id';
const NOTIFICATION_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_NOTIFICATION_TEMPLATE_ID || import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'your_template_id';
const USER_ID = import.meta.env.VITE_EMAILJS_USER_ID || 'your_user_id';
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'your_public_key';

// Inicializar EmailJS con la clave pública
emailjs.init({
  publicKey: PUBLIC_KEY,
  // Opcional: mantener compatibilidad con versiones anteriores
  ...(USER_ID ? { userID: USER_ID } : {})
});

/**
 * Envía un email con un token de acceso o notificación a un comercial
 * @param commercialEmail Email del comercial
 * @param commercialName Nombre del comercial
 * @param url URL para acceder (puede ser un token o enlace directo)
 * @param period Período del extracto
 * @param isNotification Si es true, envía una notificación sin token
 * @returns Promesa que resuelve cuando el email se ha enviado
 */
export const sendCommercialAccessToken = async (
  commercialEmail: string,
  commercialName: string,
  url: string,
  period: string,
  isNotification: boolean = false
): Promise<{status: number, text: string}> => {
  try {
    // Determinar qué plantilla usar según el tipo de mensaje
    const templateId = isNotification ? NOTIFICATION_TEMPLATE_ID : TEMPLATE_ID;
    
    // Preparar datos para la plantilla
    const templateParams: Record<string, string> = {
      to_email: commercialEmail,
      to_name: commercialName,
      company_name: 'Fin Flow',
      period: period
    };
    
    // Agregar parámetros específicos según el tipo de mensaje
    if (isNotification) {
      // Para notificación sin token
      templateParams.app_url = url;
      templateParams.message = 'Tienes transacciones pendientes por clasificar';
    } else {
      // Para acceso con token
      templateParams.token_url = url;
      
      // Extraer fecha de expiración del token de la URL si está disponible
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7); // Por defecto 7 días
      
      const formattedDate = expiryDate.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      templateParams.expiry_date = formattedDate;
    }
    
    // Enviar el email usando EmailJS
    const response = await emailjs.send(
      SERVICE_ID,
      templateId,
      templateParams
    );
    
    console.log('Email enviado con éxito:', response);
    return response;
  } catch (error) {
    console.error('Error al enviar email:', error);
    throw error;
  }
};
