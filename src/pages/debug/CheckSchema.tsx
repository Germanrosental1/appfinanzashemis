import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CheckSchema = () => {
  const [schemaInfo, setSchemaInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactionData = async () => {
      try {
        setLoading(true);
        
        // Consultar una muestra de transacciones para ver su estructura
        const { data: sampleData, error: sampleError } = await supabase
          .from('transactions')
          .select('*')
          .limit(1);

        if (sampleError) throw sampleError;
        
        // Obtener valores únicos del campo status
        const { data: statusValues, error: statusError } = await supabase
          .from('transactions')
          .select('status')
          .limit(100);
        
        if (statusError) throw statusError;
        
        const uniqueStatuses = [...new Set(statusValues?.map(item => item.status))];
        
        setSchemaInfo({
          sampleData,
          uniqueStatuses
        });
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Error al consultar los datos');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionData();
  }, []);

  return (
    <AppLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Información de la Tabla Transactions</h1>
        
        {loading ? (
          <p>Cargando información...</p>
        ) : error ? (
          <div className="bg-red-100 p-4 rounded-md">
            <h2 className="text-red-700 font-bold">Error:</h2>
            <p>{error}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {schemaInfo?.uniqueStatuses && (
              <Card>
                <CardHeader>
                  <CardTitle>Valores permitidos para el campo 'status'</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-5">
                    {schemaInfo.uniqueStatuses.map((status: string, index: number) => (
                      <li key={index} className="font-mono bg-gray-100 px-2 py-1 rounded">{status}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            
            {schemaInfo?.sampleData && (
              <Card>
                <CardHeader>
                  <CardTitle>Estructura de una transacción</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-100 p-4 rounded-md overflow-auto">
                    {JSON.stringify(schemaInfo.sampleData, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CheckSchema;
