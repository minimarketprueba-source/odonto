import { useEffect, useState } from 'react';
import { AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

/**
 * Si el error es de red (el pedido nunca llegó al servidor) y no una respuesta
 * del servidor. PostgREST siempre devuelve un `code`; un fetch que no sale, no.
 */
function esFalloDeRed(error: { code?: string; message?: string }): boolean {
  const mensaje = error.message ?? '';
  return (
    mensaje.includes('Failed to fetch') ||
    mensaje.includes('NetworkError') ||
    mensaje.includes('ERR_CONNECTION') ||
    error.code === 'ERR_CONNECTION_REFUSED'
  );
}

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(true);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkSupabaseConnection();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowAlert(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificar conexión inicial
    checkSupabaseConnection();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkSupabaseConnection = async () => {
    try {
      // Se consulta `especialidades`, un catálogo chico de este sistema. Antes
      // preguntaba por `config_peso`, que es de Control-Peso y no existe acá:
      // el servidor contestaba 404 y la app mostraba "no se puede conectar con
      // la base de datos" a todo el mundo apenas entraba, siendo que la
      // conexión estaba perfecta.
      const { error } = await supabase
        .from('especialidades')
        .select('id', { head: true, count: 'exact' })
        .limit(1);

      // Si el servidor contestó algo —aunque sea un error de tabla o de
      // permisos— hay conexión. Solo un fallo de red real (fetch que ni sale)
      // significa estar desconectado, y eso cae en el catch.
      if (error && esFalloDeRed(error)) {
        console.error('Error conectando con Supabase:', error);
        setIsSupabaseConnected(false);
        setShowAlert(true);
        return;
      }

      if (error) {
        // La base respondió con un problema propio (permisos, tabla, etc.).
        // Se registra para poder diagnosticarlo, pero no es un corte de red.
        console.warn('La base respondió con un error (hay conexión):', error.message);
      }
      setIsSupabaseConnected(true);
      setShowAlert(false);
    } catch (error) {
      console.error('Error de red:', error);
      setIsSupabaseConnected(false);
      setShowAlert(true);
    }
  };

  const handleRetry = () => {
    checkSupabaseConnection();
  };

  const handleDismiss = () => {
    setShowAlert(false);
  };

  if (!showAlert) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Alert variant="destructive" className="bg-red-50 border-red-200">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
            <span className="font-medium">
              {!isOnline 
                ? 'Sin conexión a internet' 
                : !isSupabaseConnected 
                  ? 'Problema de conectividad con el servidor'
                  : 'Error de conexión'
              }
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground">
            {!isOnline
              ? 'Verifica tu conexión a internet y vuelve a intentar.'
              : !isSupabaseConnected
                ? 'No se puede conectar con la base de datos. Algunos datos pueden estar desactualizados.'
                : 'Hubo un problema temporal. Los datos se sincronizarán automáticamente cuando se restablezca la conexión.'
            }
          </p>
          
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleRetry}
              className="text-xs"
            >
              Reintentar
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleDismiss}
              className="text-xs"
            >
              Ocultar
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}