
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const TokenLogin = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const authenticateWithToken = async () => {
      if (!token) {
        setError('No se proporcionó un token de acceso');
        return;
      }

      try {
        const success = await loginWithToken(token);
        if (success) {
          navigate('/commercial/transactions');
        } else {
          setError('El token proporcionado no es válido o ha expirado');
        }
      } catch (err) {
        console.error('Error during token authentication:', err);
        setError('Error durante la autenticación');
      }
    };

    authenticateWithToken();
  }, [token, loginWithToken, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold mb-4">
          {error ? 'Error de Autenticación' : 'Iniciando sesión...'}
        </h1>
        
        {error ? (
          <>
            <p className="text-red-500 mb-4">{error}</p>
            <p className="text-gray-600 mb-4">
              El enlace que ha utilizado no es válido o ha expirado. 
              Por favor, contacte con el departamento financiero para obtener un nuevo enlace.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              Ir a Inicio de Sesión
            </button>
          </>
        ) : (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenLogin;
