
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { Transaction } from "@/types";
import { getTransactionsByAccount } from "@/lib/mockData";
import TransactionTable from "@/components/transactions/TransactionTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

const AccountDetail = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accountId) {
      const accountTransactions = getTransactionsByAccount(accountId);
      setTransactions(accountTransactions.filter(t => t.date.startsWith('2025-03'))); // Only March 2025
      setLoading(false);
    }
  }, [accountId]);

  const refreshTransactions = () => {
    if (accountId) {
      const accountTransactions = getTransactionsByAccount(accountId);
      setTransactions(accountTransactions.filter(t => t.date.startsWith('2025-03')));
    }
  };

  if (loading) {
    return (
      <AppLayout requireRole="finance">
        <div className="flex items-center justify-center h-64">
          <p>Cargando transacciones...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout requireRole="finance">
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/finance/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <h1 className="text-2xl font-semibold">Detalle de Cuenta: **** {accountId}</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Transacciones de Marzo 2025</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionTable 
              transactions={transactions} 
              onTransactionUpdate={refreshTransactions} 
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AccountDetail;
