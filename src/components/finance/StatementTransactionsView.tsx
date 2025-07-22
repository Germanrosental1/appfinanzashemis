import React, { useEffect, useState } from "react";
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2, Plus, Pencil, Trash2, Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { BankStatement, Transaction } from "@/types";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { es } from "date-fns/locale";
import { 
  getBankStatementById, 
  getTransactionsByBankStatementId, 
  updateTransaction, 
  deleteTransaction, 
  createTransaction
} from "@/lib/supabaseClient";
import { convertFromSupabaseBankStatement } from "@/lib/bankStatementService";
import { toast } from "@/components/ui/use-toast";
import TransactionForm from "./TransactionForm";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { notifyAllCommercials, getNotificationsByStatement, getCommercialUsersForDropdown, assignCommercialToTransaction, assignCommercialToMultipleTransactions } from "@/lib/commercialService";
import { CommercialNotification } from "@/types/commercial";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StatementTransactionsViewProps {
  statementId: string;
  onBack: () => void;
}

const StatementTransactionsView: React.FC<StatementTransactionsViewProps> = ({ 
  statementId,
  onBack
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statement, setStatement] = useState<BankStatement | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [groupedTransactions, setGroupedTransactions] = useState<Record<string, Transaction[]>>({});
  
  // States for dialogs
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isNotificationsDialogOpen, setIsNotificationsDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedCommercial, setSelectedCommercial] = useState<string>("");
  const [isNotifying, setIsNotifying] = useState(false);
  const [notifications, setNotifications] = useState<CommercialNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [commercialUsers, setCommercialUsers] = useState<{id: string, name: string}[]>([]);
  const [loadingCommercialUsers, setLoadingCommercialUsers] = useState(false);

  // Function to load commercial users
  const loadCommercialUsers = async () => {
    try {
      console.log('Starting commercial users loading...');
      setLoadingCommercialUsers(true);
      const users = await getCommercialUsersForDropdown();
      console.log('Commercial users obtained:', users);
      if (users && users.length > 0) {
        console.log(`Found ${users.length} commercial users`);
        setCommercialUsers(users);
      } else {
        console.warn('No commercial users found');
        // Intentar cargar usuarios comerciales de nuevo después de un breve retraso
        setTimeout(async () => {
          console.log('Retrying commercial users loading...');
          const retryUsers = await getCommercialUsersForDropdown();
          console.log('Retry result:', retryUsers);
          setCommercialUsers(retryUsers || []);
        }, 2000);
      }
    } catch (error) {
      console.error('Error loading commercial users:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load commercial users.",
      });
    } finally {
      setLoadingCommercialUsers(false);
    }
  };

  // Function to load previous notifications
  const loadNotifications = async () => {
    if (!statement) return;
    
    try {
      setLoadingNotifications(true);
      const notificationsList = await getNotificationsByStatement(statement.id);
      setNotifications(notificationsList);
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las notificaciones previas.",
      });
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Function to generate temporary tokens and send notifications to commercial users
  const handleNotifyCommercials = async () => {
    if (!statement) return;
    
    try {
      setIsNotifying(true);
      
      // Notify all active commercial users
      const result = await notifyAllCommercials(statement);
      
      // Reload notifications
      await loadNotifications();
      
      // Show result to user
      if (result.success > 0) {
        toast({
          title: "Notifications sent",
          description: `${result.success} notifications have been sent successfully${result.failed > 0 ? ` (${result.failed} failed)` : ''}.`,
        });
        
        // Abrir el diálogo de notificaciones
        setIsNotificationsDialogOpen(true);
      } else if (result.total === 0) {
        toast({
          title: "No commercial users configured",
          description: "There are no active commercial users configured in the system.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not send notifications. Please try again later.",
        });
      }
      
    } catch (error) {
      console.error('Error notifying commercial users:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while sending notifications.",
      });
    } finally {
      setIsNotifying(false);
    }
  };
  
  // Function to format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMMM dd, yyyy, HH:mm", { locale: enUS });
    } catch (error) {
      return "Invalid date";
    }
  };
  
  // Function to export classified transactions
  const exportClassifiedTransactions = () => {
    try {
      // Filter only classified transactions (those with a category)
      const classifiedTransactions = transactions.filter(t => t.category);
      
      if (classifiedTransactions.length === 0) {
        toast({
          variant: "destructive",
          title: "No classified transactions",
          description: "There are no classified transactions to export.",
        });
        return;
      }
      
      // Function to format numbers with decimal comma
      const formatNumber = (num: number): string => {
        return num.toFixed(2).replace('.', ',');
      };
      
      // Preparar los datos para la hoja de detalle
      const detailData = classifiedTransactions.map(t => ({
        'Fecha': format(new Date(t.date), "dd/MM/yyyy"),
        'Comercio': t.merchant,
        'Monto': formatNumber(t.amount),
        'Moneda': t.currency,
        'Categoría': t.category || '',
        'Subcategoría': t.subcategory || '',
        'Proyecto': t.project || '',
        'Comentarios': t.comments || '',
        'Asignado a': t.assigned_to || t.assignedTo || '',
        'Comercial': t.commercial || '',
      }));
      
      // Create Excel workbook
      const workbook = XLSX.utils.book_new();
      
      // Add detail sheet
      const detailWorksheet = XLSX.utils.json_to_sheet(detailData);
      XLSX.utils.book_append_sheet(workbook, detailWorksheet, "Detalle Transacciones");
      
      // Preparar datos para la hoja de resumen por categoría
      // Agrupar transacciones por categoría
      const categorySummary: Record<string, { count: number, total: number, transactions: Transaction[] }> = {};
      
      classifiedTransactions.forEach(transaction => {
        const category = transaction.category || 'Sin categoría';
        
        if (!categorySummary[category]) {
          categorySummary[category] = {
            count: 0,
            total: 0,
            transactions: []
          };
        }
        
        categorySummary[category].count += 1;
        categorySummary[category].total += transaction.amount;
        categorySummary[category].transactions.push(transaction);
      });
      
      // Convert summary to Excel format
      const summaryData = Object.entries(categorySummary).map(([category, data]) => ({
        'Categoría': category,
        'Monto Total': formatNumber(data.total),
        'Porcentaje': `${formatNumber((data.total / classifiedTransactions.reduce((sum, t) => sum + t.amount, 0)) * 100)}%`
      }));
      
      // Sort by total amount (highest to lowest)
      summaryData.sort((a, b) => parseFloat(b['Monto Total']) - parseFloat(a['Monto Total']));
      
      // Add summary sheet
      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Resumen por Categoría");
      
      // Create detailed sheets for each category
      Object.entries(categorySummary).forEach(([category, data]) => {
        if (data.transactions.length > 0) {
          const categoryData = data.transactions.map(t => ({
            'Date': format(new Date(t.date), "MM/dd/yyyy"),
            'Merchant': t.merchant,
            'Amount': formatNumber(t.amount),
            'Subcategory': t.subcategory || '',
            'Comments': t.comments || ''
          }));
          
          const categoryWorksheet = XLSX.utils.json_to_sheet(categoryData);
          // Limitar el nombre de la hoja a 31 caracteres (límite de Excel)
          const sheetName = category.length > 28 ? category.substring(0, 28) + '...' : category;
          XLSX.utils.book_append_sheet(workbook, categoryWorksheet, sheetName);
        }
      });
      
      // Generate the file and download it
      const fileName = `Classified_Transactions_${statement?.fileName.replace(/\.[^/.]+$/, "") || 'Statement'}_${format(new Date(), "yyyyMMdd")}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast({
        title: "Export successful",
        description: `${classifiedTransactions.length} classified transactions have been exported with category summary.`,
      });
    } catch (error) {
      console.error("Error exporting transactions:", error);
      toast({
        variant: "destructive",
        title: "Export error",
        description: "An error occurred while exporting transactions.",
      });
    }
  };
  
  // Function to update data after changes
  const refreshData = async () => {
    try {
      setLoading(true);
      
      // Get bank statement from Supabase
      const supabaseBankStatement = await getBankStatementById(statementId);
      
      if (!supabaseBankStatement) {
        setError('Statement not found');
        setLoading(false);
        return;
      }
      
      // Convert bank statement from Supabase to our format
      const bankStatement = convertFromSupabaseBankStatement(supabaseBankStatement);
      setStatement(bankStatement);
      
      // Get transactions from bank statement
      const supabaseTransactions = await getTransactionsByBankStatementId(statementId);
      
      // Convert transactions from Supabase to our format
      const appTransactions = supabaseTransactions.map(tx => {
        // IMPORTANT: Use the original date without any validation or normalization
        // This will preserve the exact format coming from the database
        const originalDate = tx.date;
        
        console.log(`Using original date for transaction ${tx.id}: ${originalDate}`);
        
        // Check if the date appears to be in MM/DD/YYYY format (US format)
        if (originalDate && typeof originalDate === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(originalDate)) {
          console.log(`The date ${originalDate} is in MM/DD/YYYY format (US format).`);
        }
        
        return {
          id: tx.id,
          date: originalDate, // Usar la fecha original sin normalización
          account: tx.account,
          merchant: tx.merchant,
          amount: tx.amount,
          currency: tx.currency,
          // Mapear el estado de Supabase al formato de la aplicación
          status: tx.status === 'pending' ? 'pending' as const : 
                  tx.status === 'approved' ? 'approved' as const : 
                  tx.status === 'rejected' ? 'classified' as const : 'pending' as const,
          assignedTo: tx.assigned_to,
          category: tx.category,
          project: tx.project,
          comments: tx.comments,
          commercial: tx.commercial || tx.assigned_to || 'Unassigned',
          commercial_id: tx.commercial_id || null,
          assigned_to: tx.assigned_to,
          cardNumber: tx.card_number
        };
      });
      
      setTransactions(appTransactions);
      
      // Agrupar transacciones por comercial asignado
      const grouped = appTransactions.reduce<Record<string, Transaction[]>>((acc, transaction) => {
        const commercial = transaction.assignedTo || 'Unassigned';
        if (!acc[commercial]) {
          acc[commercial] = [];
        }
        acc[commercial].push(transaction);
        return acc;
      }, {});
      
      setGroupedTransactions(grouped);
      setError(null);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Error loading statement data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get bank statement details
        const statementData = await getBankStatementById(statementId);
        if (!statementData) {
          throw new Error("Bank statement not found");
        }
        
        const formattedStatement = convertFromSupabaseBankStatement(statementData);
        setStatement(formattedStatement);
        
        // Get transactions associated with the statement
        const supabaseTransactionsData = await getTransactionsByBankStatementId(statementId);
        
        // Convert from SupabaseTransaction to Transaction
        const transactionsData = supabaseTransactionsData.map(tx => {
          // Mapear el estado de Supabase al formato de la aplicación
          let status: 'pending' | 'approved' | 'classified' | 'completed';
          switch (tx.status) {
            case 'approved':
              status = 'approved';
              break;
            case 'rejected':
              status = 'classified'; // Mapear 'rejected' a 'classified'
              break;
            default:
              status = 'pending';
          }
          
          return {
            id: tx.id,
            date: tx.date,
            account: tx.account,
            merchant: tx.merchant,
            amount: tx.amount,
            currency: tx.currency,
            status: status,
            assignedTo: tx.assigned_to,
            category: tx.category,
            project: tx.project,
            comments: tx.comments,
            commercial: tx.commercial || tx.assigned_to || 'Unassigned',
            commercial_id: tx.commercial_id || null,
            assigned_to: tx.assigned_to,
            cardNumber: tx.card_number
          } as Transaction;
        });
        
        setTransactions(transactionsData);
        
        // Agrupar transacciones por comercial
        const grouped = transactionsData.reduce((acc, transaction) => {
          const commercial = transaction.assigned_to || transaction.assignedTo || 'Unassigned';
          if (!acc[commercial]) {
            acc[commercial] = [];
          }
          acc[commercial].push(transaction);
          return acc;
        }, {} as Record<string, Transaction[]>);
        
        setGroupedTransactions(grouped);
        
        // Load commercial users for the dropdown
        await loadCommercialUsers();
      } catch (err: any) {
        console.error("Error al cargar datos:", err);
        setError(err.message || "Error loading data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [statementId]);

  // Function to handle creation of a new transaction
  const handleAddTransaction = async (formData: any) => {
    try {
      // Create transaction in Supabase
      await createTransaction({
        bank_statement_id: statementId,
        date: formData.date,
        account: formData.account,
        merchant: formData.merchant,
        amount: formData.amount,
        currency: formData.currency,
        status: 'pending',
        assigned_to: formData.assignedTo,
        category: formData.category,
        project: formData.project,
        comments: formData.comments
      });
      
      // Close the dialog
      setIsAddDialogOpen(false);
      
      // Show notification
      toast({
        title: "Transaction added",
        description: "The transaction has been added successfully.",
      });
      
      // Update data
      refreshData();
    } catch (err) {
      console.error('Error adding transaction:', err);
      toast({
        title: "Error",
        description: "Could not add the transaction.",
        variant: "destructive",
      });
    }
  };

  // Function to handle editing a transaction
  const handleEditTransaction = async (formData: any) => {
    if (!selectedTransaction) return;
    
    try {
      // Update transaction in Supabase
      await updateTransaction(selectedTransaction.id, {
        date: formData.date,
        account: formData.account,
        merchant: formData.merchant,
        amount: formData.amount,
        currency: formData.currency,
        // Convert status from our format to Supabase format
        status: selectedTransaction.status === 'pending' ? 'pending' : 
                selectedTransaction.status === 'approved' ? 'approved' : 'rejected',
        assigned_to: formData.assignedTo,
        category: formData.category,
        project: formData.project,
        comments: formData.comments
      });
      
      // Close the dialog
      setIsEditDialogOpen(false);
      setSelectedTransaction(null);
      
      // Show notification
      toast({
        title: "Transaction updated",
        description: "The transaction has been updated successfully.",
      });
      
      // Update data
      refreshData();
    } catch (err) {
      console.error('Error updating transaction:', err);
      toast({
        title: "Error",
        description: "Could not update the transaction.",
        variant: "destructive",
      });
    }
  };

  // Function to handle assigning a commercial user to a transaction
  const handleAssignCommercial = async (transactionId: string, userId: string | null, userName: string | null) => {
    try {
      // Update transaction with assigned commercial user
      const updatedTransaction = await assignCommercialToTransaction(transactionId, userId, userName);
      
      if (!updatedTransaction) {
        throw new Error('Could not assign commercial user to the transaction');
      }
      
      // Update local state
      await refreshData();
      
      toast({
        title: "Commercial user assigned",
        description: userName 
          ? `The transaction has been assigned to ${userName}` 
          : "The transaction has been unassigned",
      });
    } catch (error) {
      console.error('Error assigning commercial user:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not assign commercial user to the transaction.",
      });
    }
  };
  
  // Function to handle bulk assignment of a commercial user to multiple transactions
  const handleBulkAssignCommercial = async (transactionIds: string[], userId: string | null, userName: string | null) => {
    try {
      if (transactionIds.length === 0) {
        toast({
          variant: "default",
          title: "Information",
          description: "There are no transactions to assign in this group.",
        });
        return;
      }
      
      setLoading(true);
      console.log(`Attempting to assign ${transactionIds.length} transactions to ${userName || 'Unassigned'}`);
      
      const updatedCount = await assignCommercialToMultipleTransactions(transactionIds, userId, userName);
      
      if (updatedCount === 0) {
        toast({
          variant: "destructive",
          title: "Warning",
          description: "Could not assign any transactions. Try with fewer transactions or contact the administrator.",
        });
      } else if (updatedCount < transactionIds.length) {
        toast({
          variant: "default",
          title: "Partial assignment",
          description: `${updatedCount} of ${transactionIds.length} transactions were assigned to ${userName || 'Unassigned'}. Some transactions could not be updated.`,
        });
      } else {
        toast({
          title: "Success",
          description: `${updatedCount} transactions assigned to ${userName || 'Unassigned'}.`,
        });
      }
      
      // Refrescar los datos para mostrar los cambios
      await refreshData();
    } catch (error) {
      console.error('Error al asignar usuario comercial masivamente:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error al asignar las transacciones. Por favor, intente nuevamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to handle deleting a transaction
  const handleDeleteTransaction = async () => {
    if (!selectedTransaction) return;
    
    try {
      // Delete transaction from Supabase
      await deleteTransaction(selectedTransaction.id);
      
      // Close the dialog
      setIsDeleteDialogOpen(false);
      setSelectedTransaction(null);
      
      // Show notification
      toast({
        title: "Transaction deleted",
        description: "The transaction has been successfully deleted.",
      });
      
      // Update data
      refreshData();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      toast({
        title: "Error",
        description: "Could not delete the transaction.",
        variant: "destructive",
      });
    }
  };

  // Function to open the edit dialog
  const openEditDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsEditDialogOpen(true);
  };

  // Function to open the delete dialog
  const openDeleteDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDeleteDialogOpen(true);
  };

  useEffect(() => {
    refreshData();
  }, [statementId]);
  
  // Load notifications when dialog opens
  useEffect(() => {
    if (isNotificationsDialogOpen && statement) {
      loadNotifications();
    }
  }, [isNotificationsDialogOpen, statement]);
  
  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center py-8 text-gray-500">
            <Loader2 className="mx-auto h-12 w-12 text-gray-400 mb-3 animate-spin" />
            <p>Cargando datos del extracto...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error || !statement) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center py-8 text-gray-500">
            <p className="text-red-500">{error || 'Extracto no encontrado'}</p>
            <Button onClick={onBack} variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              className="flex items-center gap-1 mr-2"
              onClick={handleNotifyCommercials}
              disabled={isNotifying || transactions.length === 0}
            >
              {isNotifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Notify Card Holders Users
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={exportClassifiedTransactions}
            >
              <Download className="h-4 w-4" />
              Export Classified
            </Button>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Statement Details: {statement.fileName}</CardTitle>
            <CardDescription>
              Period: {statement.period} | Uploaded: {format(new Date(statement.uploadDate), "MM/dd/yyyy")}
            </CardDescription>
          </div>
          {/* El botón de exportación se ha unificado en la parte superior */}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Total transactions</p>
            <p className="text-2xl font-bold">{statement.transactionCount}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Detected accounts</p>
            <p className="text-2xl font-bold">{statement.accounts.length}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-purple-600 font-medium">Total amount</p>
            <p className="text-2xl font-bold">
              {new Intl.NumberFormat('en-US', { 
                style: 'currency', 
                currency: 'USD' 
              }).format(transactions.reduce((sum, tx) => sum + tx.amount, 0))}
            </p>
          </div>
        </div>
        
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No transactions available for this statement</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Mostrar transacciones agrupadas por comercial (ordenadas alfabéticamente) */}
            {Object.entries(groupedTransactions)
              .sort(([commercialA], [commercialB]) => commercialA.localeCompare(commercialB))
              .map(([commercial, commercialTransactions]) => (
              <div key={commercial} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 p-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">{commercial}</h3>
                    <p className="text-sm text-gray-500">{commercialTransactions.length} transactions</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Desplegable para asignación masiva */}
                    <div className="w-48">
                      <Select
                        defaultValue={commercial !== 'Unassigned' ? commercialUsers.find(u => u.name === commercial)?.id || "unassigned" : "unassigned"}
                        onValueChange={(value) => {
                          const selectedUser = value === "unassigned" 
                            ? { id: null, name: null } 
                            : commercialUsers.find(user => user.id === value);
                          
                          // Get IDs of all transactions in this group
                          const transactionIds = commercialTransactions.map(tx => tx.id);
                          
                          // Call the bulk assignment function
                          handleBulkAssignCommercial(
                            transactionIds,
                            selectedUser?.id || null,
                            selectedUser?.name || null
                          );
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Assign to" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {commercialUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTransaction(null);
                        // Preseleccionar el comercial al abrir el formulario
                        setSelectedCommercial(commercial === 'Unassigned' ? '' : commercial);
                        setIsAddDialogOpen(true);
                      }}
                      className="flex items-center gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Total</p>
                      <p className={`font-semibold ${commercialTransactions.reduce((sum, tx) => sum + tx.amount, 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {new Intl.NumberFormat('en-US', { 
                          style: 'currency', 
                          currency: 'USD' 
                        }).format(commercialTransactions.reduce((sum, tx) => sum + tx.amount, 0))}
                      </p>
                    </div>
                  </div>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commercialTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {(() => {
                            try {
                              const dateObj = new Date(transaction.date);
                              if (!isNaN(dateObj.getTime())) {
                                return format(dateObj, "MM/dd/yyyy");
                              } else {
                                console.warn(`Invalid date when formatting: ${transaction.date}`);
                                return "Invalid date";
                              }
                            } catch (error) {
                              console.error(`Error formatting date: ${transaction.date}`, error);
                              return "Date error";
                            }
                          })()}
                        </TableCell>
                        <TableCell>
                          <span className="inline-block bg-gray-100 rounded-full px-2 py-1 text-xs">
                            *{transaction.account}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{transaction.merchant}</TableCell>
                        <TableCell className={`text-right font-mono ${transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {new Intl.NumberFormat('en-US', { 
                            style: 'currency', 
                            currency: transaction.currency || 'USD' 
                          }).format(transaction.amount)}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            transaction.status === "classified" 
                              ? "bg-green-100 text-green-800" 
                              : transaction.status === "approved"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {transaction.status === "classified" 
                              ? "Classified" 
                              : transaction.status === "approved"
                              ? "Approved"
                              : "Pending"}
                          </span>
                        </TableCell>

                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="h-4 w-4"
                                >
                                  <circle cx="12" cy="12" r="1" />
                                  <circle cx="12" cy="5" r="1" />
                                  <circle cx="12" cy="19" r="1" />
                                </svg>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(transaction)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDeleteDialog(transaction)} className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Dialogs for adding, editing and deleting transactions */}
      {statement && (
        <>
          {/* Dialog to add transaction */}
          <TransactionForm
            isOpen={isAddDialogOpen}
            onClose={() => {
              setIsAddDialogOpen(false);
              setSelectedCommercial("");
            }}
            onSubmit={handleAddTransaction}
            title="Add transaction"
            bankStatementId={statementId}
            preselectedCommercial={selectedCommercial}
          />

          {/* Dialog to edit transaction */}
          {selectedTransaction && (
            <TransactionForm
              isOpen={isEditDialogOpen}
              onClose={() => {
                setIsEditDialogOpen(false);
                setSelectedTransaction(null);
              }}
              onSubmit={handleEditTransaction}
              initialData={selectedTransaction}
              title="Edit transaction"
              bankStatementId={statementId}
            />
          )}

          {/* Dialog to confirm deletion */}
          <DeleteConfirmationDialog
            isOpen={isDeleteDialogOpen}
            onClose={() => {
              setIsDeleteDialogOpen(false);
              setSelectedTransaction(null);
            }}
            onConfirm={handleDeleteTransaction}
            title="Delete transaction"
            description="Are you sure you want to delete this transaction? This action cannot be undone."
          />
          
          {/* Diálogo para ver notificaciones enviadas */}
          <Dialog open={isNotificationsDialogOpen} onOpenChange={setIsNotificationsDialogOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Commercial User Notifications</DialogTitle>
                <DialogDescription>
                  Notification history for statement {statement.period}
                </DialogDescription>
              </DialogHeader>
              
              {loadingNotifications ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : notifications.length > 0 ? (
                <div className="max-h-[60vh] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Commercial User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Sent Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notifications.map((notification) => (
                        <TableRow key={notification.id}>
                          <TableCell className="font-medium">
                            {notification.commercial?.name || 'Unknown'}
                          </TableCell>
                          <TableCell>{notification.commercial?.email || '-'}</TableCell>
                          <TableCell>{formatDate(notification.sent_at)}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {notification.status === true ? (
                                <Badge variant="outline" className="bg-green-100 text-green-800 flex items-center">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Sent
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-100 text-red-800 flex items-center">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Error
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No notifications sent for this statement
                </div>
              )}
              
              <DialogFooter>
                <Button onClick={() => setIsNotificationsDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </Card>
  );
};

export default StatementTransactionsView;
