module.exports = {
  // Configuración para manejar correctamente las rutas SPA
  trailingSlash: true,
  async rewrites() {
    return [
      {
        source: '/:path*',
        destination: '/index.html',
      },
    ]
  },
};
