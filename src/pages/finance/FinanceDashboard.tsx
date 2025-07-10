
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
  
  const handleViewStatement = (statementId: string) => {
    setSelectedStatementId(statementId);
  };
  
  const handleBackToList = () => {
    setSelectedStatementId(null);
  };

  useEffect(() => {
    // In a real app, we would fetch this data from the backend
    const dashboardMetrics = getDashboardMetrics();
    setMetrics(dashboardMetrics);
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Dashboard Financiero</h1>
        </div>
        
        <DashboardMetricsCard metrics={metrics} />
        
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
                  <h2 className="text-xl font-bold">Extractos Bancarios Procesados</h2>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Actualizar
                  </Button>
                </div>
                <ProcessedStatementsList onViewStatement={handleViewStatement} />
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
