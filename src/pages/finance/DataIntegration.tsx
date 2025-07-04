import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import GrokConfigPanel from "@/components/finance/GrokConfigPanel";
import DataPipeline from "@/components/finance/DataPipeline";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Database, Activity, FileUp, Code, RefreshCw } from "lucide-react";
import FileUpload from "@/components/finance/FileUpload";
import ProcessedStatementsList from "@/components/finance/ProcessedStatementsList";
import StatementTransactionsView from "@/components/finance/StatementTransactionsView";

const DataIntegration = () => {
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
  
  const handleViewStatement = (statementId: string) => {
    setSelectedStatementId(statementId);
  };
  
  const handleBackToList = () => {
    setSelectedStatementId(null);
  };
  const [activeTab, setActiveTab] = useState("upload");

  return (
    <AppLayout requireRole="finance">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Integración de Datos</h1>
          <Button variant="outline">
            <Activity className="mr-2 h-4 w-4" />
            Ver Historial
          </Button>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex items-center">
            <TabsList className="flex-1">
              <TabsTrigger value="upload" className="flex items-center">
                <FileUp className="mr-2 h-4 w-4" />
                Subir Extracto
              </TabsTrigger>
              <TabsTrigger value="pipeline" className="flex items-center">
                <Database className="mr-2 h-4 w-4" />
                Pipeline de Datos
              </TabsTrigger>
              <TabsTrigger value="grok" className="flex items-center">
                <Code className="mr-2 h-4 w-4" />
                Configuración Grok
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="upload" className="space-y-4">
            {selectedStatementId ? (
              <StatementTransactionsView 
                statementId={selectedStatementId} 
                onBack={handleBackToList} 
              />
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card className="col-span-2">
                    <CardHeader>
                      <CardTitle>Subir Extracto Bancario</CardTitle>
                      <CardDescription>
                        Sube un extracto bancario para procesarlo y extraer las transacciones
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FileUpload />
                    </CardContent>
                  </Card>
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Formatos Soportados</CardTitle>
                        <CardDescription>
                          Tipos de archivo que pueden ser procesados
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-sm font-medium">Extractos Bancarios</h3>
                            <ul className="mt-2 text-sm text-muted-foreground">
                              <li>Excel (.xlsx, .xls) - Formato de banco preferido</li>
                              <li>CSV (.csv) - Asegúrese de que las columnas estén separadas por comas</li>
                              <li>PDF (.pdf) - La extracción puede variar según el formato</li>
                            </ul>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium">Recomendaciones</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                              Para obtener mejores resultados, utilice extractos en formato Excel
                              proporcionados directamente por su banco.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">Extractos Procesados</h2>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Actualizar
                  </Button>
                </div>
                
                <ProcessedStatementsList onViewStatement={handleViewStatement} />
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="pipeline">
            <DataPipeline />
          </TabsContent>
          
          <TabsContent value="grok">
            <GrokConfigPanel />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default DataIntegration;
