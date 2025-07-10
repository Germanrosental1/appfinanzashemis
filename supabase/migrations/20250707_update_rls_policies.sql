-- Actualizar políticas RLS para permitir eliminación de extractos bancarios y registros relacionados

-- Política para commercial_access_tokens
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar tokens" ON public.commercial_access_tokens;
CREATE POLICY "Usuarios autenticados pueden eliminar tokens"
ON public.commercial_access_tokens
FOR DELETE
TO authenticated
USING (true);  -- Permitir a cualquier usuario autenticado eliminar tokens

-- Política para commercial_notifications
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar notificaciones" ON public.commercial_notifications;
CREATE POLICY "Usuarios autenticados pueden eliminar notificaciones"
ON public.commercial_notifications
FOR DELETE
TO authenticated
USING (true);  -- Permitir a cualquier usuario autenticado eliminar notificaciones

-- Política para transactions
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar transacciones" ON public.transactions;
CREATE POLICY "Usuarios autenticados pueden eliminar transacciones"
ON public.transactions
FOR DELETE
TO authenticated
USING (true);  -- Permitir a cualquier usuario autenticado eliminar transacciones

-- Política para bank_statements
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar extractos" ON public.bank_statements;
CREATE POLICY "Usuarios autenticados pueden eliminar extractos"
ON public.bank_statements
FOR DELETE
TO authenticated
USING (true);  -- Permitir a cualquier usuario autenticado eliminar extractos
