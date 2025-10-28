'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Edit, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock,
  Settings,
  AlertTriangle,
  Info
} from 'lucide-react';

export default function IntegrationsSettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simular carga
    setTimeout(() => setLoading(false), 1000);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Integraciones de Calendario</h1>
          <p className="text-gray-600 mt-2">Gestiona la sincronización de calendarios externos</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Agregar Calendario
        </Button>
      </div>

      {/* Información del plan */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Plan actual:</strong> Puedes gestionar hasta <strong>6</strong> propiedades.
          Tipos de calendario permitidos: iCal, Google.
        </AlertDescription>
      </Alert>

      {/* Placeholder para calendarios */}
      <Card>
        <CardHeader>
          <CardTitle>Sistema de Integraciones</CardTitle>
          <CardDescription>
            Próximamente podrás conectar calendarios externos como Airbnb, Booking.com y Google Calendar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              Integraciones en desarrollo
            </h3>
            <p className="text-gray-500">
              Estamos trabajando en la integración con calendarios externos.
              Pronto podrás sincronizar automáticamente tu disponibilidad.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Información sobre Integraciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Tipos de calendario soportados:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li><strong>iCal Feed:</strong> Compatible con Airbnb, Booking.com, Google Calendar y otros</li>
              <li><strong>Google Calendar:</strong> Sincronización directa con Google Calendar API</li>
              <li><strong>Airbnb:</strong> Integración con Airbnb Calendar Sync</li>
              <li><strong>Booking.com:</strong> Conecta con Booking.com Calendar</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Cómo funciona:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Los eventos externos bloquean automáticamente las fechas en tu propiedad</li>
              <li>Las reservas directas se sincronizan con tus calendarios externos</li>
              <li>Puedes configurar la frecuencia de sincronización según tus necesidades</li>
              <li>Los conflictos se resuelven según tu configuración preferida</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}