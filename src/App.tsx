import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, useEffect, useState } from 'react'
import { HelmetProvider } from 'react-helmet-async'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { isSupabaseConfigured } from "@/lib/supabase"
import { Toaster } from "@/components/ui/toaster"
import { useAuth } from "@/context/auth-context"

// Componente para redirigir usuarios logueados fuera de rutas de auth
function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }
  if (user) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

// Lazy load de páginas para mejor rendimiento
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Login = lazy(() => import('./pages/Login'))
const SignUp = lazy(() => import('./pages/SignUp'))
const SignUpSuccess = lazy(() => import('./pages/SignUpSuccess'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))

const Pacientes = lazy(() => import('./pages/Pacientes'))
const Citas = lazy(() => import('./pages/Citas'))
const Horarios = lazy(() => import('./pages/Horarios'))
const Enfermeria = lazy(() => import('./pages/Enfermeria'))
const Rac = lazy(() => import('./pages/Rac'))
const PerfilUsuario = lazy(() => import('./pages/PerfilUsuario'))
const ListaEspera = lazy(() => import('./pages/ListaEspera'))
const Reportes = lazy(() => import('./pages/Reportes'))
const Mantenimiento = lazy(() => import('./pages/Mantenimiento'))
const Usuarios = lazy(() => import('./pages/Usuarios'))
const ConfirmarCorreo = lazy(() => import('./pages/ConfirmarCorreo'))
const ConfigurarSupabase = lazy(() => import('./pages/ConfigurarSupabase'))
const AuthCallback = lazy(() => import('./pages/AuthCallback'))

function App() {
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    const isConfigured = isSupabaseConfigured();
    setConfigured(isConfigured);
  }, []);

  // Mostrar loader mientras se verifica la configuración
  if (configured === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0' }}>
        <div className="text-center" style={{ textAlign: 'center' }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" style={{ width: '48px', height: '48px', border: '2px solid #3b82f6', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }}></div>
          <p className="text-muted-foreground" style={{ color: '#666' }}>Verificando configuración...</p>
        </div>
      </div>
    );
  }

  // Si no está configurado, mostrar solo la página de configuración
  if (!configured) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff' }}>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="text-center" style={{ textAlign: 'center' }}>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" style={{ width: '48px', height: '48px', border: '2px solid #3b82f6', borderRadius: '50%', margin: '0 auto 16px' }}></div>
              <p className="text-muted-foreground" style={{ color: '#666' }}>Cargando...</p>
            </div>
          </div>
        }>
          <ConfigurarSupabase />
        </Suspense>
      </div>
    );
  }

  return (
    <HelmetProvider>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando aplicación...</p>
          </div>
        </div>
      }>
        <Routes>
          <Route path="/configurar-supabase" element={<ConfigurarSupabase />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/login" element={<AuthRedirect><Login /></AuthRedirect>} />
          <Route path="/auth/sign-up" element={<AuthRedirect><SignUp /></AuthRedirect>} />
          <Route path="/auth/sign-up-success" element={<AuthRedirect><SignUpSuccess /></AuthRedirect>} />
          <Route path="/auth/forgot-password" element={<AuthRedirect><ForgotPassword /></AuthRedirect>} />
          <Route path="/auth/reset-password" element={<AuthRedirect><ResetPassword /></AuthRedirect>} />
          <Route path="/pacientes" element={<ProtectedRoute moduleKey="pacientes"><Pacientes /></ProtectedRoute>} />
          <Route path="/citas" element={<ProtectedRoute moduleKey="citas"><Citas /></ProtectedRoute>} />
          <Route path="/horarios" element={<ProtectedRoute moduleKey="citas"><Horarios /></ProtectedRoute>} />
          <Route path="/enfermeria" element={<ProtectedRoute moduleKey="consultas"><Enfermeria /></ProtectedRoute>} />
          <Route path="/rac" element={<ProtectedRoute moduleKey="consultas"><Rac /></ProtectedRoute>} />
          <Route path="/perfil" element={<ProtectedRoute><PerfilUsuario /></ProtectedRoute>} />
          <Route path="/lista-espera" element={<ProtectedRoute moduleKey="lista_espera"><ListaEspera /></ProtectedRoute>} />
          <Route path="/reportes" element={<ProtectedRoute moduleKey="reportes"><Reportes /></ProtectedRoute>} />
          <Route path="/mantenimiento" element={<ProtectedRoute moduleKey="mantenimiento"><Mantenimiento /></ProtectedRoute>} />
          <Route path="/usuarios" element={<ProtectedRoute moduleKey="usuarios"><Usuarios /></ProtectedRoute>} />
          <Route path="/confirmar-correo" element={<ConfirmarCorreo />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Toaster />
    </HelmetProvider>
  )
}

export default App
