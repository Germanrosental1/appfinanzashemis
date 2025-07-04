import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Asegurar que las rutas funcionen correctamente en producción
  base: "/",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    // Optimizaciones para SPA en Vercel
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
    // Copiar archivos especiales para Vercel
    copyPublicDir: true,
  },
}));
