import React, { ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

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
  ChevronDown
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

const AppLayout = ({ children }: AppLayoutProps) => {
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
  
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        {/* Barra lateral */}
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center justify-center py-4">
              <h1 className="text-xl font-bold text-primary">FinFlow</h1>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarMenu>
              {/* Dashboard - Visible para todos */}
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
              

              
              {/* Transacciones - Visible para commercial */}
              {user?.role === 'commercial' && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive('/commercial/transactions')}
                  >
                    <Link to="/commercial/transactions">
                      <FileText className="size-4" />
                      <span>Transacciones</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              
              {/* Comerciales - Visible para admin y finance */}
              {(user?.role === 'admin' || user?.role === 'finance') && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive('/finance/commercials')}
                  >
                    <Link to="/finance/commercials">
                      <Users className="size-4" />
                      <span>Comerciales</span>
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
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <header className="h-16 border-b bg-card flex items-center px-4 md:px-6">
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
                    <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/settings">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Configuración</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Cerrar sesión</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>
          
          {/* Contenido */}
          <main className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </main>
          
          {/* Footer */}
          <footer className="border-t py-4 px-6 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} FinFlow. Todos los derechos reservados.
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;