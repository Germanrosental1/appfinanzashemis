import { supabase } from '@/lib/supabaseClient';

/**
 * Obtiene la estructura de una tabla en Supabase
 * @param tableName Nombre de la tabla
 * @returns Estructura de la tabla
 */
export const getTableStructure = async (tableName: string) => {
  const { data, error } = await supabase
    .from('_meta')
    .select('*')
    .eq('table', tableName);

  if (error) {
    console.error('Error al obtener estructura de tabla:', error);
    return null;
  }

  return data;
};

/**
 * Ejecuta una consulta SQL directa (requiere permisos)
 * @param query Consulta SQL
 * @returns Resultado de la consulta
 */
export const executeRawQuery = async (query: string) => {
  const { data, error } = await supabase.rpc('execute_sql', { query });

  if (error) {
    console.error('Error al ejecutar consulta SQL:', error);
    return null;
  }

  return data;
};
