
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AccountSummary } from "@/types";
import { useNavigate } from "react-router-dom";
import { users } from "@/lib/mockData";
import { Check, Clock, AlertTriangle } from "lucide-react";

interface AccountSummaryTableProps {
  accounts: AccountSummary[];
}

const AccountSummaryTable = ({ accounts }: AccountSummaryTableProps) => {
  const navigate = useNavigate();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "complete":
        return (
          <Badge className="bg-success-500">
            <Check className="mr-1 h-3 w-3" /> Completado
          </Badge>
        );
      case "partial":
        return (
          <Badge variant="outline" className="border-warning-500 text-warning-500">
            <Clock className="mr-1 h-3 w-3" /> Parcial
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="border-error-500 text-error-500">
            <AlertTriangle className="mr-1 h-3 w-3" /> Pendiente
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getAssignedToName = (userId?: string) => {
    if (!userId) return "No asignado";
    const user = users.find(u => u.id === userId);
    return user ? user.name : "Desconocido";
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const handleViewDetails = (account: string) => {
    navigate(`/finance/accounts/${account}`);
  };

  const handleSendReminder = (account: string) => {
    // In a real app, this would send a reminder to the user
    alert(`Se ha enviado un recordatorio para la cuenta ${account}`);
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Resumen de Cuentas</CardTitle>
        <CardDescription>
          Estado actual de clasificación por cuenta bancaria
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cuenta</TableHead>
              <TableHead>Asignado a</TableHead>
              <TableHead>Transacciones</TableHead>
              <TableHead>Importe Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.account}>
                <TableCell className="font-medium">
                  PNC **** {account.account}
                </TableCell>
                <TableCell>{getAssignedToName(account.assignedTo)}</TableCell>
                <TableCell>{account.transactions}</TableCell>
                <TableCell>{formatAmount(account.totalAmount, account.currency)}</TableCell>
                <TableCell>{getStatusBadge(account.status)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDetails(account.account)}
                  >
                    Ver detalle
                  </Button>
                  {account.status !== "complete" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendReminder(account.account)}
                    >
                      Recordatorio
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default AccountSummaryTable;
