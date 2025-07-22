import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { updateCommercialStatus, updateCommercialEmail } from '@/lib/commercialService';
import { Commercial } from '@/types/commercial';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import AppLayout from '@/components/layout/AppLayout';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Edit } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Static list of card holder users
const CARD_HOLDER_NAMES = [
  'Allia Klipp',
  'Danielle Bury',
  'Denise Urbach',
  'Erica Chaparro',
  'Fabio Novick',
  'Gail Moore',
  'Ivana Novick',
  'Josue Garcia',
  'Landon Hamel',
  'Meredith Wellen',
  'Nancy Colon',
  'Sharon Pinto',
  'Suzanne Strazzeri',
  'Tara Sarris',
  'Timothy Hawver Scott'
];

const CommercialManagementPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [commercials, setCommercials] = useState<Commercial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentCommercial, setCurrentCommercial] = useState<Commercial | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Redirigir si el usuario no tiene permisos
  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'finance') {
      navigate('/');
    }
  }, [user, navigate]);

  // Load existing commercial users
  useEffect(() => {
    fetchCommercials();
  }, []);

  // Function to load existing commercial users
  const fetchCommercials = async () => {
    try {
      const { data, error } = await supabase
        .from('commercials')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      // Verify if all commercial users from the static list exist in the database
      // Si no existen, crearlos con email vacío
      const existingNames = data?.map(c => c.name) || [];
      const missingNames = CARD_HOLDER_NAMES.filter(name => !existingNames.includes(name));

      if (missingNames.length > 0) {
        console.log(`Creating ${missingNames.length} missing card holder users...`);
        
        // Create missing commercial users
        const newCommercials = missingNames.map(name => ({
          name,
          email: '',
          isActive: true
        }));

        const { error: insertError } = await supabase
          .from('commercials')
          .insert(newCommercials);

        if (insertError) {
          console.error('Error creating missing card holder users:', insertError);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Could not create all required card holder users",
          });
        } else {
          // Reload commercial users after inserting new ones
          const { data: updatedData, error: fetchError } = await supabase
            .from('commercials')
            .select('*')
            .order('name', { ascending: true });

          if (fetchError) throw fetchError;
          
          setCommercials(updatedData || []);
          toast({
            title: "Card holder users initialized",
            description: `${missingNames.length} missing card holder users have been created`,
          });
        }
      } else {
        setCommercials(data || []);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading commercial users:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Could not load commercial users",
      });
      setLoading(false);
    }
  };

  // Function to save/update a commercial user
  const handleSaveCommercial = async () => {
    if (!currentCommercial) return;
    
    setIsSaving(true);
    try {
      console.log('Saving commercial user:', currentCommercial.id, 'with email:', currentCommercial.email, 'and status:', currentCommercial.isActive);
      
      // Usar la nueva función del servicio
      const updatedCommercial = await updateCommercialEmail(
        currentCommercial.id, 
        currentCommercial.email || '', 
        currentCommercial.isActive
      );
      
      if (!updatedCommercial) {
        throw new Error('No se pudo actualizar el comercial');
      }
      
      console.log('Comercial actualizado:', updatedCommercial);
      
      // Actualizar el estado local
      setCommercials(commercials.map(c => 
        c.id === currentCommercial.id ? currentCommercial : c
      ));
      
      toast({
        title: "Card Holder user updated",
        description: `${currentCommercial.name}'s information has been updated`,
      });
      
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating commercial user:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Could not update the commercial user",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Function to update a commercial user's status
  const toggleCommercialStatus = async (commercial: Commercial) => {
    try {
      const newIsActive = !commercial.isActive;
      
      console.log('Updating commercial user:', commercial.id, 'to status:', newIsActive);
      
      // Usar la nueva función del servicio
      const updatedCommercial = await updateCommercialStatus(commercial.id, newIsActive);
      
      if (!updatedCommercial) {
        throw new Error('No se pudo actualizar el comercial');
      }
      
      console.log('Comercial actualizado:', updatedCommercial);
      
      // Actualizar el estado local
      setCommercials(commercials.map(c => 
        c.id === commercial.id ? updatedCommercial : c
      ));
      
      toast({
        title: newIsActive ? "Comercial activado" : "Comercial desactivado",
        description: `${commercial.name} ha sido ${newIsActive ? 'activado' : 'desactivado'}`,
      });
    } catch (error) {
      console.error('Error updating commercial user status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Could not update commercial user status",
      });
    }
  };

  // Función para abrir el diálogo de edición
  const openEditDialog = (commercial: Commercial) => {
    setCurrentCommercial(commercial);
    setIsEditDialogOpen(true);
  };

  // Function to format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd yyyy, HH:mm", { locale: enUS });
    } catch (error) {
      return "Invalid date";
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col w-full h-full">
        <div className="flex justify-between items-center p-6">
          <h1 className="text-3xl font-bold">Card Holder Users Management</h1>
        </div>
        
        <div className="w-full px-6 pb-6">
          <Card className="w-full overflow-hidden">
            <CardHeader>
              <CardTitle>Card Holder Users List</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
            {loading && (
              <div className="text-center py-8 text-muted-foreground">
                Loading commercial users...
              </div>
            )}
            
            {!loading && (
              <div className="w-full overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Creation Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commercials.map((commercial) => (
                      <TableRow key={commercial.id}>
                        <TableCell className="font-medium">{commercial.name}</TableCell>
                        <TableCell>{commercial.email || '(Not configured)'}</TableCell>
                        <TableCell>{formatDate(commercial.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={commercial.isActive}
                              onCheckedChange={() => toggleCommercialStatus(commercial)}
                            />
                            <Badge variant="outline" className={commercial.isActive ? 
                              "bg-green-100 text-green-800" : 
                              "bg-gray-100 text-gray-800"}>
                              {commercial.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openEditDialog(commercial)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            </CardContent>
          </Card>
        </div>

        {/* Dialog to edit commercial user email */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Card Holder User Email</DialogTitle>
              <DialogDescription>
                Update email for {currentCommercial?.name}.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={currentCommercial?.name || ''}
                  disabled
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={currentCommercial?.email || ''}
                  onChange={(e) => currentCommercial && setCurrentCommercial({
                    ...currentCommercial,
                    email: e.target.value
                  })}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={currentCommercial?.isActive || false}
                  onCheckedChange={(checked) => currentCommercial && setCurrentCommercial({
                    ...currentCommercial,
                    isActive: checked
                  })}
                />
                <Label htmlFor="isActive">Active card holder user</Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveCommercial} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default CommercialManagementPage;
