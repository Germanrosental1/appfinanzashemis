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
 * Envía un email con un enlace de acceso a un comercial usando una plantilla fija
 * @param commercialEmail Email del comercial
 * @param commercialName Nombre del comercial
 * @param url URL para acceder a la plataforma
 * @param period Período del extracto
 * @param isNotification Parámetro mantenido por compatibilidad
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
    // Usar la plantilla de notificación que ya ha sido modificada en EmailJS
    // con el formato fijo: "Hello Team, You have been granted access..."
    const templateId = NOTIFICATION_TEMPLATE_ID;
    
    // Preparar datos mínimos para la plantilla
    // La plantilla ya tiene el texto fijo configurado en EmailJS
    const templateParams: Record<string, string> = {
      to_email: commercialEmail,
      to_name: 'Team', // Usar "Team" como se especifica en el texto fijo
      app_url: url // URL de acceso a la plataforma
    };
    
    // Enviar el email usando EmailJS con la plantilla fija
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
