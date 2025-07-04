import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Check, AlertCircle, Loader2 } from "lucide-react";
import { Transaction } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { validateCommercialAccessToken, getTransactionsByCommercial, bulkUpdateTransactions, SupabaseTransaction } from "@/lib/supabaseClient";

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
  { id: "travel_expenses", name: "Travel expenses" },
  { id: "warehouse_expense", name: "Warehouse expense" }
];

// Subcategorías para Travel expenses
const travelSubcategories = [
  { id: "travel_operating", name: "Operating" },
  { id: "travel_admin", name: "Admin" },
  { id: "travel_selling", name: "Selling" }
];

// Ya no necesitamos proyectos

// Datos de ejemplo para Allia Klipp
const ALLIA_KLIPP_TRANSACTIONS: Transaction[] = [
  {
    id: "1",
    date: "2025-06-04",
    account: "*5456",
    merchant: "Hp *instant Ink",
    amount: 30.40,
    currency: "USD",
    status: "pending",
    assignedTo: "Allia Klipp",
    comments: ""
  },
  {
    id: "2",
    date: "2025-06-04",
    account: "*5456",
    merchant: "Walgreens #09190",
    amount: 47.04,
    currency: "USD",
    status: "pending",
    assignedTo: "Allia Klipp",
    comments: ""
  },
  {
    id: "3",
    date: "2025-06-04",
    account: "*5456",
    merchant: "Fineline Technologies",
    amount: 152.08,
    currency: "USD",
    status: "pending",
    assignedTo: "Allia Klipp",
    comments: ""
  },
  {
    id: "4",
    date: "2025-06-04",
    account: "*5456",
    merchant: "Amazon Reta* Jk17o06p3",
    amount: 62.87,
    currency: "USD",
    status: "pending",
    assignedTo: "Allia Klipp",
    comments: ""
  },
  {
    id: "5",
    date: "2025-06-04",
    account: "*5456",
    merchant: "Old Dominion Freight Lin",
    amount: 1136.19,
    currency: "USD",
    status: "pending",
    assignedTo: "Allia Klipp",
    comments: ""
  },
  {
    id: "6",
    date: "2025-06-04",
    account: "*5456",
    merchant: "Priority1 Inc",
    amount: 1786.22,
    currency: "USD",
    status: "pending",
    assignedTo: "Allia Klipp",
    comments: ""
  },
  {
    id: "7",
    date: "2025-06-04",
    account: "*5456",
    merchant: "Fineline Technologies",
    amount: 132.85,
    currency: "USD",
    status: "pending",
    assignedTo: "Allia Klipp",
    comments: ""
  },
  {
    id: "8",
    date: "2025-06-04",
    account: "*5456",
    merchant: "Old Dominion Freight Lin",
    amount: 100.00,
    currency: "USD",
    status: "pending",
    assignedTo: "Allia Klipp",
    comments: ""
  },
  {
    id: "9",
    date: "2025-06-04",
    account: "*5456",
    merchant: "Amazon Mktpl",
    amount: 17.38,
    currency: "USD",
    status: "pending",
    assignedTo: "Allia Klipp",
    comments: ""
  },
  {
    id: "10",
    date: "2025-06-04",
    account: "*5456",
    merchant: "Amazon Mktpl",
    amount: 46.57,
    currency: "USD",
    status: "pending",
    assignedTo: "Allia Klipp",
    comments: ""
  },
  {
    id: "11",
    date: "2025-06-04",
    account: "*5456",
    merchant: "Hp *instant Ink",
    amount: 30.44,
    currency: "USD",
    status: "pending",
    assignedTo: "Allia Klipp",
    comments: ""
  },
  {
    id: "12",
    date: "2025-06-04",
    account: "*5456",
    merchant: "Amazon Mktpl",
    amount: 139.28,
    currency: "USD",
    status: "pending",
    assignedTo: "Allia Klipp",
    comments: ""
  }
];

const CommercialClassify = () => {
  const { token } = useParams<{ token: string }>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [editedTransactions, setEditedTransactions] = useState<Record<string, Partial<Transaction>>>({});
  const [showSubcategories, setShowSubcategories] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenExpiry, setTokenExpiry] = useState<Date | null>(null);
  const [commercialName, setCommercialName] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Validación de token y carga de datos desde Supabase
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenValid(false);
        setLoading(false);
        return;
      }
      
      try {
        // Validar el token usando Supabase
        const commercialName = await validateCommercialAccessToken(token);
        
        if (!commercialName) {
          setTokenValid(false);
          setLoading(false);
          return;
        }
        
        setTokenValid(true);
        setCommercialName(commercialName);
        
        // Obtener la fecha de expiración (7 días desde ahora para la UI)
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);
        setTokenExpiry(expiryDate);
        
        // Cargar las transacciones del comercial desde Supabase
        const commercialTransactions = await getTransactionsByCommercial(commercialName);
        
        // Convertir las transacciones de Supabase al formato de la aplicación
        const formattedTransactions: Transaction[] = commercialTransactions.map(t => ({
          id: t.id,
          date: t.date,
          account: t.account,
          merchant: t.merchant,
          amount: t.amount,
          currency: t.currency,
          category: t.category,
          subcategory: t.subcategory,
          comments: t.comments,
          status: t.status === 'pending' ? 'pending' : 
                 t.status === 'approved' ? 'approved' : 'classified',
          assignedTo: t.assigned_to
        }));
        
        setTransactions(formattedTransactions);
        setLoading(false);
      } catch (error) {
        console.error("Error validando token:", error);
        setTokenValid(false);
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  // Función para manejar cambios en los campos editables
  const handleChange = (id: string, field: string, value: string) => {
    // Si se selecciona Travel expenses, mostrar subcategorías
    if (field === "category" && value === "travel_expenses") {
      setShowSubcategories(prev => ({ ...prev, [id]: true }));
    } else if (field === "category") {
      // Si se cambia a otra categoría, ocultar subcategorías
      setShowSubcategories(prev => ({ ...prev, [id]: false }));
      
      // Eliminar subcategoría si existía
      if (editedTransactions[id]?.subcategory) {
        const { subcategory, ...rest } = editedTransactions[id];
        setEditedTransactions(prev => ({ ...prev, [id]: rest }));
      }
    }
    
    // Actualizar el estado de edición actual
    setEditData(prev => ({ ...prev, [field]: value }));
    
    // Guardar el cambio en el registro de transacciones editadas
    setEditedTransactions(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value }
    }));
  };
  
  // Función para manejar cambios en las subcategorías
  const handleSubcategoryChange = (id: string, value: string) => {
    setEditData(prev => ({ ...prev, subcategory: value }));
    
    setEditedTransactions(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), subcategory: value }
    }));
  };

  const handleSaveAll = async () => {
    try {
      setSubmitting(true);
      
      // Verificar si hay transacciones sin clasificar
      const unclassifiedTransactions = transactions.filter(t => {
        const currentCategory = editedTransactions[t.id]?.category || t.category;
        const currentSubcategory = editedTransactions[t.id]?.subcategory || t.subcategory;
        
        // Si no tiene categoría, está sin clasificar
        if (!currentCategory) return true;
        
        // Si es Travel expenses y no tiene subcategoría, está incompleta
        if (currentCategory === "travel_expenses" && !currentSubcategory) return true;
        
        return false;
      });
      
      if (unclassifiedTransactions.length > 0) {
        toast({
          variant: "destructive",
          title: "Clasificación incompleta",
          description: `Hay ${unclassifiedTransactions.length} transacciones sin clasificar o incompletas. Asegúrese de asignar categorías y subcategorías donde sea necesario.`,
        });
        setSubmitting(false);
        return;
      }
      
      // Preparar las actualizaciones para enviar a Supabase
      const updates = Object.entries(editedTransactions).map(([id, data]) => {
        // Convertir del formato de la aplicación al formato de Supabase
        const supabaseUpdates: Partial<SupabaseTransaction> = {
          category: data.category,
          subcategory: data.subcategory,
          comments: data.comments,
          status: 'pending' // En Supabase los estados son: 'pending', 'approved', 'rejected'
        };
        
        return { id, updates: supabaseUpdates };
      });
      
      // Enviar actualizaciones a Supabase
      if (updates.length > 0) {
        await bulkUpdateTransactions(updates);
      }
      
      // Actualizar el estado local
      const updatedTransactions = transactions.map(transaction => {
        if (editedTransactions[transaction.id]) {
          return { 
            ...transaction, 
            ...editedTransactions[transaction.id], 
            status: "classified" as "pending" | "classified" | "approved" 
          };
        }
        return transaction;
      });
      
      setTransactions(updatedTransactions as Transaction[]);
      setEditedTransactions({});
      
      toast({
        title: "¡Clasificaciones enviadas!",
        description: "Gracias por clasificar sus transacciones. Los datos han sido enviados correctamente.",
      });
    } catch (error) {
      console.error("Error al enviar clasificaciones:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron enviar las clasificaciones. Por favor, intente nuevamente.",
      });
    } finally {
      setSubmitting(false);
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
    return transaction.status === "classified" || (editData && editData.status === "classified");
  };

  const calculateTotal = () => {
    return transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  };

  const formatExpiryDate = (date: Date | null) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p>Cargando sus transacciones...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-[450px]">
          <CardHeader>
            <CardTitle className="text-red-500 flex items-center">
              <AlertCircle className="mr-2" />
              Enlace no válido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Este enlace ha expirado o no es válido. Por favor, contacte con el administrador para obtener un nuevo enlace.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasChanges = Object.keys(editedTransactions).length > 0;
  const pendingCount = transactions.filter(t => t.status === "pending" && !editedTransactions[t.id]).length;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Clasificación de Gastos</h1>
          <p className="mt-2 text-gray-600">
            {commercialName} {transactions.length > 0 && transactions[0].account ? `| Cuenta: **** ${transactions[0].account.slice(-4)}` : ''} | Válido hasta: {formatExpiryDate(tokenExpiry)}
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Transacciones a Clasificar</CardTitle>
                <CardDescription>
                  {pendingCount === 0 
                    ? "Todas las transacciones han sido clasificadas" 
                    : `${pendingCount} transacciones pendientes de clasificar por categoría`}
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-xl font-bold">{formatAmount(calculateTotal(), "USD")}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {hasChanges && (
                <div className="flex justify-end">
                  <Button onClick={handleSaveAll}>
                    <Check className="mr-2 h-4 w-4" />
                    Guardar Clasificaciones ({Object.keys(editedTransactions).length})
                  </Button>
                </div>
              )}
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cuenta</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Importe</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Comentario</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => {
                      const editData = editedTransactions[transaction.id];
                      return (
                        <TableRow key={transaction.id} className={isClassified(transaction, editData) ? "bg-green-50" : ""}>
                          <TableCell>{formatDate(transaction.date)}</TableCell>
                          <TableCell>{transaction.account}</TableCell>
                          <TableCell className="font-medium">{transaction.merchant}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatAmount(transaction.amount, transaction.currency)}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
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
                              
                              {/* Subcategorías para Travel expenses */}
                              {((editData?.category ?? transaction.category) === "travel_expenses" || 
                                showSubcategories[transaction.id]) && (
                                <Select
                                  value={editData?.subcategory ?? transaction.subcategory ?? ""}
                                  onValueChange={(value) => handleSubcategoryChange(transaction.id, value)}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Tipo..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {travelSubcategories.map((subcat) => (
                                      <SelectItem key={subcat.id} value={subcat.id}>
                                        {subcat.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            <Input
                              placeholder="Añadir comentario (opcional)"
                              value={editData?.comments ?? transaction.comments ?? ""}
                              onChange={(e) => handleChange(transaction.id, "comments", e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            {isClassified(transaction, editData) ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Clasificado
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                Pendiente
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              
              <div className="flex justify-between mt-8">
                <Button 
                  variant="default" 
                  size="lg" 
                  className="w-full py-6 text-lg font-bold"
                  onClick={handleSaveAll}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center text-sm text-gray-500">
          <p>Este enlace expirará el {formatExpiryDate(tokenExpiry)}. Si tiene problemas para clasificar sus gastos, por favor contacte con el administrador.</p>
        </div>
      </div>
    </div>
  );
};

export default CommercialClassify;
