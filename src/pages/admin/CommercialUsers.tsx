import React from 'react';
import { Helmet } from 'react-helmet';
import CommercialUserManager from '@/components/admin/CommercialUserManager';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const CommercialUsersPage: React.FC = () => {
  const { user } = useAuth();
  
  // Verificar que el usuario tenga rol de administrador
  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return (
    <>
      <Helmet>
        <title>Gestión de Usuarios Comerciales | FinFlow</title>
      </Helmet>
      
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Gestión de Usuarios Comerciales</h1>
        <p className="text-gray-600 mb-6">
          Crea y administra cuentas de usuario para tus comerciales. Cada comercial tendrá acceso
          únicamente a sus propias transacciones y datos.
        </p>
        
        <CommercialUserManager />
      </div>
    </>
  );
};

export default CommercialUsersPage;
