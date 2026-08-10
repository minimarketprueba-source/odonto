import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      // Supabase handled the code exchange automatically if detectSessionInUrl is true,
      // but we explicitly wait for the session to be sure.
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        console.error('Error en el callback de autenticación:', error)
        navigate('/auth/login?error=callback_failed')
        return
      }

      if (session) {
        // Éxito: El usuario está autenticado
        navigate('/', { replace: true })
      } else {
        // No hay sesión: podría ser que el código expiró o ya se usó
        navigate('/auth/login')
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground">
      <div className="space-y-4 text-center">
        <div className="relative">
          <div className="absolute inset-0 h-16 w-16 animate-pulse rounded-full bg-blue-500/10 blur-xl" />
          <Loader2 className="relative z-10 mx-auto h-12 w-12 animate-spin text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Verificando tu cuenta...</h2>
        <p className="text-sm text-muted-foreground">
          Estamos procesando tu inicio de sesión. Un momento por favor.
        </p>
      </div>
    </div>
  )
}
