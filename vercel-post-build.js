// Script para ejecutar después de la compilación de Vite
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener el directorio actual en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Ejecutando script post-build para Vercel...');

// Asegurarse de que el directorio dist existe
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  console.error('El directorio dist no existe. Asegúrate de ejecutar este script después de la compilación.');
  process.exit(1);
}

// Crear un archivo _redirects si no existe
const redirectsPath = path.join(distDir, '_redirects');
console.log('Creando archivo _redirects...');
fs.writeFileSync(redirectsPath, '/* /index.html 200\n');

// Crear un archivo vercel.json en el directorio dist
const vercelConfigPath = path.join(distDir, 'vercel.json');
console.log('Creando archivo vercel.json en dist...');
fs.writeFileSync(vercelConfigPath, JSON.stringify({
  "version": 2,
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "cleanUrls": true,
  "trailingSlash": false,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, no-cache, must-revalidate, proxy-revalidate"
        },
        {
          "key": "Pragma",
          "value": "no-cache"
        },
        {
          "key": "Expires",
          "value": "0"
        }
      ]
    }
  ]
}, null, 2));

// Crear un archivo _routes.json en el directorio dist
const routesPath = path.join(distDir, '_routes.json');
console.log('Creando archivo _routes.json en dist...');
fs.writeFileSync(routesPath, JSON.stringify({
  "version": 1,
  "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "status": 200, "dest": "/index.html" }
  ]
}, null, 2));

// Crear un archivo _headers en el directorio dist
const headersPath = path.join(distDir, '_headers');
console.log('Creando archivo _headers en dist...');
fs.writeFileSync(headersPath, `/*
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  X-Content-Type-Options: nosniff
  Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
  Pragma: no-cache
  Expires: 0
  Surrogate-Control: no-store

/assets/*
  Cache-Control: public, max-age=31536000, immutable
`);

// Copiar el archivo clear-cache.js a dist si existe en public
const sourceCacheClearPath = path.join(__dirname, 'public', 'clear-cache.js');
const destCacheClearPath = path.join(distDir, 'clear-cache.js');
if (fs.existsSync(sourceCacheClearPath)) {
  console.log('Copiando clear-cache.js a dist...');
  fs.copyFileSync(sourceCacheClearPath, destCacheClearPath);
}

console.log('Script post-build completado con éxito.');
