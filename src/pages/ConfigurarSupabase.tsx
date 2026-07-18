import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, Key, AlertCircle, Eye, EyeOff } from "lucide-react";
import { showSwal } from "@/components/ui/swal";

export default function ConfigurarSupabase() {
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Verificar si ya está configurado
    const url = localStorage.getItem("supabase_url");
    const key = localStorage.getItem("supabase_anon_key");
    
    if (url && key) {
      setConfigured(true);
      setSupabaseUrl(url);
      setSupabaseKey(key); // Mostrar clave completa para poder editarla
    }
  }, []);

  const handleSave = async () => {
    if (!supabaseUrl || !supabaseKey) {
      await showSwal({
        icon: "error",
        title: "Campos requeridos",
        text: "Debes completar la URL y la clave de Supabase",
      });
      return;
    }

    // Validar formato de URL
    try {
      new URL(supabaseUrl);
    } catch {
      await showSwal({
        icon: "error",
        title: "URL inválida",
        text: "La URL de Supabase no tiene un formato válido",
      });
      return;
    }

    // Validar que la clave no esté vacía y tenga una longitud razonable
    if (supabaseKey.length < 30) {
      await showSwal({
        icon: "error",
        title: "Clave inválida",
        text: "La clave anónima parece ser incorrecta. Verifica que sea la clave completa.",
      });
      return;
    }

    setLoading(true);

    try {
      // Guardar en localStorage
      localStorage.setItem("supabase_url", supabaseUrl.trim());
      localStorage.setItem("supabase_anon_key", supabaseKey.trim());
      
      await showSwal({
        icon: "success",
        title: "Configuración guardada",
        text: "La aplicación se recargará para aplicar los cambios",
        timer: 2000,
        showConfirmButton: false,
      });

      // Recargar la página para que tome la nueva configuración
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Error al guardar configuración:", error);
      await showSwal({
        icon: "error",
        title: "Error",
        text: "No se pudo guardar la configuración",
      });
      setLoading(false);
    }
  };

  const handleReset = async () => {
    const { isConfirmed } = await showSwal({
      icon: "warning",
      title: "Restablecer configuración",
      text: "Esto eliminará la configuración actual de Supabase. ¿Deseas continuar?",
      showCancelButton: true,
      confirmButtonText: "Sí, restablecer",
      cancelButtonText: "Cancelar",
    });

    if (isConfirmed) {
      localStorage.removeItem("supabase_url");
      localStorage.removeItem("supabase_anon_key");
      setConfigured(false);
      setSupabaseUrl("");
      setSupabaseKey("");
      
      await showSwal({
        icon: "success",
        title: "Configuración eliminada",
        text: "Puedes ingresar una nueva configuración",
        timer: 2000,
        showConfirmButton: false,
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Database className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-2xl">Configuración de Supabase</CardTitle>
              <CardDescription className="mt-1">
                Configura la conexión a tu instancia de Supabase
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {configured && (
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                Ya existe una configuración guardada. Si cambias estos valores, se actualizará la conexión a Supabase.
              </AlertDescription>
            </Alert>
          )}

          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              <strong>¿Dónde encontrar estos datos?</strong>
              <ol className="mt-2 ml-4 space-y-1 text-sm list-decimal">
                <li>Accede a tu proyecto en <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">Supabase Dashboard</a></li>
                <li>Ve a <strong>Settings → API</strong></li>
                <li>Copia la <strong>Project URL</strong> y la <strong>anon public key</strong></li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supabase-url" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                URL del Proyecto Supabase
              </Label>
              <Input
                id="supabase-url"
                type="url"
                placeholder="https://tuproyecto.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                disabled={loading}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Ejemplo: https://xyzabcdefgh.supabase.co
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supabase-key" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Clave Anónima (anon key)
              </Label>
              <div className="relative">
                <Input
                  id="supabase-key"
                  type={showPassword ? "text" : "password"}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  disabled={loading}
                  className="font-mono text-sm pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                La clave pública anónima de tu proyecto (empieza con &quot;eyJ...&quot;)
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={loading || !supabaseUrl || !supabaseKey}
              className="flex-1"
            >
              {loading ? "Guardando..." : configured ? "Actualizar configuración" : "Guardar configuración"}
            </Button>
            
            {configured && (
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={loading}
              >
                Restablecer
              </Button>
            )}
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-semibold text-sm mb-2">Próximos pasos:</h3>
            <ol className="text-sm text-muted-foreground space-y-1 ml-4 list-decimal">
              <li>Ejecuta el script SQL (<code className="text-xs bg-muted px-1 py-0.5 rounded">scripts/sistema_maestro_completo.sql</code>) en tu base de datos</li>
              <li>Configura las políticas RLS (Row Level Security) si es necesario</li>
              <li>Crea tu primer usuario desde la página de registro</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
