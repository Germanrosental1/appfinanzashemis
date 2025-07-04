
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, FileText, CheckCircle, AlertCircle, Database } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PipelineStage {
  id: string;
  name: string;
  status: "idle" | "processing" | "completed" | "error";
  count: number;
  errorCount?: number;
}

interface PipelineStats {
  totalFiles: number;
  processedFiles: number;
  extractedTransactions: number;
  failedTransactions: number;
  lastUpdate: string;
}

// En un sistema real, estos datos vendrían de una API
const initialPipelineStages: PipelineStage[] = [
  { id: "input", name: "Entrada de archivos", status: "idle", count: 0 },
  { id: "grok", name: "Procesamiento Grok", status: "idle", count: 0, errorCount: 0 },
  { id: "transform", name: "Transformación", status: "idle", count: 0, errorCount: 0 },
  { id: "output", name: "Ingestión API", status: "idle", count: 0, errorCount: 0 },
];

const initialPipelineStats: PipelineStats = {
  totalFiles: 0,
  processedFiles: 0,
  extractedTransactions: 0,
  failedTransactions: 0,
  lastUpdate: "-",
};

const DataPipeline = () => {
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>(initialPipelineStages);
  const [stats, setStats] = useState<PipelineStats>(initialPipelineStats);

  // Simulación de datos para la demo
  useEffect(() => {
    const simulateActivity = () => {
      // Simular un archivo nuevo
      if (Math.random() > 0.7) {
        setPipelineStages(prevStages => {
          const newStages = [...prevStages];
          newStages[0] = { ...newStages[0], status: "processing", count: newStages[0].count + 1 };
          return newStages;
        });
        
        setStats(prev => ({
          ...prev,
          totalFiles: prev.totalFiles + 1,
          lastUpdate: new Date().toISOString()
        }));

        // Después de un tiempo, simular procesamiento Grok
        setTimeout(() => {
          setPipelineStages(prevStages => {
            const newStages = [...prevStages];
            newStages[0] = { ...newStages[0], status: "completed" };
            newStages[1] = { ...newStages[1], status: "processing", count: newStages[1].count + 30 };
            return newStages;
          });

          // Después de un tiempo, simular transformación
          setTimeout(() => {
            let errorCount = Math.floor(Math.random() * 3); // 0-2 errores
            
            setPipelineStages(prevStages => {
              const newStages = [...prevStages];
              newStages[1] = { ...newStages[1], status: "completed", errorCount: newStages[1].errorCount! + errorCount };
              newStages[2] = { 
                ...newStages[2], 
                status: "processing", 
                count: newStages[2].count + (30 - errorCount)
              };
              return newStages;
            });

            setStats(prev => ({
              ...prev,
              failedTransactions: prev.failedTransactions + errorCount,
              lastUpdate: new Date().toISOString()
            }));

            // Finalmente, simular ingestión API
            setTimeout(() => {
              setPipelineStages(prevStages => {
                const newStages = [...prevStages];
                newStages[2] = { ...newStages[2], status: "completed" };
                newStages[3] = { 
                  ...newStages[3], 
                  status: "completed", 
                  count: newStages[3].count + (30 - errorCount)
                };
                return newStages;
              });

              setStats(prev => ({
                ...prev,
                processedFiles: prev.processedFiles + 1,
                extractedTransactions: prev.extractedTransactions + (30 - errorCount),
                lastUpdate: new Date().toISOString()
              }));

              // Resetear estados para la próxima iteración
              setTimeout(() => {
                setPipelineStages(prevStages => {
                  return prevStages.map(stage => ({ ...stage, status: "idle" }));
                });
              }, 2000);

            }, 1000);
          }, 1500);
        }, 2000);
      }
    };

    // Simular actividad cada 8 segundos
    const interval = setInterval(simulateActivity, 8000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: PipelineStage["status"]) => {
    switch (status) {
      case "idle":
        return <Badge variant="outline">Inactivo</Badge>;
      case "processing":
        return <Badge className="bg-blue-500">Procesando</Badge>;
      case "completed":
        return <Badge className="bg-green-500">Completado</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge>Desconocido</Badge>;
    }
  };

  const getStatusIcon = (status: PipelineStage["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "processing":
        return <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-200" />;
    }
  };

  const formatLastUpdate = (dateString: string) => {
    if (dateString === "-") return "-";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Database className="mr-2 h-5 w-5" /> Estado del Pipeline de Datos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Estadísticas generales */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-muted/40 p-3 rounded-md text-center">
              <p className="text-sm text-muted-foreground">Archivos Totales</p>
              <p className="text-2xl font-bold">{stats.totalFiles}</p>
            </div>
            <div className="bg-muted/40 p-3 rounded-md text-center">
              <p className="text-sm text-muted-foreground">Procesados</p>
              <p className="text-2xl font-bold">{stats.processedFiles}</p>
            </div>
            <div className="bg-muted/40 p-3 rounded-md text-center">
              <p className="text-sm text-muted-foreground">Transacciones</p>
              <p className="text-2xl font-bold">{stats.extractedTransactions}</p>
            </div>
            <div className="bg-muted/40 p-3 rounded-md text-center">
              <p className="text-sm text-muted-foreground">Última Act.</p>
              <p className="text-lg font-mono">{formatLastUpdate(stats.lastUpdate)}</p>
            </div>
          </div>

          {/* Visualización del pipeline */}
          <div className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Pipeline de Procesamiento</span>
              </div>
              <Badge 
                variant={stats.failedTransactions > 0 ? "destructive" : "outline"}
                className="ml-2"
              >
                {stats.failedTransactions} errores
              </Badge>
            </div>
            
            <div className="flex items-center">
              {pipelineStages.map((stage, index) => (
                <div key={stage.id} className="flex items-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div 
                          className={`relative flex flex-col items-center justify-center p-3 rounded-lg border ${
                            stage.status === "processing" ? "border-blue-500 bg-blue-50" : 
                            stage.status === "completed" ? "border-green-500 bg-green-50" :
                            stage.status === "error" ? "border-red-500 bg-red-50" :
                            "border-gray-200"
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(stage.status)}
                            <span className="font-medium">{stage.name}</span>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {stage.count} procesados
                            {stage.errorCount !== undefined && stage.errorCount > 0 && 
                              <span className="text-red-500 ml-1">({stage.errorCount} errores)</span>
                            }
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-semibold">{stage.name}</p>
                        <p>Estado: {getStatusBadge(stage.status)}</p>
                        <p>Procesados: {stage.count}</p>
                        {stage.errorCount !== undefined && (
                          <p>Errores: {stage.errorCount}</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  {index < pipelineStages.length - 1 && (
                    <div className="mx-2">
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Eficiencia general del proceso */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Eficiencia del procesamiento</span>
                <span>
                  {stats.extractedTransactions > 0 
                    ? Math.round((1 - stats.failedTransactions / (stats.extractedTransactions + stats.failedTransactions)) * 100)
                    : 100}%
                </span>
              </div>
              <Progress 
                value={stats.extractedTransactions > 0 
                  ? (1 - stats.failedTransactions / (stats.extractedTransactions + stats.failedTransactions)) * 100 
                  : 100} 
                className="h-2"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataPipeline;
