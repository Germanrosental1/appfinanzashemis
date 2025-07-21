import React, { useEffect, useState } from "react";
import "./compact-table.css";
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
      <Card className="w-full compact-table-container">
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
            <Table className="w-full table-fixed compact-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="col-file">File</TableHead>
                  <TableHead className="col-date">Upload</TableHead>
                  <TableHead className="col-trans text-center">Trans</TableHead>
                  <TableHead className="col-accounts">Accounts</TableHead>
                  <TableHead className="col-status">Status</TableHead>
                  <TableHead className="col-actions text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statements.map((statement) => (
                  <TableRow key={statement.id}>
                    <TableCell className="font-medium truncate" title={statement.fileName}>{statement.fileName}</TableCell>
                    <TableCell>{format(new Date(statement.uploadDate), 'MM/dd/yy')}</TableCell>
                    <TableCell className="text-center">{statement.transactionCount}</TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="bg-blue-50 cursor-pointer">
                              <CreditCard className="h-3 w-3 mr-1" />
                              {statement.accounts.length}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="max-w-xs">
                              <p className="font-semibold mb-1">Account numbers:</p>
                              <div className="flex flex-wrap gap-1">
                                {statement.accounts.slice(0, 5).map(account => (
                                  <Badge key={account} variant="secondary" className="text-xs">
                                    {getLastFourDigits(account)}
                                  </Badge>
                                ))}
                                {statement.accounts.length > 5 && (
                                  <Badge variant="secondary" className="text-xs">+{statement.accounts.length - 5} more</Badge>
                                )}
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
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statement.status === "processed" 
                          ? "bg-green-100 text-green-800 hover:bg-green-100" 
                          : statement.status === "error"
                          ? "bg-red-100 text-red-800 hover:bg-red-100"
                          : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"}`}
                      >
                        {statement.status === "processed" 
                          ? "Processed" 
                          : statement.status === "error" 
                          ? "Error" 
                          : "Processing"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="px-2 py-1 h-8"
                                onClick={() => onViewStatement(statement.id)}
                                disabled={statement.status !== "processed"}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span className="sr-md:inline hidden ml-1">View</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              <p>View statement details</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <DropdownMenu>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="px-2 py-1 h-8">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                              </TooltipTrigger>
                              <TooltipContent side="left">
                                <p>More options</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => confirmDelete(statement)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Delete
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
