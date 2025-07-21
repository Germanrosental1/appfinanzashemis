
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
          console.log('User authenticated:', supabaseUser);
          console.log('User metadata:', supabaseUser.user_metadata);
          
          // Asegurar que el rol sea uno de los valores permitidos
          const validRoles = ['admin', 'finance', 'commercial'];
          let userRole = supabaseUser.user_metadata?.role || 'finance';
          
          if (!validRoles.includes(userRole)) {
            console.warn(`Invalid role detected: ${userRole}, defaulting to 'finance'`);
            userRole = 'finance';
          }
          
          // Convertir el usuario de Supabase al formato de nuestra aplicación
          const appUser: User = {
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            name: supabaseUser.user_metadata?.name || 'User',
            role: userRole as 'admin' | 'finance' | 'commercial',
          };
          
          console.log('App user created:', appUser);
          setUser(appUser);
        } else {
          // No hay usuario autenticado
          console.log('No authenticated user found');
          setUser(null);
        }
      } catch (error) {
        console.error('Error checking user authentication:', error);
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
      console.log('Attempting login for:', email);
      const { user: supabaseUser } = await signIn(email, password);
      
      if (supabaseUser) {
        console.log('Login successful for user:', supabaseUser.id);
        console.log('User metadata:', supabaseUser.user_metadata);
        
        // Asegurar que el rol sea uno de los valores permitidos
        const validRoles = ['admin', 'finance', 'commercial'];
        let userRole = supabaseUser.user_metadata?.role || 'finance';
        
        if (!validRoles.includes(userRole)) {
          console.warn(`Invalid role detected: ${userRole}, defaulting to 'finance'`);
          userRole = 'finance';
        }
        
        // Convertir el usuario de Supabase al formato de nuestra aplicación
        const appUser: User = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: supabaseUser.user_metadata?.name || 'User',
          role: userRole as 'admin' | 'finance' | 'commercial',
        };
        
        console.log('App user created:', appUser);
        setUser(appUser);
        toast({
          title: "Login Successful",
          description: `Welcome, ${appUser.name}`,
        });
        return true;
      } else {
        console.log('Login failed: No user returned');
        toast({
          variant: "destructive",
          title: "Login Error",
          description: "Incorrect email or password",
        });
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        variant: "destructive",
        title: "Login Error",
        description: "An error occurred during login",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loginWithToken = async (token: string): Promise<boolean> => {
    try {
      setLoading(true);
      console.log('Attempting to login with token');
      // Validar el token de acceso comercial
      const commercialName = await validateCommercialAccessToken(token);
      
      if (commercialName) {
        console.log('Token validated successfully for commercial user:', commercialName);
        // Crear un usuario temporal para el comercial
        const commercialUser: User = {
          id: `commercial-${Date.now()}`,
          email: `${commercialName.toLowerCase().replace(/\s+/g, '.')}@temp.com`,
          name: commercialName,
          role: 'commercial',
        };
        
        console.log('Commercial user created:', commercialUser);
        setUser(commercialUser);
        toast({
          title: "Temporary Access Granted",
          description: `Welcome, ${commercialName}`,
        });
        return true;
      }
      
      console.log('Token validation failed: Invalid or expired token');
      toast({
        variant: "destructive",
        title: "Invalid Link",
        description: "The access link has expired or is invalid.",
      });
      return false;
    } catch (error) {
      console.error('Error validating token:', error);
      toast({
        variant: "destructive",
        title: "Access Error",
        description: "An error occurred while validating the access link.",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('Attempting to logout');
      await signOut();
      setUser(null);
      console.log('User logged out successfully');
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out",
      });
    } catch (error) {
      console.error('Error during logout:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while logging out",
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
