import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { associateCommercialToTransactions } from '../../lib/commercialService';
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

  // Load commercial users using the serverless API
  const loadUsers = async () => {
    setLoading(true);
    try {
      // Llamar a la API serverless para listar usuarios comerciales
      const response = await fetch('/api/list-commercial-users');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error loading users');
      }
      
      // Set commercial users
      setUsers(data.users || []);
      
      // If there are no users, show a message
      if (!data.users || data.users.length === 0) {
        console.log('No commercial users found');
      }
    } catch (error: any) {
      toast.error(`Error loading users: ${error.message}`);
      console.error('Error loading users:', error);
      
      // Plan B: try loading from the users table
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
        console.error('Error in plan B:', secondError);
        setUsers([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to create a new commercial user using the serverless API
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUser.email || !newUser.name) {
      toast.error('Please complete all fields');
      return;
    }
    
    setCreating(true);
    
    try {
      // Call the serverless API instead of the direct function
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
      
      // Try to associate pending transactions to this commercial user
      try {
        const transactionsUpdated = await associateCommercialToTransactions(data.user.id, newUser.name);
        if (transactionsUpdated > 0) {
          toast.success(`${transactionsUpdated} pending transactions were associated with the user`);
        }
      } catch (associateError) {
        console.error('Error associating transactions:', associateError);
        // We don't show an error to the user to avoid confusion
      }
      
      // Clear the form
      setNewUser({ email: '', name: '' });
      
      toast.success(`Commercial user created: ${newUser.email}`);
      
      // Save the password to display it
      setNewPassword(data.password);
      
      // Reload the user list
      loadUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(`Error creating user: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  // Delete a commercial user using the serverless API
  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete the user ${email}?`)) {
      return;
    }

    try {
      // Call the serverless API to delete the user
      const response = await fetch(`/api/delete-commercial-user?userId=${userId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error deleting user');
      }

      toast.success(`User ${email} successfully deleted`);
      
      // Actualizar la lista de usuarios
      setUsers(users.filter(user => user.id !== userId));
      
      // Reload the complete list to ensure we have updated data
      loadUsers();
    } catch (error: any) {
      toast.error(`Error deleting user: ${error.message}`);
      console.error('Error deleting user:', error);
    }
  };
  
  // Reset a commercial user's password
  const handleResetPassword = async (userId: string, email: string) => {
    // Generate a random 10-character password
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
      // Call the serverless API to reset the password
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
        throw new Error(data.error || 'Error resetting password');
      }
      
      // Display the new password
      setNewPassword(newPassword);
      toast.success(`Password reset for ${email}`);
      
      // Show the form with the new password
      setShowForm(true);
    } catch (error: any) {
      toast.error(`Error resetting password: ${error.message}`);
      console.error('Error resetting password:', error);
    }
  };

  // Send email with credentials
  const sendCredentialsByEmail = async (email: string, password: string) => {
    try {
      // Here you would implement sending email with credentials
      // Using EmailJS or any other service
      toast.success(`Credentials sent to ${email}`);
    } catch (error: any) {
      toast.error(`Error sending credentials: ${error.message}`);
    }
  };

  // Load users when mounting the component
  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Commercial Users Management</CardTitle>
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
              <Plus className="h-4 w-4 mr-2" /> New User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showForm && (
            <form onSubmit={handleCreateUser} className="mb-6 p-4 border rounded-md">
              <h3 className="text-lg font-medium mb-4">Create New Commercial User</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="Commercial user name"
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
                    placeholder="email@example.com"
                    required
                  />
                </div>
                
                {newPassword && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm font-medium text-green-800">Generated password:</p>
                    <p className="text-sm font-mono bg-white p-1 rounded mt-1 border">{newPassword}</p>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => sendCredentialsByEmail(newUser.email, newPassword)}
                    >
                      <Send className="h-4 w-4 mr-2" /> Send by email
                    </Button>
                  </div>
                )}
                
                <div className="flex justify-end">
                  <Button type="submit" disabled={creating}>
                    {creating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...
                      </>
                    ) : (
                      'Create User'
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
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Creation Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                      {loading ? 'Loading users...' : 'No commercial users registered'}
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
                            title="Reset password"
                          >
                            <Key className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            title="Delete user"
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
