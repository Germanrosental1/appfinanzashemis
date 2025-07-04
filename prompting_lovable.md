# Prompt para Lovable: Aplicación de Clasificación de Gastos Corporativos

## Contexto del Negocio

Necesitamos desarrollar una aplicación web que automatice el proceso de clasificación de gastos corporativos. Actualmente, el departamento de Finanzas recibe extractos bancarios mensuales (Excel/PDF) del banco PNC, y debe distribuir manualmente estos gastos entre los comerciales para su clasificación, lo que resulta en un proceso tedioso, propenso a errores y con poca trazabilidad.

## Objetivo Principal

Crear una plataforma que permita:
1. Al equipo de Finanzas cargar extractos bancarios
2. Distribuir automáticamente las transacciones a cada comercial según su cuenta/tarjeta
3. Facilitar a los comerciales la clasificación de sus gastos sin necesidad de Excel
4. Proporcionar a Finanzas visibilidad en tiempo real del estado de la clasificación
5. Generar reportes consolidados para contabilidad

## User Journey Completo

### 1. Fin de mes: Subida del extracto

**Acceso de Finanzas**
- El responsable de Finanzas inicia sesión en la aplicación con sus credenciales
- Ve un dashboard con la opción principal de "Subir nuevo extracto"

**Pantalla de Upload**
- Interfaz para arrastrar o seleccionar el archivo Excel/PDF del extracto bancario
- Botón "Subir extracto" claramente visible
- Al hacer clic, muestra un spinner con mensaje "Procesando tu extracto..."
- Un job en segundo plano procesa el archivo y extrae las transacciones

**Feedback de procesamiento**
- Al completar el procesamiento, muestra una notificación: "Extracto procesado: [X] transacciones en [Y] cuentas"
- Presenta una tabla resumen con todas las cuentas detectadas (últimos 4 dígitos) y cantidad de movimientos

### 2. Generación de enlaces y notificaciones

**Envío a comerciales**
- Botón "Enviar enlaces de clasificación" una vez verificada la información
- Al hacer clic, el sistema:
  * Agrupa transacciones por cuenta/tarjeta
  * Genera un JWT único con expiración para cada comercial
  * Construye enlaces personalizados
  * Envía notificaciones por email o Slack

**Formato de notificación**
- Asunto: "Acción requerida: Clasificación de gastos [Mes] [Año]"
- Cuerpo: Mensaje claro con instrucciones y enlace del tipo:
  ```
  Clasifica tus gastos marzo 2025: https://tu-app.lovable.app/classify?token=abc123...
  ```

### 3. Clasificación por parte de los comerciales

**Acceso sin fricción**
- El comercial hace clic en el enlace y accede directamente (el token en la URL le autentica)
- No requiere login adicional ni recordar contraseñas

**Interfaz de clasificación**
- Lista clara de transacciones con:
  * Fecha de la transacción
  * Nombre del proveedor/establecimiento
  * Importe (con formato de moneda)
- Para cada transacción, muestra:
  * Desplegable "Categoría" (pre-cargado con opciones como Viáticos, Insumos, Logística...)
  * Desplegable "Proyecto/Cliente" (opciones relevantes para ese comercial)
  * Campo de texto "Comentarios" opcional
- Indicador visual (✓) para transacciones ya clasificadas

**Experiencia de usuario**
- Posibilidad de guardar en lotes (cada 10-20 transacciones)
- Barra de progreso indicando % completado
- Alertas si intenta salir con transacciones sin guardar
- Si en X días no completa la clasificación, recibe recordatorio automático

### 4. Revisión y consolidado de Finanzas

**Dashboard de resumen**
- Finanzas accede a la pestaña "Resumen" en su dashboard
- Visualiza:
  * Tabla pivote por comercial (monto total y # de transacciones)
  * Gráfico circular de distribución por categoría
  * Gráfico de línea de evolución mensual
  * Filtros por fecha/proyecto/cuenta

**Gestión de pendientes**
- Indicadores visuales (rojo) para cuentas con transacciones pendientes
- Opción de drill-down para ver el detalle específico
- Botón para reenviar recordatorio a comerciales específicos

**Exportación y reportes**
- Botón "Exportar a Excel" para descargar informe detallado
- Opción "Generar PDF" para informe ejecutivo
- Ambos incluyen todas las clasificaciones y comentarios

### 5. Cierre de mes

**Finalización del proceso**
- Botón "Cerrar mes" (con confirmación) una vez todas las cuentas están clasificadas
- La app bloquea ediciones posteriores
- Genera snapshot de datos para histórico
- Envía automáticamente informe final a Contabilidad

## Requisitos Funcionales Detallados

### 1. Autenticación

- **Para Finanzas:**
  * Formulario de login con validación de email y contraseña
  * Opción "Recordarme" para sesiones persistentes
  * Recuperación de contraseña vía email

- **Para Comerciales:**
  * Autenticación sin contraseña vía token JWT en URL
  * Tokens con expiración de 24 horas
  * Opción de solicitar nuevo enlace si expiró

### 2. Módulo de Finanzas

- **Gestión de extractos:**
  * Carga de archivos Excel/PDF con validación de formato
  * Parseo inteligente de diferentes formatos de extracto PNC
  * Histórico de extractos subidos con fecha y estado

- **Dashboard principal:**
  * KPIs: total clasificado vs. pendiente, tiempo promedio de clasificación
  * Tabla resumen de cuentas/tarjetas con:
    - Últimos 4 dígitos
    - Cantidad de transacciones
    - Total débitos/créditos
    - Estado (pendiente/completado/parcial)
    - Comercial asignado
    - Botón de acción "Ver detalle"

- **Gestión de comerciales:**
  * CRUD para administrar usuarios comerciales
  * Asignación de cuentas/tarjetas a comerciales
  * Historial de actividad por comercial

### 3. Módulo de Clasificación (Comerciales)

- **Listado de transacciones:**
  * Ordenamiento y filtros dinámicos (fecha, monto, estado)
  * Paginación para mejor rendimiento con muchas transacciones
  * Búsqueda por texto para localizar transacciones específicas

- **Clasificación:**
  * Catálogo configurable de categorías
  * Listado dinámico de proyectos/clientes
  * Sugerencias basadas en clasificaciones anteriores
  * Clasificación masiva para transacciones similares

- **UX:**
  * Diseño responsive para uso en móvil
  * Guardado automático cada 2 minutos
  * Indicadores claros de progreso y estado

### 4. Reportes y Analítica

- **Visualizaciones:**
  * Gráficos interactivos con drill-down
  * Dashboards por comercial, categoría y proyecto
  * Comparativas mensuales y tendencias

- **Exportación:**
  * Excel con todas las columnas y filtros aplicados
  * PDF con gráficos y tablas resumen
  * Programación de reportes recurrentes

### 5. Administración del Sistema

- **Configuración:**
  * Catálogo de categorías (CRUD)
  * Gestión de proyectos/clientes
  * Parámetros de recordatorios y vencimientos

- **Seguridad:**
  * Roles: Admin, Finanzas, Comercial
  * Logs de acceso y acciones
  * Backup automático de datos

- **Histórico:**
  * Repositorio de períodos cerrados
  * Búsqueda y consulta de históricos
  * Restauración de snapshots para auditorías

## Requisitos Técnicos

- **Frontend:**
  * Aplicación web responsive
  * Framework moderno (React/Vue/Angular)
  * Diseño intuitivo y amigable

- **Backend:**
  * API RESTful
  * Procesamiento asíncrono para tareas pesadas
  * Validación y sanitización de datos

- **Seguridad:**
  * Autenticación JWT
  * HTTPS obligatorio
  * Protección contra inyección SQL, XSS
  * Encriptación de datos sensibles

- **Integración:**
  * API para conectar con sistemas contables
  * Webhooks para notificaciones externas
  * Exportación compatible con software financiero

## Beneficios Esperados

1. **Reducción de tiempo:** De días a horas en el proceso completo
2. **Eliminación de errores** manuales en la distribución y consolidación
3. **Mayor visibilidad** del estado de clasificación en tiempo real
4. **Experiencia fluida** para los comerciales sin necesidad de Excel
5. **Trazabilidad completa** para auditorías y control interno
6. **Seguridad mejorada:** cada usuario solo ve sus transacciones

## Métricas de Éxito

- Tiempo de procesamiento reducido en un 70%
- Tasa de errores de clasificación menor al 1%
- Adopción por parte de comerciales superior al 90%
- Satisfacción del equipo de Finanzas 4.5/5 o superior
