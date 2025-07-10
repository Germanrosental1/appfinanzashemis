
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
    return <div>Cargando...</div>;
  }
  
  // Si no hay usuario autenticado, redirigir a login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Verificar si se requiere un rol específico
  if (requiredRole && user.role !== requiredRole) {
    return <div>Acceso denegado. No tienes permisos para ver esta página.</div>;
  }
  
  // Verificar si el usuario tiene alguno de los roles permitidos
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <div>Acceso denegado. No tienes permisos para ver esta página.</div>;
  }
  
  // Si todo está bien, mostrar el contenido protegido
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/finance/dashboard" replace />} />
            <Route path="/login" element={<LoginPage />} />
            
            {/* Rutas protegidas para usuarios con rol finance */}
            <Route path="/finance/dashboard" element={
              <ProtectedRoute>
                <FinanceDashboard />
              </ProtectedRoute>
            } />
            <Route path="/finance/accounts/:accountId" element={
              <ProtectedRoute>
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
