import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, FileText, Loader2, Trash2, MoreVertical } from "lucide-react";
import { BankStatement } from "@/types";
import { format } from "date-fns";
import { getAllBankStatements, deleteBankStatement } from "@/lib/supabaseClient";
import { convertFromSupabaseBankStatement } from "@/lib/bankStatementService";
import { toast } from "@/components/ui/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface ProcessedStatementsListProps {
  onViewStatement: (statementId: string) => void;
}

const ProcessedStatementsList: React.FC<ProcessedStatementsListProps> = ({ 
  onViewStatement 
}) => {
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statementToDelete, setStatementToDelete] = useState<BankStatement | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Función para cargar los extractos bancarios
  const fetchBankStatements = async () => {
    try {
      setLoading(true);
      // Obtener los extractos bancarios de Supabase
      const supabaseStatements = await getAllBankStatements();
      
      // Convertir los extractos bancarios de Supabase a nuestro formato
      const appStatements = supabaseStatements.map(convertFromSupabaseBankStatement);
      
      setStatements(appStatements);
      setError(null);
    } catch (err) {
      console.error('Error al obtener extractos bancarios:', err);
      setError('Error al cargar los extractos bancarios');
    } finally {
      setLoading(false);
    }
  };

  // Función para manejar la eliminación de un extracto bancario
  const handleDeleteStatement = async () => {
    if (!statementToDelete) return;
    
    try {
      setIsDeleting(true);
      await deleteBankStatement(statementToDelete.id);
      
      // Actualizar la lista de extractos
      await fetchBankStatements();
      
      toast({
        title: "Extracto eliminado",
        description: `El extracto ${statementToDelete.fileName} ha sido eliminado correctamente.`,
      });
    } catch (err) {
      console.error('Error al eliminar el extracto:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el extracto bancario.",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setStatementToDelete(null);
    }
  };

  // Función para abrir el diálogo de confirmación
  const confirmDelete = (statement: BankStatement) => {
    setStatementToDelete(statement);
    setShowDeleteDialog(true);
  };

  useEffect(() => {
    fetchBankStatements();
  }, []);

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Extractos Bancarios Procesados</CardTitle>
          <CardDescription>
            Lista de extractos bancarios subidos y procesados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <Loader2 className="mx-auto h-12 w-12 text-gray-400 mb-3 animate-spin" />
              <p>Cargando extractos bancarios...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-red-500">{error}</p>
              <p className="text-sm">Intenta recargar la página</p>
            </div>
          ) : statements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p>No hay extractos procesados</p>
              <p className="text-sm">Sube un extracto para comenzar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Archivo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Fecha de carga</TableHead>
                  <TableHead>Transacciones</TableHead>
                  <TableHead>Cuentas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statements.map((statement) => (
                  <TableRow key={statement.id}>
                    <TableCell className="font-medium">{statement.fileName}</TableCell>
                    <TableCell>{statement.period}</TableCell>
                    <TableCell>
                      {format(new Date(statement.uploadDate), "dd/MM/yyyy, HH:mm")}
                    </TableCell>
                    <TableCell>{statement.transactionCount}</TableCell>
                    <TableCell>
                      {statement.accounts.map(account => (
                        <span key={account} className="inline-block bg-gray-100 rounded-full px-2 py-1 text-xs mr-1 mb-1">
                          *{account}
                        </span>
                      ))}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        statement.status === "processed" 
                          ? "bg-green-100 text-green-800" 
                          : statement.status === "error"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {statement.status === "processed" 
                          ? "Procesado" 
                          : statement.status === "error"
                          ? "Error"
                          : "Procesando"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewStatement(statement.id)}
                          disabled={statement.status !== "processed"}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver detalle
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => confirmDelete(statement)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar extracto
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el extracto bancario "{statementToDelete?.fileName}" y todas sus transacciones asociadas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDeleteStatement();
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProcessedStatementsList;
