import React from 'react';
import { Helmet } from 'react-helmet';
import CommercialUserManager from '@/components/admin/CommercialUserManager';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';

const CommercialUsersPage: React.FC = () => {
  const { user } = useAuth();
  
  // Verify that the user has admin role
  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return (
    <AppLayout>
      <Helmet>
        <title>Commercial Users Management | HEMISPHERE BRANDS</title>
      </Helmet>
      
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Commercial Users Management</h1>
        <p className="text-gray-600 mb-6">
          Create and manage user accounts for your commercial users. Each commercial user will have access
          only to their own transactions and data.
        </p>
        
        <CommercialUserManager />
      </div>
    </AppLayout>
  );
};

export default CommercialUsersPage;
