import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, FileText, Loader2, Trash2, MoreVertical, CreditCard, Info } from "lucide-react";
import { BankStatement } from "@/types";
import { format } from "date-fns";
import { getAllBankStatements, deleteBankStatement } from "@/lib/supabaseClient";
import { convertFromSupabaseBankStatement } from "@/lib/bankStatementService";
import { toast } from "@/components/ui/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
  const [showAccountsDialog, setShowAccountsDialog] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

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
  
  // Función para mostrar el diálogo con todas las cuentas
  const showAccountsDetails = (accounts: string[]) => {
    setSelectedAccounts(accounts);
    setShowAccountsDialog(true);
  };
  
  // Función para extraer los últimos 4 dígitos de una cuenta
  const getLastFourDigits = (account: string) => {
    // Buscar los últimos 4 dígitos en el formato XXXX-XXXX-XXXX-1234
    const match = account.match(/\d{4}$/);
    return match ? match[0] : account;
  };

  useEffect(() => {
    fetchBankStatements();
  }, []);

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Processed Bank Statements</CardTitle>
          <CardDescription>
            List of uploaded and processed bank statements
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <Loader2 className="mx-auto h-12 w-12 text-gray-400 mb-3 animate-spin" />
              <p>Loading bank statements...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-red-500 font-medium">Error loading bank statements</p>
              <p className="mt-1">Please try refreshing the page</p>
            </div>
          ) : statements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p>No processed statements</p>
              <p className="text-sm">Upload a statement to begin</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead>Accounts</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statements.map((statement) => (
                  <TableRow key={statement.id}>
                    <TableCell className="font-medium">{statement.fileName}</TableCell>
                    <TableCell>{format(new Date(statement.uploadDate), 'dd/MM/yyyy, HH:mm')}</TableCell>
                    <TableCell>{statement.transactionCount}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-blue-50">
                          <CreditCard className="h-3 w-3 mr-1" />
                          {statement.accounts.length} {statement.accounts.length === 1 ? 'account' : 'accounts'}
                        </Badge>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                                <Info className="h-4 w-4 text-gray-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="max-w-xs">
                                <p className="font-semibold mb-1">Last 4 digits:</p>
                                <div className="flex flex-wrap gap-1">
                                  {statement.accounts.map(account => (
                                    <Badge key={account} variant="secondary" className="text-xs">
                                      {getLastFourDigits(account)}
                                    </Badge>
                                  ))}
                                </div>
                                <Button 
                                  variant="link" 
                                  size="sm" 
                                  className="mt-1 h-auto p-0 text-xs" 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    showAccountsDetails(statement.accounts);
                                  }}
                                >
                                  View all
                                </Button>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
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
                          ? "Processed" 
                          : statement.status === "error"
                          ? "Error"
                          : "Processing"}
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
                          View details
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
                              Delete statement
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
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will delete the bank statement "{statementToDelete?.fileName}" and all its associated transactions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
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
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Diálogo para mostrar todas las cuentas */}
      <Dialog open={showAccountsDialog} onOpenChange={setShowAccountsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Account Details</DialogTitle>
            <DialogDescription>
              Complete list of accounts associated with this statement
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Number</TableHead>
                  <TableHead>Last 4 digits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedAccounts.map(account => (
                  <TableRow key={account}>
                    <TableCell>{account}</TableCell>
                    <TableCell className="font-semibold">{getLastFourDigits(account)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProcessedStatementsList;
