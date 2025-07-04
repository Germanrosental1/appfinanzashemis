
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Code, Save, RotateCw } from "lucide-react";

interface GrokPattern {
  name: string;
  pattern: string;
  isActive: boolean;
}

const defaultGrokPattern = `# Patrón para extractos bancarios CSV
(?<postingDate>%{MONTHDAY}/%{MONTHDAY}/%{YEAR2})[, ]+(?<tranDate>%{MONTHDAY}/%{MONTHDAY}/%{YEAR2})[, ]+(?<account>XXXX-XXXX-XXXX-%{INT})[, ]+(?<supplier>[^,]+)[, ]+(?<amount>%{NUMBER})`;

const defaultLogstashConfig = `input {
  file {
    path => "/data/incoming/*.csv"
    start_position => "beginning"
    sincedb_path => "/dev/null"
  }
}

filter {
  # Salta las líneas de título/subtotales
  if [message] =~ /^(Statement Period|Debit Total|Credit Total|Total)/ {
    drop { }
  }

  # Usa Grok para capturar campos
  grok {
    match => {
      "message" => [
        "${defaultGrokPattern}"
      ]
    }
    tag_on_failure => ["_grokparsefailure"]
  }

  # Convertir fechas y números
  date {
    match => ["postingDate", "M/d/yy"]
    target => "postingDate"
  }
  date {
    match => ["tranDate", "M/d/yy"]
    target => "tranDate"
  }
  mutate {
    convert => { "amount" => "float" }
  }

  # Marcar estado inicial
  mutate {
    add_field => { "status" => "pending" }
  }
}

output {
  # Enviar JSON a tu API de ingestión
  http {
    url => "https://api.ejemplo.com/transactions/ingest"
    http_method => "post"
    format => "json"
    headers => { "Content-Type" => "application/json" }
  }
}`;

const GrokConfigPanel = () => {
  const [patterns, setPatterns] = useState<GrokPattern[]>([
    { name: "CSV Estándar", pattern: defaultGrokPattern, isActive: true }
  ]);
  const [endpointUrl, setEndpointUrl] = useState("https://api.ejemplo.com/transactions/ingest");
  const [logstashConfig, setLogstashConfig] = useState(defaultLogstashConfig);
  const [autoProcessEnabled, setAutoProcessEnabled] = useState(true);
  
  const { toast } = useToast();

  const handlePatternChange = (index: number, field: keyof GrokPattern, value: string | boolean) => {
    const newPatterns = [...patterns];
    newPatterns[index] = { ...newPatterns[index], [field]: value };
    setPatterns(newPatterns);
  };

  const handleAddPattern = () => {
    setPatterns([...patterns, { name: `Patrón ${patterns.length + 1}`, pattern: "", isActive: false }]);
  };

  const handleSaveConfig = () => {
    // En una implementación real, esto guardaría la configuración en un backend
    toast({
      title: "Configuración guardada",
      description: "Los patrones de Grok y la configuración de Logstash han sido guardados",
    });
  };

  const handleTestConfig = () => {
    // En una implementación real, esto ejecutaría una prueba de la configuración
    toast({
      title: "Prueba iniciada",
      description: "Procesando archivo de prueba con la configuración actual",
    });

    // Simulación de éxito después de un tiempo
    setTimeout(() => {
      toast({
        title: "Prueba completada",
        description: "Se procesaron 24 transacciones correctamente",
        variant: "success",
      });
    }, 2000);
  };

  const handleUpdateEndpoint = (url: string) => {
    setEndpointUrl(url);
    // Actualizar la URL en la configuración de Logstash
    setLogstashConfig(logstashConfig.replace(/url => "[^"]+"/g, `url => "${url}"`));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Code className="mr-2 h-5 w-5" /> Configuración de Grok/Logstash
        </CardTitle>
        <CardDescription>
          Configure los patrones de Grok para procesar automáticamente sus extractos bancarios
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="patterns">
          <TabsList className="mb-4">
            <TabsTrigger value="patterns">Patrones Grok</TabsTrigger>
            <TabsTrigger value="logstash">Configuración Logstash</TabsTrigger>
            <TabsTrigger value="settings">Configuración General</TabsTrigger>
          </TabsList>
          
          <TabsContent value="patterns" className="space-y-4">
            {patterns.map((pattern, index) => (
              <div key={index} className="space-y-2 border p-4 rounded-md">
                <div className="flex items-center justify-between">
                  <Input 
                    value={pattern.name}
                    onChange={(e) => handlePatternChange(index, "name", e.target.value)}
                    className="max-w-xs"
                    placeholder="Nombre del patrón"
                  />
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`pattern-active-${index}`}
                      checked={pattern.isActive}
                      onCheckedChange={(checked) => handlePatternChange(index, "isActive", checked)}
                    />
                    <Label htmlFor={`pattern-active-${index}`}>Activo</Label>
                  </div>
                </div>
                <Textarea 
                  value={pattern.pattern}
                  onChange={(e) => handlePatternChange(index, "pattern", e.target.value)}
                  className="font-mono text-sm h-32"
                  placeholder="Patrón Grok"
                />
              </div>
            ))}
            <Button onClick={handleAddPattern} variant="outline">Añadir Patrón</Button>
          </TabsContent>
          
          <TabsContent value="logstash" className="space-y-4">
            <Textarea 
              value={logstashConfig}
              onChange={(e) => setLogstashConfig(e.target.value)}
              className="font-mono text-sm h-96"
              placeholder="Configuración Logstash"
            />
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="endpoint-url">URL del endpoint de ingesta</Label>
              <Input 
                id="endpoint-url"
                value={endpointUrl}
                onChange={(e) => handleUpdateEndpoint(e.target.value)}
                placeholder="https://api.ejemplo.com/transactions/ingest"
              />
            </div>
            <div className="flex items-center space-x-2 pt-4">
              <Switch
                id="auto-process"
                checked={autoProcessEnabled}
                onCheckedChange={setAutoProcessEnabled}
              />
              <Label htmlFor="auto-process">Procesar automáticamente nuevos archivos</Label>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={handleTestConfig} variant="outline">
          <RotateCw className="mr-2 h-4 w-4" />
          Probar Configuración
        </Button>
        <Button onClick={handleSaveConfig}>
          <Save className="mr-2 h-4 w-4" />
          Guardar Configuración
        </Button>
      </CardFooter>
    </Card>
  );
};

export default GrokConfigPanel;
