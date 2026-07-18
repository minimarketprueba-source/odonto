import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      // Supabase handled the code exchange automatically if detectSessionInUrl is true,
      // but we explicitly wait for the session to be sure.
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error("Error en el callback de autenticación:", error)
        navigate("/auth/login?error=callback_failed")
        return
      }

      if (session) {
        // Éxito: El usuario está autenticado
        navigate("/", { replace: true })
      } else {
        // No hay sesión: podría ser que el código expiró o ya se usó
        navigate("/auth/login")
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="text-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full blur-xl absolute inset-0 animate-pulse" />
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin relative z-10 mx-auto" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Verificando tu cuenta...</h2>
        <p className="text-slate-500 text-sm">Estamos procesando tu inicio de sesión. Un momento por favor.</p>
      </div>
    </div>
  )
}
