
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { DashboardMetrics } from "@/types";
import { getDashboardMetrics } from "@/lib/mockData";
import DashboardMetricsCard from "@/components/finance/DashboardMetricsCard";
import ProcessedStatementsList from "@/components/finance/ProcessedStatementsList";
import StatementTransactionsView from "@/components/finance/StatementTransactionsView";
import FileUpload from "@/components/finance/FileUpload";
import { Button } from "@/components/ui/button";
import { Database, RefreshCw } from "lucide-react";

const FinanceDashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [key, setKey] = useState(0); // Clave para forzar la actualización de componentes hijos
  
  const handleViewStatement = (statementId: string) => {
    setSelectedStatementId(statementId);
  };
  
  const handleBackToList = () => {
    setSelectedStatementId(null);
  };

  const fetchDashboardData = () => {
    // In a real app, we would fetch this data from the backend
    const dashboardMetrics = getDashboardMetrics();
    setMetrics(dashboardMetrics);
  };

  // Función para actualizar los datos del dashboard
  const handleRefresh = () => {
    setIsRefreshing(true);
    
    // Actualizar los datos del dashboard
    fetchDashboardData();
    
    // Forzar la actualización de los componentes hijos incrementando la key
    setKey(prevKey => prevKey + 1);
    
    // Simular un tiempo de carga para dar feedback visual
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (!metrics) {
    return (
      <AppLayout requireRole="finance">
        <div className="flex items-center justify-center h-64">
          <p>Cargando datos del dashboard...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout requireRole="finance">
      <div className="space-y-6 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Financial Dashboard</h1>
        </div>
        
        {/* Las métricas se han eliminado del dashboard y solo se muestran en la vista del extracto */}
        
        {selectedStatementId ? (
          <StatementTransactionsView 
            statementId={selectedStatementId} 
            onBack={handleBackToList} 
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div></div> {/* Espacio vacío donde estaba el título */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-2" 
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                  </Button>
                </div>
                <ProcessedStatementsList key={`statements-list-${key}`} onViewStatement={handleViewStatement} />
              </div>
            </div>
            <div>
              <FileUpload />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default FinanceDashboard;
