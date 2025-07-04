
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { signIn, signOut, getCurrentUser, validateCommercialAccessToken } from '@/lib/supabaseClient';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loginWithToken: (token: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Usuario de prueba automático para el modo sin inicio de sesión
const autoLoginUser: User = {
  id: "finance-1",
  email: "financiero@example.com",
  name: "Usuario de Finanzas",
  role: "finance",
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Verificar si hay un usuario autenticado al cargar la aplicación
  useEffect(() => {
    const checkUser = async () => {
      try {
        // Intentar obtener el usuario actual, pero no mostrar errores si no hay sesión
        const supabaseUser = await getCurrentUser().catch(() => null);
        
        if (supabaseUser) {
          // Convertir el usuario de Supabase al formato de nuestra aplicación
          const appUser: User = {
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            name: supabaseUser.user_metadata?.name || 'Usuario',
            role: supabaseUser.user_metadata?.role || 'finance',
          };
          
          setUser(appUser);
        } else {
          // No hay usuario autenticado
          setUser(null);
        }
      } catch (error) {
        console.error('Error al verificar usuario:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkUser();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const { user: supabaseUser } = await signIn(email, password);
      
      if (supabaseUser) {
        // Convertir el usuario de Supabase al formato de nuestra aplicación
        const appUser: User = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: supabaseUser.user_metadata?.name || 'Usuario',
          role: supabaseUser.user_metadata?.role || 'finance',
        };
        
        setUser(appUser);
        toast({
          title: "Inicio de sesión exitoso",
          description: `Bienvenido, ${appUser.name}`,
        });
        return true;
      } else {
        toast({
          variant: "destructive",
          title: "Error de inicio de sesión",
          description: "Email o contraseña incorrecta",
        });
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        variant: "destructive",
        title: "Error de inicio de sesión",
        description: "Ha ocurrido un error durante el inicio de sesión",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loginWithToken = async (token: string): Promise<boolean> => {
    try {
      setLoading(true);
      // Validar el token de acceso comercial
      const commercialName = await validateCommercialAccessToken(token);
      
      if (commercialName) {
        // Crear un usuario temporal para el comercial
        const commercialUser: User = {
          id: `commercial-${Date.now()}`,
          email: `${commercialName.toLowerCase().replace(/\s+/g, '.')}@temp.com`,
          name: commercialName,
          role: 'commercial',
        };
        
        setUser(commercialUser);
        toast({
          title: "Acceso temporal concedido",
          description: `Bienvenido, ${commercialName}`,
        });
        return true;
      }
      
      toast({
        variant: "destructive",
        title: "Enlace no válido",
        description: "El enlace de acceso ha caducado o no es válido.",
      });
      return false;
    } catch (error) {
      console.error('Error al validar token:', error);
      toast({
        variant: "destructive",
        title: "Error de acceso",
        description: "Ha ocurrido un error al validar el enlace de acceso.",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut();
      setUser(null);
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ha ocurrido un error al cerrar sesión",
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, loginWithToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
