import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { uploadBankStatement } from "@/lib/mockData";
import { Upload, FileType, AlertCircle, CheckCircle, Beaker, FileText, Bot } from "lucide-react";
import { BankStatement, Transaction } from "@/types";
import { processPDF } from "@/lib/pdfProcessor";
// Importamos la estrategia de procesamiento por grupos
import { processWithOpenAIByGroups } from "@/lib/groupProcessingStrategy";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const FileUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingResult, setProcessingResult] = useState<BankStatement | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [extractedTransactions, setExtractedTransactions] = useState<Transaction[]>([]);
  const [showTransactions, setShowTransactions] = useState(false);
  const [transactionsByPerson, setTransactionsByPerson] = useState<{[key: string]: Transaction[]}>({});
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  /**
   * Función para procesar el PDF con OpenAI y guardar las transacciones
   */
  const handleProcessAndSave = async () => {
    if (!file || file.type !== 'application/pdf') {
      toast({
        variant: "destructive",
        title: "Tipo de archivo incorrecto",
        description: "Por favor, selecciona un archivo PDF",
      });
      return;
    }
    
    try {
      // Paso 1: Iniciar procesamiento
      setIsProcessing(true);
      setExtractedTransactions([]);
      setTransactionsByPerson({});
      setShowTransactions(false);
      
      // Verificar si tenemos las credenciales configuradas
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        toast({
          variant: "default",
          title: "API key no configurada",
          description: "No se ha configurado la API key de OpenAI. Se usarán datos simulados.",
        });
      }
      
      // Paso 2: Enviar a OpenAI para análisis
      toast({
        title: "Procesando extracto bancario",
        description: "Enviando PDF a OpenAI para análisis...",
      });
      
      // Usar la estrategia de procesamiento por grupos
      toast({
        title: "Usando estrategia de grupos",
        description: "Procesando PDF por grupos de comerciales para mejorar la precisión...",
      });
      
      // Procesar el PDF con la estrategia de grupos que divide los comerciales en 4 grupos
      // Grupo 1: Allia Klipp (5456), Danielle Bury (0166), Denise Urbach (1463), Erica Chaparro (3841)
      // Grupo 2: Fabio Novick (2469), Gail Moore (2543), Ivana Novick (2451), Josue Garcia (2153)
      // Grupo 3: Landon Hamel (0082), Meredith Wellen (7181), Nancy Colon (9923), Sharon Pinto (2535)
      // Grupo 4: Suzanne Strazzeri (0983), Tara Sarris (8012), Timothy Hawver Scott (4641)
      const transactions = await processWithOpenAIByGroups(file);
      
      // Paso 3: Organizar transacciones por comercial
      const byPerson: {[key: string]: Transaction[]} = {};
      
      transactions.forEach(transaction => {
        const person = transaction.assignedTo || 'Sin asignar';
        if (!byPerson[person]) {
          byPerson[person] = [];
        }
        byPerson[person].push(transaction);
      });
      
      setTransactionsByPerson(byPerson);
      setShowTransactions(true);
      
      toast({
        title: "Extracto procesado correctamente",
        description: `Se encontraron ${transactions.length} transacciones agrupadas por comercial`,
      });
      
      // Paso 4: Guardar transacciones automáticamente
      setIsUploading(true);
      
      try {
        // Simular una carga progresiva
        for (let i = 0; i <= 100; i += 10) {
          setProgress(i);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Importar la función uploadBankStatementToSupabase
        const { uploadBankStatementToSupabase } = await import('@/lib/bankStatementService');
        
        // Verificar si tenemos las credenciales de Supabase configuradas
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('tu_url_de_supabase_aqui')) {
          // Si no hay credenciales válidas, usar mockData como fallback
          console.log('No se encontraron credenciales válidas de Supabase, usando mockData como fallback');
          const { uploadBankStatement } = await import('@/lib/mockData');
          const newBankStatement = await uploadBankStatement(file, transactions);
          setProcessingResult(newBankStatement);
        } else {
          // Si hay credenciales válidas, usar Supabase
          console.log('Usando Supabase para guardar el extracto bancario');
          const newBankStatement = await uploadBankStatementToSupabase(file, transactions);
          setProcessingResult(newBankStatement);
        }
        
        toast({
          title: "Transacciones guardadas",
          description: `Se han guardado ${transactions.length} transacciones correctamente`,
        });
        
        // Limpiar el estado después de un procesamiento exitoso
        setTimeout(() => {
          setFile(null);
          setProgress(0);
          setExtractedTransactions([]);
          setShowTransactions(false);
          setTransactionsByPerson({});
        }, 3000);
        
      } catch (uploadError) {
        console.error('Error al guardar las transacciones:', uploadError);
        toast({
          variant: "destructive",
          title: "Error al guardar",
          description: "No se pudieron guardar las transacciones",
        });
      } finally {
        setIsUploading(false);
        setProgress(0);
      }
      
    } catch (error) {
      console.error('Error al procesar el PDF con OpenAI:', error);
      
      // Mensaje de error personalizado según el tipo de error
      toast({
        variant: "destructive",
        title: "Error al procesar el extracto",
        description: `No se pudo procesar el extracto bancario con OpenAI: ${(error as Error).message}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Subir Extracto Bancario</CardTitle>
        <CardDescription>
          Sube un extracto bancario en formato PDF para procesar las transacciones
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {!file ? (
          <div
            className="border-2 border-dashed rounded-lg p-12 text-center hover:bg-muted/50 cursor-pointer transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <h3 className="font-medium text-lg">Arrastra o haz clic para subir</h3>
              <p className="text-sm text-muted-foreground">
                Soporta archivos PDF
              </p>
              <input
                id="file-upload"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileType className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setFile(null);
                  setProgress(0);
                  setProcessingResult(null);
                  setProcessingError(null);
                  setExtractedTransactions([]);
                  setShowTransactions(false);
                  setTransactionsByPerson({});
                }}
              >
                <AlertCircle className="h-4 w-4" />
                <span className="sr-only">Cancelar</span>
              </Button>
            </div>
            
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progreso</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}
            
            {processingError && (
              <div className="bg-destructive/10 p-4 rounded-lg text-destructive text-sm">
                {processingError}
              </div>
            )}
            
            {processingResult && (
              <div className="bg-green-100 p-4 rounded-lg text-green-800 text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>
                  Archivo procesado: {processingResult.transactionCount} transacciones encontradas
                </span>
              </div>
            )}
            
            {showTransactions && (
              Object.keys(transactionsByPerson).length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(transactionsByPerson).map(([person, transactions]) => (
                    <div key={person} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-lg flex items-center gap-2">
                          {person}
                          <Badge variant="secondary">{transactions.length} transacciones</Badge>
                        </h3>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Cuenta</TableHead>
                              <TableHead>Comerciante</TableHead>
                              <TableHead className="text-right">Importe</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {transactions.map((transaction) => (
                              <TableRow key={transaction.id}>
                                <TableCell>
                                  {new Date(transaction.date).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="font-mono">*{transaction.account}</Badge>
                                </TableCell>
                                <TableCell className="font-medium">{transaction.merchant}</TableCell>
                                <TableCell className={`text-right font-mono ${transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {new Intl.NumberFormat('es-ES', { 
                                    style: 'currency', 
                                    currency: transaction.currency 
                                  }).format(transaction.amount)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Comerciante</TableHead>
                        <TableHead className="text-right">Importe</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {extractedTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            {new Date(transaction.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">{transaction.merchant}</TableCell>
                          <TableCell className={`text-right font-mono ${transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {new Intl.NumberFormat('es-ES', { 
                              style: 'currency', 
                              currency: transaction.currency 
                            }).format(transaction.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-center">
        {file && (
          <Button
            onClick={handleProcessAndSave}
            disabled={!file || isUploading || isProcessing || file?.type !== 'application/pdf'}
            className="flex items-center gap-2 w-full max-w-md"
            size="lg"
          >
            {isProcessing ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Procesando extracto...
              </>
            ) : isUploading ? (
              <>
                <Upload className="h-5 w-5 mr-2" />
                Guardando transacciones...
              </>
            ) : (
              <>
                <Bot className="h-5 w-5 mr-2" />
                Procesar extracto bancario
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default FileUpload;
