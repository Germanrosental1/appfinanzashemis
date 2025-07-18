import React, { useEffect, useState } from "react";
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2, Plus, Pencil, Trash2, Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { BankStatement, Transaction } from "@/types";
import { format } from "date-fns";
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
  
  // Estados para los diálogos
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

  // Función para cargar usuarios comerciales
  const loadCommercialUsers = async () => {
    try {
      console.log('Iniciando carga de usuarios comerciales...');
      setLoadingCommercialUsers(true);
      const users = await getCommercialUsersForDropdown();
      console.log('Usuarios comerciales obtenidos:', users);
      if (users && users.length > 0) {
        console.log(`Se encontraron ${users.length} usuarios comerciales`);
        setCommercialUsers(users);
      } else {
        console.warn('No se encontraron usuarios comerciales');
        // Intentar cargar usuarios comerciales de nuevo después de un breve retraso
        setTimeout(async () => {
          console.log('Reintentando cargar usuarios comerciales...');
          const retryUsers = await getCommercialUsersForDropdown();
          console.log('Resultado del reintento:', retryUsers);
          setCommercialUsers(retryUsers || []);
        }, 2000);
      }
    } catch (error) {
      console.error('Error al cargar usuarios comerciales:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los usuarios comerciales.",
      });
    } finally {
      setLoadingCommercialUsers(false);
    }
  };

  // Función para cargar notificaciones previas
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

  // Función para generar tokens temporales y enviar notificaciones a comerciales
  const handleNotifyCommercials = async () => {
    if (!statement) return;
    
    try {
      setIsNotifying(true);
      
      // Notificar a todos los comerciales activos
      const result = await notifyAllCommercials(statement);
      
      // Recargar las notificaciones
      await loadNotifications();
      
      // Mostrar resultado al usuario
      if (result.success > 0) {
        toast({
          title: "Notificaciones enviadas",
          description: `Se han enviado ${result.success} notificaciones correctamente${result.failed > 0 ? ` (${result.failed} fallidas)` : ''}.`,
        });
        
        // Abrir el diálogo de notificaciones
        setIsNotificationsDialogOpen(true);
      } else if (result.total === 0) {
        toast({
          title: "Sin comerciales configurados",
          description: "No hay comerciales activos configurados en el sistema.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron enviar las notificaciones. Intenta de nuevo más tarde.",
        });
      }
      
    } catch (error) {
      console.error('Error al notificar a comerciales:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error al enviar las notificaciones.",
      });
    } finally {
      setIsNotifying(false);
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
  
  // Función para exportar transacciones clasificadas
  const exportClassifiedTransactions = () => {
    try {
      // Filtrar solo las transacciones clasificadas (que tienen categoría)
      const classifiedTransactions = transactions.filter(t => t.category);
      
      if (classifiedTransactions.length === 0) {
        toast({
          variant: "destructive",
          title: "No hay transacciones clasificadas",
          description: "No hay transacciones clasificadas para exportar.",
        });
        return;
      }
      
      // Función para formatear números con coma decimal
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
      
      // Crear el libro de Excel
      const workbook = XLSX.utils.book_new();
      
      // Agregar la hoja de detalle
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
      
      // Convertir el resumen a un formato para Excel
      const summaryData = Object.entries(categorySummary).map(([category, data]) => ({
        'Categoría': category,
        'Monto Total': formatNumber(data.total),
        'Porcentaje': `${formatNumber((data.total / classifiedTransactions.reduce((sum, t) => sum + t.amount, 0)) * 100)}%`
      }));
      
      // Ordenar por monto total (de mayor a menor)
      summaryData.sort((a, b) => parseFloat(b['Monto Total']) - parseFloat(a['Monto Total']));
      
      // Agregar la hoja de resumen
      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Resumen por Categoría");
      
      // Crear hojas detalladas por cada categoría
      Object.entries(categorySummary).forEach(([category, data]) => {
        if (data.transactions.length > 0) {
          const categoryData = data.transactions.map(t => ({
            'Fecha': format(new Date(t.date), "dd/MM/yyyy"),
            'Comercio': t.merchant,
            'Monto': formatNumber(t.amount),
            'Subcategoría': t.subcategory || '',
            'Comentarios': t.comments || ''
          }));
          
          const categoryWorksheet = XLSX.utils.json_to_sheet(categoryData);
          // Limitar el nombre de la hoja a 31 caracteres (límite de Excel)
          const sheetName = category.length > 28 ? category.substring(0, 28) + '...' : category;
          XLSX.utils.book_append_sheet(workbook, categoryWorksheet, sheetName);
        }
      });
      
      // Generar el archivo y descargarlo
      const fileName = `Transacciones_Clasificadas_${statement?.fileName.replace(/\.[^/.]+$/, "") || 'Extracto'}_${format(new Date(), "yyyyMMdd")}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast({
        title: "Exportación exitosa",
        description: `Se han exportado ${classifiedTransactions.length} transacciones clasificadas con resumen por categoría.`,
      });
    } catch (error) {
      console.error("Error al exportar transacciones:", error);
      toast({
        variant: "destructive",
        title: "Error al exportar",
        description: "Ocurrió un error al exportar las transacciones.",
      });
    }
  };
  
  // Función para actualizar los datos después de cambios
  const refreshData = async () => {
    try {
      setLoading(true);
      
      // Obtener el extracto bancario de Supabase
      const supabaseBankStatement = await getBankStatementById(statementId);
      
      if (!supabaseBankStatement) {
        setError('Extracto no encontrado');
        setLoading(false);
        return;
      }
      
      // Convertir el extracto bancario de Supabase a nuestro formato
      const bankStatement = convertFromSupabaseBankStatement(supabaseBankStatement);
      setStatement(bankStatement);
      
      // Obtener las transacciones del extracto bancario
      const supabaseTransactions = await getTransactionsByBankStatementId(statementId);
      
      // Convertir las transacciones de Supabase a nuestro formato
      const appTransactions = supabaseTransactions.map(tx => {
        // IMPORTANTE: Usar la fecha original sin ninguna validación ni normalización
        // Esto preservará el formato exacto que viene de la base de datos
        const originalDate = tx.date;
        
        console.log(`Usando fecha original para transacción ${tx.id}: ${originalDate}`);
        
        // Verificar si la fecha parece estar en formato MM/DD/YYYY (formato estadounidense)
        if (originalDate && typeof originalDate === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(originalDate)) {
          console.log(`La fecha ${originalDate} está en formato MM/DD/YYYY (formato estadounidense).`);
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
          commercial: tx.commercial || tx.assigned_to || 'Sin asignar',
          commercial_id: tx.commercial_id || null,
          assigned_to: tx.assigned_to,
          cardNumber: tx.card_number
        };
      });
      
      setTransactions(appTransactions);
      
      // Agrupar transacciones por comercial asignado
      const grouped = appTransactions.reduce<Record<string, Transaction[]>>((acc, transaction) => {
        const commercial = transaction.assignedTo || 'Sin asignar';
        if (!acc[commercial]) {
          acc[commercial] = [];
        }
        acc[commercial].push(transaction);
        return acc;
      }, {});
      
      setGroupedTransactions(grouped);
      setError(null);
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar los datos del extracto');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Obtener detalles del extracto bancario
        const statementData = await getBankStatementById(statementId);
        if (!statementData) {
          throw new Error("No se encontró el extracto bancario");
        }
        
        const formattedStatement = convertFromSupabaseBankStatement(statementData);
        setStatement(formattedStatement);
        
        // Obtener transacciones asociadas al extracto
        const supabaseTransactionsData = await getTransactionsByBankStatementId(statementId);
        
        // Convertir de SupabaseTransaction a Transaction
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
            commercial: tx.commercial || tx.assigned_to || 'Sin asignar',
            commercial_id: tx.commercial_id || null,
            assigned_to: tx.assigned_to,
            cardNumber: tx.card_number
          } as Transaction;
        });
        
        setTransactions(transactionsData);
        
        // Agrupar transacciones por comercial
        const grouped = transactionsData.reduce((acc, transaction) => {
          const commercial = transaction.assigned_to || transaction.assignedTo || 'Sin asignar';
          if (!acc[commercial]) {
            acc[commercial] = [];
          }
          acc[commercial].push(transaction);
          return acc;
        }, {} as Record<string, Transaction[]>);
        
        setGroupedTransactions(grouped);
        
        // Cargar usuarios comerciales para el desplegable
        await loadCommercialUsers();
      } catch (err: any) {
        console.error("Error al cargar datos:", err);
        setError(err.message || "Error al cargar los datos");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [statementId]);

  // Función para manejar la creación de una nueva transacción
  const handleAddTransaction = async (formData: any) => {
    try {
      // Crear la transacción en Supabase
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
      
      // Cerrar el diálogo
      setIsAddDialogOpen(false);
      
      // Mostrar notificación
      toast({
        title: "Transacción agregada",
        description: "La transacción ha sido agregada correctamente.",
      });
      
      // Actualizar datos
      refreshData();
    } catch (err) {
      console.error('Error al agregar transacción:', err);
      toast({
        title: "Error",
        description: "No se pudo agregar la transacción.",
        variant: "destructive",
      });
    }
  };

  // Función para manejar la edición de una transacción
  const handleEditTransaction = async (formData: any) => {
    if (!selectedTransaction) return;
    
    try {
      // Actualizar la transacción en Supabase
      await updateTransaction(selectedTransaction.id, {
        date: formData.date,
        account: formData.account,
        merchant: formData.merchant,
        amount: formData.amount,
        currency: formData.currency,
        // Convertir el status de nuestro formato al formato de Supabase
        status: selectedTransaction.status === 'pending' ? 'pending' : 
                selectedTransaction.status === 'approved' ? 'approved' : 'rejected',
        assigned_to: formData.assignedTo,
        category: formData.category,
        project: formData.project,
        comments: formData.comments
      });
      
      // Cerrar el diálogo
      setIsEditDialogOpen(false);
      setSelectedTransaction(null);
      
      // Mostrar notificación
      toast({
        title: "Transacción actualizada",
        description: "La transacción ha sido actualizada correctamente.",
      });
      
      // Actualizar datos
      refreshData();
    } catch (err) {
      console.error('Error al actualizar transacción:', err);
      toast({
        title: "Error",
        description: "No se pudo actualizar la transacción.",
        variant: "destructive",
      });
    }
  };

  // Función para manejar la asignación de un usuario comercial a una transacción
  const handleAssignCommercial = async (transactionId: string, userId: string | null, userName: string | null) => {
    try {
      // Actualizar la transacción con el usuario comercial asignado
      const updatedTransaction = await assignCommercialToTransaction(transactionId, userId, userName);
      
      if (!updatedTransaction) {
        throw new Error('No se pudo asignar el usuario comercial a la transacción');
      }
      
      // Actualizar el estado local
      await refreshData();
      
      toast({
        title: "Usuario comercial asignado",
        description: userName 
          ? `La transacción ha sido asignada a ${userName}` 
          : "La transacción ha sido desasignada",
      });
    } catch (error) {
      console.error('Error al asignar usuario comercial:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo asignar el usuario comercial a la transacción.",
      });
    }
  };
  
  // Función para manejar la asignación masiva de un usuario comercial a múltiples transacciones
  const handleBulkAssignCommercial = async (transactionIds: string[], userId: string | null, userName: string | null) => {
    try {
      if (transactionIds.length === 0) {
        toast({
          variant: "default",
          title: "Información",
          description: "No hay transacciones para asignar en este grupo.",
        });
        return;
      }
      
      setLoading(true);
      console.log(`Intentando asignar ${transactionIds.length} transacciones a ${userName || 'Sin asignar'}`);
      
      const updatedCount = await assignCommercialToMultipleTransactions(transactionIds, userId, userName);
      
      if (updatedCount === 0) {
        toast({
          variant: "destructive",
          title: "Advertencia",
          description: "No se pudo asignar ninguna transacción. Intente con menos transacciones o contacte al administrador.",
        });
      } else if (updatedCount < transactionIds.length) {
        toast({
          variant: "default",
          title: "Asignación parcial",
          description: `Se asignaron ${updatedCount} de ${transactionIds.length} transacciones a ${userName || 'Sin asignar'}. Algunas transacciones no pudieron ser actualizadas.`,
        });
      } else {
        toast({
          title: "Éxito",
          description: `Se asignaron ${updatedCount} transacciones a ${userName || 'Sin asignar'}.`,
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

  // Función para manejar la eliminación de una transacción
  const handleDeleteTransaction = async () => {
    if (!selectedTransaction) return;
    
    try {
      // Eliminar la transacción de Supabase
      await deleteTransaction(selectedTransaction.id);
      
      // Cerrar el diálogo
      setIsDeleteDialogOpen(false);
      setSelectedTransaction(null);
      
      // Mostrar notificación
      toast({
        title: "Transacción eliminada",
        description: "La transacción ha sido eliminada correctamente.",
      });
      
      // Actualizar datos
      refreshData();
    } catch (err) {
      console.error('Error al eliminar transacción:', err);
      toast({
        title: "Error",
        description: "No se pudo eliminar la transacción.",
        variant: "destructive",
      });
    }
  };

  // Función para abrir el diálogo de edición
  const openEditDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsEditDialogOpen(true);
  };

  // Función para abrir el diálogo de eliminación
  const openDeleteDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDeleteDialogOpen(true);
  };

  useEffect(() => {
    refreshData();
  }, [statementId]);
  
  // Cargar notificaciones cuando se abre el diálogo
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
                  Notificar a comerciales
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
              Exportar Clasificadas
            </Button>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Detalle del Extracto: {statement.fileName}</CardTitle>
            <CardDescription>
              Período: {statement.period} | Cargado: {format(new Date(statement.uploadDate), "dd/MM/yyyy")}
            </CardDescription>
          </div>
          {/* El botón de exportación se ha unificado en la parte superior */}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Total de transacciones</p>
            <p className="text-2xl font-bold">{statement.transactionCount}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Cuentas detectadas</p>
            <p className="text-2xl font-bold">{statement.accounts.length}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-purple-600 font-medium">Importe total</p>
            <p className="text-2xl font-bold">
              {new Intl.NumberFormat('es-ES', { 
                style: 'currency', 
                currency: 'USD' 
              }).format(transactions.reduce((sum, tx) => sum + tx.amount, 0))}
            </p>
          </div>
        </div>
        
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No hay transacciones disponibles para este extracto</p>
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
                    <p className="text-sm text-gray-500">{commercialTransactions.length} transacciones</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Desplegable para asignación masiva */}
                    <div className="w-48">
                      <Select
                        defaultValue={commercial !== 'Sin asignar' ? commercialUsers.find(u => u.name === commercial)?.id || "unassigned" : "unassigned"}
                        onValueChange={(value) => {
                          const selectedUser = value === "unassigned" 
                            ? { id: null, name: null } 
                            : commercialUsers.find(user => user.id === value);
                          
                          // Obtener los IDs de todas las transacciones de este grupo
                          const transactionIds = commercialTransactions.map(tx => tx.id);
                          
                          // Llamar a la función de asignación masiva
                          handleBulkAssignCommercial(
                            transactionIds,
                            selectedUser?.id || null,
                            selectedUser?.name || null
                          );
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Asignar a" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Sin asignar</SelectItem>
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
                        setSelectedCommercial(commercial === 'Sin asignar' ? '' : commercial);
                        setIsAddDialogOpen(true);
                      }}
                      className="flex items-center gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar
                    </Button>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Total</p>
                      <p className={`font-semibold ${commercialTransactions.reduce((sum, tx) => sum + tx.amount, 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {new Intl.NumberFormat('es-ES', { 
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
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cuenta</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Importe</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
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
                                return format(dateObj, "dd/MM/yyyy");
                              } else {
                                console.warn(`Fecha inválida al formatear: ${transaction.date}`);
                                return "Fecha inválida";
                              }
                            } catch (error) {
                              console.error(`Error al formatear fecha: ${transaction.date}`, error);
                              return "Error de fecha";
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
                          {new Intl.NumberFormat('es-ES', { 
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
                              ? "Clasificado" 
                              : transaction.status === "approved"
                              ? "Aprobado"
                              : "Pendiente"}
                          </span>
                        </TableCell>

                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menú</span>
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
                                <span>Editar</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDeleteDialog(transaction)} className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Eliminar</span>
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

      {/* Diálogos para agregar, editar y eliminar transacciones */}
      {statement && (
        <>
          {/* Diálogo para agregar transacción */}
          <TransactionForm
            isOpen={isAddDialogOpen}
            onClose={() => {
              setIsAddDialogOpen(false);
              setSelectedCommercial("");
            }}
            onSubmit={handleAddTransaction}
            title="Agregar transacción"
            bankStatementId={statementId}
            preselectedCommercial={selectedCommercial}
          />

          {/* Diálogo para editar transacción */}
          {selectedTransaction && (
            <TransactionForm
              isOpen={isEditDialogOpen}
              onClose={() => {
                setIsEditDialogOpen(false);
                setSelectedTransaction(null);
              }}
              onSubmit={handleEditTransaction}
              initialData={selectedTransaction}
              title="Editar transacción"
              bankStatementId={statementId}
            />
          )}

          {/* Diálogo para confirmar eliminación */}
          <DeleteConfirmationDialog
            isOpen={isDeleteDialogOpen}
            onClose={() => {
              setIsDeleteDialogOpen(false);
              setSelectedTransaction(null);
            }}
            onConfirm={handleDeleteTransaction}
            title="Eliminar transacción"
            description="¿Estás seguro de que deseas eliminar esta transacción? Esta acción no se puede deshacer."
          />
          
          {/* Diálogo para ver notificaciones enviadas */}
          <Dialog open={isNotificationsDialogOpen} onOpenChange={setIsNotificationsDialogOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Notificaciones a Comerciales</DialogTitle>
                <DialogDescription>
                  Historial de notificaciones enviadas para el extracto {statement.period}
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
                        <TableHead>Comercial</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Fecha de envío</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notifications.map((notification) => (
                        <TableRow key={notification.id}>
                          <TableCell className="font-medium">
                            {notification.commercial?.name || 'Desconocido'}
                          </TableCell>
                          <TableCell>{notification.commercial?.email || '-'}</TableCell>
                          <TableCell>{formatDate(notification.sent_at)}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {notification.status === true ? (
                                <Badge variant="outline" className="bg-green-100 text-green-800 flex items-center">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Enviado
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
                  No hay notificaciones enviadas para este extracto
                </div>
              )}
              
              <DialogFooter>
                <Button onClick={() => setIsNotificationsDialogOpen(false)}>
                  Cerrar
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
