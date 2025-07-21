
import React, { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Transaction } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TransactionTableProps {
  transactions: Transaction[];
  onTransactionUpdate?: () => void;
}

// Specific categories for classification (alphabetically ordered)
const categories = [
  { id: "auto_expenses", name: "Auto expenses" },
  { id: "auto_expenses_truckers", name: "Auto expenses truckers" },
  { id: "chicago_show", name: "Chicago Show" },
  { id: "delivery_freight", name: "Delivery and freight" },
  { id: "donations", name: "Donations" },
  { id: "it", name: "IT" },
  { id: "marketing", name: "Marketing" },
  { id: "meals", name: "Meals" },
  { id: "office_expenses", name: "Office expenses" },
  { id: "operating_expense", name: "Operating expense" },
  { id: "others", name: "Others" },
  { id: "samples", name: "Samples" },
  { id: "telephone_expense", name: "Telephone expense" },
  { id: "tolls_parking", name: "Tolls & parking" },
  { id: "tolls_truck", name: "Tolls truck" },
  { id: "administrative_travel_expenses", name: "Administrative travel expenses" },
  { id: "operating_travel_expenses", name: "Operating travel expenses" },
  { id: "warehouse_expense", name: "Warehouse expense" }
];

// We no longer need projects

const TransactionTable = ({ transactions, onTransactionUpdate }: TransactionTableProps) => {
  const [editedTransactions, setEditedTransactions] = useState<Record<string, Partial<Transaction>>>({});
  const { toast } = useToast();

  const handleChange = (transactionId: string, field: keyof Transaction, value: any) => {
    setEditedTransactions(prev => ({
      ...prev,
      [transactionId]: {
        ...prev[transactionId],
        [field]: value,
        // Update status to 'approved' when any field is modified
        status: "approved"
      }
    }));
  };

  const handleSaveAll = async () => {
    try {
      // Crear un array de promesas para actualizar cada transacción en Supabase
      const updatedPromises = Object.entries(editedTransactions).map(async ([id, updates]) => {
        // Update category, comments and change status to 'approved'
        const { error } = await supabase
          .from('transactions')
          .update({
            category: updates.category,
            comments: updates.comments,
            status: 'approved' // Probamos con 'approved' en lugar de 'classified'
          })
          .eq('id', id);
          
        if (error) throw error;
        return id;
      });
      
      // Esperar a que todas las actualizaciones se completen
      await Promise.all(updatedPromises);
      
      toast({
        title: "Classifications saved",
        description: `${Object.keys(editedTransactions).length} classifications have been saved`,
        duration: 3000,
      });
      
      setEditedTransactions({});
      
      if (onTransactionUpdate) {
        onTransactionUpdate();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error saving",
        description: "Could not save all classifications",
      });
      console.error("Error saving transactions:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US").format(date);
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const isClassified = (transaction: Transaction, editData?: Partial<Transaction>) => {
    // We consider a transaction to be classified if it has status 'approved'
    // either in the original data or in the edited data
    return (
      transaction.status === "approved" || 
      (editData && editData.status === "approved")
    );
  };

  const hasChanges = Object.keys(editedTransactions).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Transactions to Classify</h3>
        {hasChanges && (
          <Button onClick={handleSaveAll}>
            <Check className="mr-2 h-4 w-4" />
            Save Classifications ({Object.keys(editedTransactions).length})
          </Button>
        )}
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Commercial</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Comment</TableHead>
              <TableHead className="w-10">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {
              const editData = editedTransactions[transaction.id];
              return (
                <TableRow key={transaction.id} className={isClassified(transaction, editData) ? "bg-green-50" : ""}>
                  <TableCell>{formatDate(transaction.date)}</TableCell>
                  <TableCell className="font-medium">{transaction.merchant}</TableCell>
                  <TableCell>{transaction.account}</TableCell>
                  <TableCell>{transaction.commercial || 'Unknown'}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatAmount(transaction.amount, transaction.currency)}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={editData?.category ?? transaction.category ?? ""}
                      onValueChange={(value) => handleChange(transaction.id, "category", value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  {/* Columna de proyecto eliminada */}
                  <TableCell>
                    <Input
                      placeholder="Add comment (optional)"
                      value={editData?.comments ?? transaction.comments ?? ""}
                      onChange={(e) => handleChange(transaction.id, "comments", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    {isClassified(transaction, editData) ? (
                      <span className="flex h-2 w-2 rounded-full bg-green-500" title="Classified"></span>
                    ) : (
                      <span className="flex h-2 w-2 rounded-full bg-amber-500" title="Pending"></span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TransactionTable;
