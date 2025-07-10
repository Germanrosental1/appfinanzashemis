#!/bin/bash

# Script para corregir las importaciones en los componentes UI
# Reemplaza @/lib/utils por ../../lib/utils

# Directorio de componentes UI
UI_DIR="/Users/germanflores/Desktop/G/Rosental/Proyectos activos/Clasificador de Finanzas/fin-flow-lovable-main/src/components/ui"

# Buscar todos los archivos .tsx en el directorio de componentes UI
for file in "$UI_DIR"/*.tsx; do
  # Reemplazar @/lib/utils por ../../lib/utils
  sed -i '' 's|@/lib/utils|../../lib/utils|g' "$file"
  echo "Corregido: $file"
done

echo "¡Todas las importaciones han sido corregidas!"
