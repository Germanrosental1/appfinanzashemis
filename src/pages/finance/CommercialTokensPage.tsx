import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import CommercialTokenGenerator from '@/components/commercial/CommercialTokenGenerator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

// Tipo para los tokens de comerciales
interface CommercialToken {
  id: string;
  token: string;
  commercial_name: string;
  expires_at: string;
  created_at: string;
  used: boolean;
}

const CommercialTokensPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tokens, setTokens] = useState<CommercialToken[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirigir si el usuario no tiene permisos
  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'finance') {
      navigate('/');
    }
  }, [user, navigate]);

  // Cargar tokens existentes
  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const { data, error } = await supabase
          .from('commercial_access_tokens')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        setTokens(data || []);
      } catch (error) {
        console.error('Error al cargar tokens:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los tokens de acceso",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
  }, [toast]);

  // Función para copiar la URL del token al portapapeles
  const copyTokenUrl = (token: string) => {
    const baseUrl = window.location.origin;
    const tokenUrl = `${baseUrl}/token-login?token=${token}`;
    
    navigator.clipboard.writeText(tokenUrl)
      .then(() => {
        toast({
          title: "URL copiada",
          description: "La URL del token ha sido copiada al portapapeles",
        });
      })
      .catch(err => {
        console.error('Error al copiar URL:', err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo copiar la URL al portapapeles",
        });
      });
  };

  // Función para eliminar un token
  const deleteToken = async (id: string) => {
    try {
      const { error } = await supabase
        .from('commercial_access_tokens')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Actualizar la lista de tokens
      setTokens(tokens.filter(token => token.id !== id));
      
      toast({
        title: "Token eliminado",
        description: "El token de acceso ha sido eliminado correctamente",
      });
    } catch (error) {
      console.error('Error al eliminar token:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el token de acceso",
      });
    }
  };

  // Función para formatear fecha
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
    } catch (error) {
      return "Fecha inválida";
    }
  };

  // Verificar si un token ha expirado
  const isExpired = (expiresAt: string) => {
    return new Date() > new Date(expiresAt);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Gestión de Accesos para Comerciales</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario para generar tokens */}
        <div className="lg:col-span-1">
          <CommercialTokenGenerator />
        </div>
        
        {/* Lista de tokens existentes */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Tokens de Acceso Existentes</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
              ) : tokens.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Comercial</TableHead>
                      <TableHead>Creado</TableHead>
                      <TableHead>Expira</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tokens.map((token) => (
                      <TableRow key={token.id}>
                        <TableCell className="font-medium">{token.commercial_name}</TableCell>
                        <TableCell>{formatDate(token.created_at)}</TableCell>
                        <TableCell>{formatDate(token.expires_at)}</TableCell>
                        <TableCell>
                          {token.used ? (
                            <Badge variant="outline" className="bg-green-100 text-green-800">Utilizado</Badge>
                          ) : isExpired(token.expires_at) ? (
                            <Badge variant="outline" className="bg-red-100 text-red-800">Expirado</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-100 text-blue-800">Activo</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => copyTokenUrl(token.token)}
                              disabled={token.used || isExpired(token.expires_at)}
                            >
                              Copiar URL
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => deleteToken(token.id)}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No hay tokens de acceso generados
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CommercialTokensPage;
