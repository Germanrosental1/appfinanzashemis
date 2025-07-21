import React, { ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import hemisphereLogo from '@/assets/hemisphere-logo.png';

// Importar componentes de UI
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';

// Importar iconos
import { 
  Home, 
  Upload, 
  FileText, 
  Users, 
  Settings, 
  LogOut,
  Menu,
  User,
  ChevronDown,
  Mail
} from 'lucide-react';

// Componentes UI adicionales
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AppLayoutProps {
  children: ReactNode;
  requireRole?: 'admin' | 'finance' | 'commercial';
}

const AppLayout = ({ children, requireRole }: AppLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  
  // Función para verificar si una ruta está activa
  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  // Función para manejar el logout
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  // Verificar si el usuario tiene el rol requerido
  if (requireRole && user?.role !== requireRole) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="mb-6">You don't have permission to view this page.</p>
          <Button onClick={() => navigate('/')} variant="outline">
            Return to Home
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        {/* Barra lateral */}
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center justify-center py-4">
              <img src={hemisphereLogo} alt="Hemisphere Finance" className="h-10" />
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarMenu>
              {/* Dashboard - Visible solo para admin y finance */}
              {user?.role !== 'commercial' && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive('/finance/dashboard')}
                  >
                    <Link to="/finance/dashboard">
                      <Home className="size-4" />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              

              
              {/* Transacciones - Visible para commercial */}
              {user?.role === 'commercial' && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive('/commercial/transactions')}
                  >
                    <Link to="/commercial/transactions">
                      <FileText className="size-4" />
                      <span>Transactions</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              
              {/* Notificaciones a comerciales - Visible para admin y finance */}
              {(user?.role === 'admin' || user?.role === 'finance') && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive('/finance/commercials')}
                  >
                    <Link to="/finance/commercials">
                      <Mail className="size-4" />
                      <span>Commercial Notifications</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              
              {/* Usuarios Comerciales - Solo visible para admin */}
              {user?.role === 'admin' && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive('/admin/commercial-users')}
                  >
                    <Link to="/admin/commercial-users">
                      <User className="size-4" />
                      <span>Commercial Users</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarContent>
          
          <SidebarFooter>
            <div className="px-3 py-2">
              <SidebarTrigger />
            </div>
          </SidebarFooter>
        </Sidebar>
        
        {/* Contenido principal */}
        <div className="flex flex-col flex-1 overflow-hidden w-full">
          {/* Header */}
          <header className="h-16 border-b bg-card flex items-center px-4 md:px-6 w-full">
            <div className="flex-1 flex justify-between items-center">
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
              
              <div className="ml-auto flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{user?.email}</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/settings">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>
          
          {/* Contenido */}
          <main className="flex-1 overflow-auto w-full">
            {children}
          </main>
          
          {/* Footer */}
          <footer className="border-t py-4 px-6 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Hemisphere Finance. All rights reserved.
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;