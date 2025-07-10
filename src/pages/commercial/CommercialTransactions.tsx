
import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Transaction } from "@/types";
import TransactionTable from "@/components/transactions/TransactionTable";
import ClassificationProgress from "@/components/transactions/ClassificationProgress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";

const CommercialTransactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Función para obtener transacciones del comercial desde Supabase
  const fetchTransactions = async () => {
    if (!user || !user.name) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Obtener transacciones asignadas al comercial por su nombre
      // Ahora buscamos tanto en assigned_to como en el nuevo campo commercial
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .or(`assigned_to.eq.${user.name},commercial.eq.${user.name}`)
        .order('date', { ascending: false });
        
      console.log('Buscando transacciones para comercial:', user.name);
      
      if (error) {
        console.error('Error al obtener transacciones:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar las transacciones"
        });
        return;
      }
      
      // Formatear las transacciones al formato esperado por el componente
      const formattedTransactions: Transaction[] = data.map(t => {
        console.log('Transacción encontrada:', t);
        return {
          id: t.id,
          date: t.date,
          description: t.description,
          amount: t.amount,
          currency: t.currency || 'USD', // Cambiado a USD como predeterminado
          category: t.category || '',
          subcategory: t.subcategory || '',
          comments: t.comments || '',
          status: t.status || 'pending',
          assignedTo: t.assigned_to || '',
          account: t.account || '',
          merchant: t.merchant || '',
          commercial: t.commercial || '', // Incluir el campo commercial
          cardNumber: t.card_number || '' // Incluir el campo cardNumber
        };
      });
      
      // Usar todas las transacciones sin filtrar por mes
      setTransactions(formattedTransactions);
    } catch (err) {
      console.error('Error inesperado:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error al procesar las transacciones"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user]);

  const refreshTransactions = () => {
    fetchTransactions();
  };

  // Calculate statistics
  const stats = {
    total: transactions.length,
    classified: transactions.filter(t => t.status === "classified").length,
    pending: transactions.filter(t => t.status === "pending").length,
    percentComplete: transactions.length > 0 
      ? (transactions.filter(t => t.status === "classified").length / transactions.length) * 100
      : 0
  };

  if (loading) {
    return (
      <AppLayout requireRole="commercial">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <p>Cargando transacciones...</p>
        </div>
      </AppLayout>
    );
  }

  // No necesitamos formatear el mes ya que mostraremos todas las transacciones

  return (
    <AppLayout requireRole="commercial">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Clasificación de Transacciones</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Mis Transacciones Pendientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ClassificationProgress stats={stats} />
            
            {transactions.length > 0 ? (
              <TransactionTable 
                transactions={transactions} 
                onTransactionUpdate={refreshTransactions} 
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No hay transacciones disponibles para este período.</p>
                <p className="text-gray-500 mt-2">Si cree que esto es un error, contacte con el departamento financiero.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default CommercialTransactions;
