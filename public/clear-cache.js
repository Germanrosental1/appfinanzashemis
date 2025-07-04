// Script para limpiar la caché del navegador
(function() {
  // Generar un timestamp único para forzar la recarga de recursos
  const timestamp = new Date().getTime();
  
  // Intentar limpiar la caché del navegador
  if ('caches' in window) {
    caches.keys().then(function(cacheNames) {
      cacheNames.forEach(function(cacheName) {
        console.log('Limpiando caché:', cacheName);
        caches.delete(cacheName);
      });
    });
  }
  
  // Forzar la recarga de la página si es la primera visita después del despliegue
  const lastDeployTime = localStorage.getItem('lastDeployTime');
  const currentDeployTime = timestamp;
  
  localStorage.setItem('lastDeployTime', currentDeployTime);
  
  if (lastDeployTime && lastDeployTime !== currentDeployTime.toString()) {
    console.log('Nueva versión detectada, recargando...');
    window.location.reload(true);
  }
})();
