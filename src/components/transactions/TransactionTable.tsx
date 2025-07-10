
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

// Categorías específicas para clasificación (ordenadas alfabéticamente)
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

// Ya no necesitamos proyectos

const TransactionTable = ({ transactions, onTransactionUpdate }: TransactionTableProps) => {
  const [editedTransactions, setEditedTransactions] = useState<Record<string, Partial<Transaction>>>({});
  const { toast } = useToast();

  const handleChange = (transactionId: string, field: keyof Transaction, value: any) => {
    setEditedTransactions(prev => ({
      ...prev,
      [transactionId]: {
        ...prev[transactionId],
        [field]: value,
        // Actualizamos el status a 'approved' cuando se modifica algún campo
        status: "approved"
      }
    }));
  };

  const handleSaveAll = async () => {
    try {
      // Crear un array de promesas para actualizar cada transacción en Supabase
      const updatedPromises = Object.entries(editedTransactions).map(async ([id, updates]) => {
        // Actualizamos categoría, comentarios y cambiamos el status a 'approved'
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
        title: "Clasificaciones guardadas",
        description: `Se han guardado ${Object.keys(editedTransactions).length} clasificaciones`,
        duration: 3000,
      });
      
      setEditedTransactions({});
      
      if (onTransactionUpdate) {
        onTransactionUpdate();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: "No se pudieron guardar todas las clasificaciones",
      });
      console.error("Error saving transactions:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("es-ES").format(date);
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const isClassified = (transaction: Transaction, editData?: Partial<Transaction>) => {
    // Consideramos que una transacción está clasificada si tiene status 'approved'
    // ya sea en los datos originales o en los datos editados
    return (
      transaction.status === "approved" || 
      (editData && editData.status === "approved")
    );
  };

  const hasChanges = Object.keys(editedTransactions).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Transacciones a Clasificar</h3>
        {hasChanges && (
          <Button onClick={handleSaveAll}>
            <Check className="mr-2 h-4 w-4" />
            Guardar Clasificaciones ({Object.keys(editedTransactions).length})
          </Button>
        )}
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Cuenta</TableHead>
              <TableHead>Comercial</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Comentario</TableHead>
              <TableHead className="w-10">Estado</TableHead>
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
                  <TableCell>{transaction.commercial || 'Desconocido'}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatAmount(transaction.amount, transaction.currency)}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={editData?.category ?? transaction.category ?? ""}
                      onValueChange={(value) => handleChange(transaction.id, "category", value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar..." />
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
                      placeholder="Añadir comentario (opcional)"
                      value={editData?.comments ?? transaction.comments ?? ""}
                      onChange={(e) => handleChange(transaction.id, "comments", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    {isClassified(transaction, editData) ? (
                      <span className="flex h-2 w-2 rounded-full bg-green-500" title="Clasificado"></span>
                    ) : (
                      <span className="flex h-2 w-2 rounded-full bg-amber-500" title="Pendiente"></span>
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
