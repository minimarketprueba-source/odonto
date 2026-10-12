import ReactDOM from 'react-dom/client'
import { HashRouter, BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import '../styles/globals.css'
import { AuthProvider } from './context/auth-context'
import { SidebarProvider } from './context/sidebar-context'
import { ThemeProvider } from '@/components/theme-provider'
import { queryClient } from '@/lib/query-client'
import { recargarUnaVez } from '@/lib/recarga-por-version'

// Vite avisa con este evento cuando no pudo bajar el archivo de una pantalla:
// casi siempre es porque se publicó una versión nueva con la app abierta y el
// archivo viejo ya no existe. Recargar trae los nombres nuevos (ver
// recarga-por-version.ts). Si ya se recargó hace menos de un minuto, se deja
// seguir el error para que lo muestre el ErrorBoundary.
window.addEventListener('vite:preloadError', (evento) => {
  if (recargarUnaVez()) evento.preventDefault()
})

// Detectar si estamos en Electron
const isElectron = typeof window !== 'undefined' && window.electron !== undefined
// Usar HashRouter en Electron, BrowserRouter en navegador web
const Router = isElectron ? HashRouter : BrowserRouter

// Mejorar accesibilidad global
function setupAccessibility() {
  // Observar cambios en aria-hidden para corregir problemas de foco
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
        const target = mutation.target as HTMLElement
        if (target.id === 'root' && target.getAttribute('aria-hidden') === 'true') {
          // Verificar si hay elementos focusables dentro
          const focusedElement = document.activeElement
          if (focusedElement && target.contains(focusedElement)) {
            // Si hay un elemento con foco dentro del contenedor oculto, mover el foco
            const swalContainer = document.querySelector('.swal2-container')
            if (swalContainer) {
              const confirmButton = swalContainer.querySelector('.swal2-confirm') as HTMLElement
              if (confirmButton) {
                confirmButton.focus()
              }
            }
          }
        }
      }
    })
  })

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['aria-hidden'],
    subtree: true
  })
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupAccessibility)
} else {
  setupAccessibility()
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <Router>
      <AuthProvider>
        <ThemeProvider defaultTheme="system">
          <SidebarProvider>
            <App />
          </SidebarProvider>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  </QueryClientProvider>,
)
