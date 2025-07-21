
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import FinanceDashboard from "./pages/finance/FinanceDashboard";

import CommercialTransactions from "./pages/commercial/CommercialTransactions";
import AccountDetail from "./pages/finance/AccountDetail";
import CommercialClassify from "./pages/finance/CommercialClassify";
import CommercialTokensPage from "./pages/finance/CommercialTokensPage";
import CommercialManagementPage from "./pages/finance/CommercialManagementPage";
import CommercialUsersPage from "./pages/admin/CommercialUsers";
import TokenLogin from "./pages/TokenLogin";
import NotFound from "./pages/NotFound";
import CheckSchema from "./pages/debug/CheckSchema";
import { ReactNode } from "react";

const queryClient = new QueryClient();

// Componente para proteger rutas
interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
  allowedRoles?: string[];
}

const ProtectedRoute = ({ children, requiredRole, allowedRoles }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  // Si está cargando, mostrar un indicador de carga
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  // Si no hay usuario autenticado, redirigir a login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Verificar si se requiere un rol específico o roles permitidos
  const hasRequiredRole = requiredRole ? user.role === requiredRole : true;
  const hasAllowedRole = allowedRoles ? allowedRoles.includes(user.role) : true;
  
  if ((requiredRole && !hasRequiredRole) || (allowedRoles && allowedRoles.length > 0 && !hasAllowedRole)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p className="mb-6 text-center">You don't have permission to view this page.</p>
        <p className="mb-6 text-center text-sm text-gray-500">
          Current role: {user.role}, Required role: {requiredRole || allowedRoles?.join(' or ')}
        </p>
        <button 
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Return to Home
        </button>
      </div>
    );
  }
  
  // Si todo está bien, mostrar el contenido protegido
  return <>{children}</>;
};

// Componente para redirección basada en rol
const RoleBasedRedirect = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  console.log('RoleBasedRedirect - Current user:', user);
  console.log('RoleBasedRedirect - Current location:', location.pathname);
  
  // Si está cargando, mostrar un indicador de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading user information...</p>
      </div>
    );
  }
  
  // Si no hay usuario, redirigir al login
  if (!user) {
    console.log('RoleBasedRedirect - No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  console.log('RoleBasedRedirect - User role:', user.role);
  
  // Redirigir según el rol
  if (user.role === 'commercial') {
    console.log('RoleBasedRedirect - Commercial user, redirecting to /commercial/transactions');
    return <Navigate to="/commercial/transactions" replace />;
  } else if (user.role === 'admin') {
    console.log('RoleBasedRedirect - Admin user, redirecting to /finance/dashboard');
    return <Navigate to="/finance/dashboard" replace />;
  } else if (user.role === 'finance') {
    console.log('RoleBasedRedirect - Finance user, redirecting to /finance/dashboard');
    return <Navigate to="/finance/dashboard" replace />;
  }
  
  // Si el rol no es reconocido, mostrar un mensaje de error
  return (
    <div className="flex flex-col items-center justify-center h-screen p-4">
      <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Role</h1>
      <p className="mb-6 text-center">Your user account has an invalid role: {user.role}</p>
      <button 
        onClick={() => window.location.href = '/login'}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Return to Login
      </button>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RoleBasedRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            
            {/* Rutas protegidas para usuarios con rol finance */}
            <Route path="/finance/dashboard" element={
              <ProtectedRoute allowedRoles={['admin', 'finance']}>
                <FinanceDashboard />
              </ProtectedRoute>
            } />
            <Route path="/finance/accounts/:accountId" element={
              <ProtectedRoute allowedRoles={['admin', 'finance']}>
                <AccountDetail />
              </ProtectedRoute>
            } />

            <Route path="/finance/commercial-tokens" element={
              <ProtectedRoute allowedRoles={['admin', 'finance']}>
                <CommercialTokensPage />
              </ProtectedRoute>
            } />
            <Route path="/finance/commercials" element={
              <ProtectedRoute allowedRoles={['admin', 'finance']}>
                <CommercialManagementPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/commercial-users" element={
              <ProtectedRoute requiredRole="admin">
                <CommercialUsersPage />
              </ProtectedRoute>
            } />
            
            {/* Rutas protegidas para usuarios con rol commercial */}
            <Route path="/commercial/transactions" element={
              <ProtectedRoute requiredRole="commercial">
                <CommercialTransactions />
              </ProtectedRoute>
            } />
            
            {/* Rutas públicas */}
            <Route path="/token-login" element={<TokenLogin />} />
            <Route path="/classify/:token" element={<CommercialClassify />} />
            
            {/* Ruta de depuración */}
            <Route path="/debug/schema" element={
              <ProtectedRoute allowedRoles={['admin', 'finance']}>
                <CheckSchema />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
