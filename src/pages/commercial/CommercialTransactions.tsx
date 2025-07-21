
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

  // Function to get transactions for the commercial user from Supabase
  const fetchTransactions = async () => {
    if (!user || !user.name) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get pending transactions assigned to the commercial user by name
      // We search in both assigned_to and commercial fields and filter by status=pending
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .or(`assigned_to.eq.${user.name},commercial.eq.${user.name}`)
        .eq('status', 'pending') // Solo transacciones pendientes
        .order('date', { ascending: false });
        
      console.log('Searching transactions for commercial user:', user.name);
      
      if (error) {
        console.error('Error retrieving transactions:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load transactions"
        });
        return;
      }
      
      // Format transactions to the expected format for the component
      const formattedTransactions: Transaction[] = data.map(t => {
        console.log('Transaction found:', t);
        return {
          id: t.id,
          date: t.date,
          description: t.description,
          amount: t.amount,
          currency: t.currency || 'USD', // Changed to USD as default
          category: t.category || '',
          subcategory: t.subcategory || '',
          comments: t.comments || '',
          status: t.status || 'pending',
          assignedTo: t.assigned_to || '',
          account: t.account || '',
          merchant: t.merchant || '',
          commercial: t.commercial || '', // Include commercial field
          cardNumber: t.card_number || '' // Include cardNumber field
        };
      });
      
      // Use all transactions without filtering by month
      setTransactions(formattedTransactions);
    } catch (err) {
      console.error('Unexpected error:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while processing transactions"
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
          <p>Loading transactions...</p>
        </div>
      </AppLayout>
    );
  }

  // No necesitamos formatear el mes ya que mostraremos todas las transacciones

  return (
    <AppLayout requireRole="commercial">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Transaction Classification</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>My Pending Transactions to Classify</CardTitle>
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
                <p className="text-gray-500">There are no pending transactions to classify assigned to your account.</p>
                <p className="text-gray-500 mt-2">If you believe this is an error, please contact the finance department.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default CommercialTransactions;
