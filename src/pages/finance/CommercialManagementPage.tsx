import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { updateCommercialStatus, updateCommercialEmail } from '@/lib/commercialService';
import { Commercial } from '@/types/commercial';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import AppLayout from '@/components/layout/AppLayout';

// Componentes UI
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

// Lista estática de comerciales
const COMMERCIAL_NAMES = [
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

  // Cargar comerciales existentes
  useEffect(() => {
    fetchCommercials();
  }, []);

  // Función para cargar comerciales existentes
  const fetchCommercials = async () => {
    try {
      const { data, error } = await supabase
        .from('commercials')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      // Verificar si todos los comerciales de la lista estática existen en la base de datos
      // Si no existen, crearlos con email vacío
      const existingNames = data?.map(c => c.name) || [];
      const missingNames = COMMERCIAL_NAMES.filter(name => !existingNames.includes(name));

      if (missingNames.length > 0) {
        console.log(`Creando ${missingNames.length} comerciales faltantes...`);
        
        // Crear comerciales faltantes
        const newCommercials = missingNames.map(name => ({
          name,
          email: '',
          isActive: true
        }));

        const { error: insertError } = await supabase
          .from('commercials')
          .insert(newCommercials);

        if (insertError) {
          console.error('Error al crear comerciales faltantes:', insertError);
          toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudieron crear todos los comerciales necesarios",
          });
        } else {
          // Recargar los comerciales después de insertar los nuevos
          const { data: updatedData, error: fetchError } = await supabase
            .from('commercials')
            .select('*')
            .order('name', { ascending: true });

          if (fetchError) throw fetchError;
          
          setCommercials(updatedData || []);
          toast({
            title: "Comerciales inicializados",
            description: `Se han creado ${missingNames.length} comerciales faltantes`,
          });
        }
      } else {
        setCommercials(data || []);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar comerciales:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudieron cargar los comerciales",
      });
      setLoading(false);
    }
  };

  // Función para guardar/actualizar un comercial
  const handleSaveCommercial = async () => {
    if (!currentCommercial) return;
    
    setIsSaving(true);
    try {
      console.log('Guardando comercial:', currentCommercial.id, 'con email:', currentCommercial.email, 'y estado:', currentCommercial.isActive);
      
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
        title: "Comercial actualizado",
        description: `La información de ${currentCommercial.name} ha sido actualizada`,
      });
      
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error al actualizar comercial:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo actualizar el comercial",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Función para actualizar el estado de un comercial
  const toggleCommercialStatus = async (commercial: Commercial) => {
    try {
      const newIsActive = !commercial.isActive;
      
      console.log('Actualizando comercial:', commercial.id, 'a estado:', newIsActive);
      
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
      console.error('Error al actualizar estado del comercial:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo actualizar el estado del comercial",
      });
    }
  };

  // Función para abrir el diálogo de edición
  const openEditDialog = (commercial: Commercial) => {
    setCurrentCommercial(commercial);
    setIsEditDialogOpen(true);
  };

  // Función para formatear fecha
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy, HH:mm', { locale: es });
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Gestión de Comerciales</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Lista de Comerciales</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="text-center py-8 text-muted-foreground">
                Cargando comerciales...
              </div>
            )}
            
            {!loading && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Fecha Creación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commercials.map((commercial) => (
                    <TableRow key={commercial.id}>
                      <TableCell className="font-medium">{commercial.name}</TableCell>
                      <TableCell>{commercial.email || '(No configurado)'}</TableCell>
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
                            {commercial.isActive ? "Activo" : "Inactivo"}
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
            )}
          </CardContent>
        </Card>

        {/* Diálogo para editar email del comercial */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Email de Comercial</DialogTitle>
              <DialogDescription>
                Actualice el email para {currentCommercial?.name}.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre</Label>
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
                  placeholder="correo@ejemplo.com"
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
                <Label htmlFor="isActive">Comercial activo</Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveCommercial} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar
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
