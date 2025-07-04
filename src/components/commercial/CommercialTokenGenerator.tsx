import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { generateCommercialAccessToken } from "@/lib/supabaseClient";
import { sendCommercialAccessToken } from "@/lib/emailService";

const CommercialTokenGenerator: React.FC = () => {
  const [commercialName, setCommercialName] = useState('');
  const [commercialEmail, setCommercialEmail] = useState('');
  const [expiryDays, setExpiryDays] = useState('7');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commercialName.trim() || !commercialEmail.trim()) {
      toast({
        variant: "destructive",
        title: "Campos requeridos",
        description: "Por favor, completa todos los campos",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Generar el token en Supabase
      const tokenData = await generateCommercialAccessToken(commercialName, parseInt(expiryDays));
      
      // Calcular la fecha de expiración
      const expiryDate = new Date(tokenData.expires_at);
      
      // Enviar el token por email
      const emailSent = await sendCommercialAccessToken(
        commercialEmail,
        commercialName,
        tokenData.token,
        expiryDate
      );
      
      if (emailSent) {
        toast({
          title: "Token enviado",
          description: `Se ha enviado un enlace de acceso a ${commercialEmail}`,
        });
        
        // Limpiar el formulario
        setCommercialName('');
        setCommercialEmail('');
        setExpiryDays('7');
      } else {
        toast({
          variant: "destructive",
          title: "Error al enviar email",
          description: "El token se generó correctamente pero no se pudo enviar el email",
        });
      }
    } catch (error) {
      console.error('Error al generar token:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ha ocurrido un error al generar el token de acceso",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Generar Acceso para Comercial</CardTitle>
        <CardDescription>
          Crea un enlace de acceso temporal para que un comercial pueda revisar y categorizar sus transacciones.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleGenerateToken} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="commercial-name">Nombre del Comercial</Label>
            <Input
              id="commercial-name"
              value={commercialName}
              onChange={(e) => setCommercialName(e.target.value)}
              placeholder="Ej. Juan Pérez"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="commercial-email">Email del Comercial</Label>
            <Input
              id="commercial-email"
              type="email"
              value={commercialEmail}
              onChange={(e) => setCommercialEmail(e.target.value)}
              placeholder="comercial@empresa.com"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="expiry-days">Días de validez</Label>
            <Select value={expiryDays} onValueChange={setExpiryDays}>
              <SelectTrigger id="expiry-days">
                <SelectValue placeholder="Selecciona los días de validez" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 día</SelectItem>
                <SelectItem value="3">3 días</SelectItem>
                <SelectItem value="7">7 días</SelectItem>
                <SelectItem value="14">14 días</SelectItem>
                <SelectItem value="30">30 días</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></span>
                Generando...
              </>
            ) : (
              'Generar y Enviar Enlace'
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center text-sm text-muted-foreground">
        El enlace será enviado directamente al email del comercial
      </CardFooter>
    </Card>
  );
};

export default CommercialTokenGenerator;
