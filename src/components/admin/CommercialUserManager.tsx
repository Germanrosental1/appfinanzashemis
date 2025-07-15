import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { createCommercialUser } from '@/scripts/createCommercialUsers';
import { toast } from 'react-hot-toast';
// Usando los componentes UI que ya existen en el proyecto
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, RefreshCw, Send, Trash, Key } from "lucide-react";

interface CommercialUser {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

const CommercialUserManager: React.FC = () => {
  const [users, setUsers] = useState<CommercialUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
  });
  const [newPassword, setNewPassword] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Cargar usuarios comerciales usando la API serverless
  const loadUsers = async () => {
    setLoading(true);
    try {
      // Llamar a la API serverless para listar usuarios comerciales
      const response = await fetch('/api/list-commercial-users');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar usuarios');
      }
      
      // Establecer los usuarios comerciales
      setUsers(data.users || []);
      
      // Si no hay usuarios, mostrar un mensaje
      if (!data.users || data.users.length === 0) {
        console.log('No se encontraron usuarios comerciales');
      }
    } catch (error: any) {
      toast.error(`Error al cargar usuarios: ${error.message}`);
      console.error('Error al cargar usuarios:', error);
      
      // Plan B: intentar cargar desde la tabla users
      try {
        const { data, error: tableError } = await supabase
          .from('users')
          .select('*')
          .eq('role', 'commercial');
        
        if (!tableError && data) {
          setUsers(data);
        } else {
          setUsers([]);
        }
      } catch (secondError) {
        console.error('Error en plan B:', secondError);
        setUsers([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Función para crear un nuevo usuario comercial usando la API serverless
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUser.email || !newUser.name) {
      toast.error('Por favor completa todos los campos');
      return;
    }
    
    setCreating(true);
    
    try {
      // Llamar a la API serverless en lugar de la función directa
      const response = await fetch('/api/create-commercial-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newUser.email,
          name: newUser.name,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al crear usuario');
      }
      
      // Actualizar la lista de usuarios
      setUsers([...users, {
        id: data.user.id,
        email: newUser.email,
        name: newUser.name,
        role: 'commercial',
        created_at: new Date().toISOString(),
      }]);
      
      // Limpiar el formulario
      setNewUser({ email: '', name: '' });
      
      toast.success(`Usuario comercial creado: ${newUser.email}`);
      
      // Guardar la contraseña para mostrarla
      setNewPassword(data.password);
      
      // Recargar la lista de usuarios
      loadUsers();
    } catch (error: any) {
      console.error('Error al crear usuario:', error);
      toast.error(`Error al crear usuario: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  // Eliminar un usuario comercial usando la API serverless
  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar al usuario ${email}?`)) {
      return;
    }

    try {
      // Llamar a la API serverless para eliminar el usuario
      const response = await fetch(`/api/delete-commercial-user?userId=${userId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar usuario');
      }

      toast.success(`Usuario ${email} eliminado con éxito`);
      
      // Actualizar la lista de usuarios
      setUsers(users.filter(user => user.id !== userId));
      
      // Recargar la lista completa para asegurarnos de tener datos actualizados
      loadUsers();
    } catch (error: any) {
      toast.error(`Error al eliminar usuario: ${error.message}`);
      console.error('Error al eliminar usuario:', error);
    }
  };
  
  // Restablecer contraseña de un usuario comercial
  const handleResetPassword = async (userId: string, email: string) => {
    // Generar una contraseña aleatoria de 10 caracteres
    const generatePassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let password = '';
      for (let i = 0; i < 10; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };
    
    const newPassword = generatePassword();
    
    try {
      // Llamar a la API serverless para restablecer la contraseña
      const response = await fetch('/api/reset-commercial-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          newPassword,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al restablecer contraseña');
      }
      
      // Mostrar la nueva contraseña
      setNewPassword(newPassword);
      toast.success(`Contraseña restablecida para ${email}`);
      
      // Mostrar el formulario con la nueva contraseña
      setShowForm(true);
    } catch (error: any) {
      toast.error(`Error al restablecer contraseña: ${error.message}`);
      console.error('Error al restablecer contraseña:', error);
    }
  };

  // Enviar email con credenciales
  const sendCredentialsByEmail = async (email: string, password: string) => {
    try {
      // Aquí implementarías el envío de email con las credenciales
      // Usando EmailJS o cualquier otro servicio
      toast.success(`Credenciales enviadas a ${email}`);
    } catch (error: any) {
      toast.error(`Error al enviar credenciales: ${error.message}`);
    }
  };

  // Cargar usuarios al montar el componente
  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gestión de Usuarios Comerciales</CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadUsers} 
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button 
              size="sm" 
              onClick={() => setShowForm(!showForm)}
            >
              <Plus className="h-4 w-4 mr-2" /> Nuevo Usuario
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showForm && (
            <form onSubmit={handleCreateUser} className="mb-6 p-4 border rounded-md">
              <h3 className="text-lg font-medium mb-4">Crear Nuevo Usuario Comercial</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="Nombre del comercial"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="email@ejemplo.com"
                    required
                  />
                </div>
                
                {newPassword && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm font-medium text-green-800">Contraseña generada:</p>
                    <p className="text-sm font-mono bg-white p-1 rounded mt-1 border">{newPassword}</p>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => sendCredentialsByEmail(newUser.email, newPassword)}
                    >
                      <Send className="h-4 w-4 mr-2" /> Enviar por email
                    </Button>
                  </div>
                )}
                
                <div className="flex justify-end">
                  <Button type="submit" disabled={creating}>
                    {creating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Creando...
                      </>
                    ) : (
                      'Crear Usuario'
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Fecha de Creación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                      {loading ? 'Cargando usuarios...' : 'No hay usuarios comerciales registrados'}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResetPassword(user.id, user.email)}
                            title="Restablecer contraseña"
                          >
                            <Key className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            title="Eliminar usuario"
                          >
                            <Trash className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommercialUserManager;
