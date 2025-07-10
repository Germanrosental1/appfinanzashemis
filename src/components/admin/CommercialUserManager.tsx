import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { createCommercialUser } from '@/scripts/createCommercialUsers';
import { toast } from 'react-hot-toast';
// Usando los componentes UI que ya existen en el proyecto
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, RefreshCw, Send, Trash } from 'lucide-react';

interface CommercialUser {
  id: string;
  email: string;
  name: string;
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

  // Cargar usuarios comerciales
  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'commercial');

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast.error(`Error al cargar usuarios: ${error.message}`);
      console.error('Error al cargar usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  // Crear un nuevo usuario comercial
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUser.email || !newUser.name) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    setCreating(true);
    try {
      const { user, password } = await createCommercialUser(
        newUser.email,
        newUser.name
      );
      
      setNewPassword(password);
      toast.success(`Usuario creado con éxito: ${newUser.email}`);
      loadUsers();
      setNewUser({ email: '', name: '' });
    } catch (error: any) {
      toast.error(`Error al crear usuario: ${error.message}`);
      console.error('Error al crear usuario:', error);
    } finally {
      setCreating(false);
    }
  };

  // Eliminar un usuario comercial
  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar al usuario ${email}?`)) {
      return;
    }

    try {
      // Eliminar de la tabla users
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (userError) throw userError;

      // Eliminar de auth
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      
      if (authError) throw authError;

      toast.success(`Usuario ${email} eliminado con éxito`);
      loadUsers();
    } catch (error: any) {
      toast.error(`Error al eliminar usuario: ${error.message}`);
      console.error('Error al eliminar usuario:', error);
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id, user.email)}
                        >
                          <Trash className="h-4 w-4 text-red-500" />
                        </Button>
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
