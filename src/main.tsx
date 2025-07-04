import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Detectar si estamos en producción (Vercel)
const isProduction = window.location.hostname.includes('vercel.app') || 
                    !window.location.hostname.includes('localhost');

// Función para manejar rutas en BrowserRouter
const handleRouting = () => {
  // Verificar si venimos de una redirección 404
  const lastNotFoundPath = sessionStorage.getItem('lastNotFoundPath');
  if (lastNotFoundPath) {
    console.log('Redirección desde 404:', lastNotFoundPath);
    sessionStorage.removeItem('lastNotFoundPath');
  }
};

// Solo ejecutar la lógica de redirección en producción
if (isProduction) {
  handleRouting();
}

// Guardar la ruta actual para futuras referencias
window.addEventListener('popstate', () => {
  localStorage.setItem('lastPath', window.location.pathname);
});

createRoot(document.getElementById("root")!).render(<App />);
