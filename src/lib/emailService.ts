import emailjs from '@emailjs/browser';

// Configuración de EmailJS
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'your_service_id';
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'your_template_id';
const USER_ID = import.meta.env.VITE_EMAILJS_USER_ID || 'your_user_id';

// Inicializar EmailJS
emailjs.init(USER_ID);

/**
 * Envía un email con un token de acceso a un comercial
 * @param commercialEmail Email del comercial
 * @param commercialName Nombre del comercial
 * @param token Token de acceso
 * @param expiryDate Fecha de expiración del token
 * @returns Promesa que resuelve cuando el email se ha enviado
 */
export const sendCommercialAccessToken = async (
  commercialEmail: string,
  commercialName: string,
  token: string,
  expiryDate: Date
): Promise<boolean> => {
  try {
    // Crear la URL con el token
    const baseUrl = window.location.origin;
    const tokenUrl = `${baseUrl}/token-login?token=${token}`;
    
    // Formatear la fecha de expiración
    const formattedDate = expiryDate.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    // Enviar el email usando EmailJS
    const response = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_email: commercialEmail,
        to_name: commercialName,
        token_url: tokenUrl,
        expiry_date: formattedDate,
        company_name: 'Fin Flow'
      }
    );
    
    console.log('Email enviado con éxito:', response);
    return true;
  } catch (error) {
    console.error('Error al enviar email:', error);
    return false;
  }
};
