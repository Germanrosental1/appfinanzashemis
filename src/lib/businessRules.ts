/**
 * Reglas de negocio para la clasificación de transacciones
 */

/**
 * Mapa de los últimos 4 dígitos de tarjeta a nombre de comercial
 */
export const CARD_TO_COMMERCIAL_MAP: Record<string, string> = {
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
  '4641': 'Timothy Hawver Scott',
  '1785': 'SYSTEM' // Hemisphere Trading O (pagos automáticos) - marcado como SYSTEM para filtrar
};

/**
 * Verifica si una transacción debe ser ignorada según las reglas de negocio
 * @param supplier Nombre del proveedor/comerciante
 * @param account Número de cuenta (últimos 4 dígitos)
 * @returns true si la transacción debe ser ignorada
 */
export const shouldIgnoreTransaction = (supplier: string, account: string): boolean => {
  // Ignorar transacciones de Hemisphere Trading O (pagos automáticos)
  if (
    (supplier.toLowerCase().includes('hemisphere trading') || 
     supplier.toLowerCase().includes('payment - auto') ||
     supplier.toLowerCase().includes('auto payment')) && 
    account === '1785'
  ) {
    return true;
  }
  
  return false;
};

/**
 * Obtiene el nombre del comercial asociado a una tarjeta
 * @param cardLast4 Últimos 4 dígitos de la tarjeta
 * @returns Nombre del comercial o undefined si no se encuentra
 */
export const getCommercialByCard = (cardLast4: string): string | undefined => {
  return CARD_TO_COMMERCIAL_MAP[cardLast4];
};
