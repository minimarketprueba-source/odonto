import * as Sentry from '@sentry/react'
import { BrowserTracing } from '@sentry/tracing'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
const ENVIRONMENT = import.meta.env.MODE

// Inicializar Sentry
export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured')
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    integrations: [
      new BrowserTracing(),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Performance Monitoring
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Filtrar errores conocidos
    beforeSend(event, _hint) {
      // Ignorar errores de extensiones de navegador
      if (event.exception) {
        const errorMessage = event.exception.values?.[0]?.value
        if (errorMessage?.includes('chrome-extension://')) {
          return null
        }
      }
      return event
    },

    // Agregar contexto del usuario
    beforeBreadcrumb(breadcrumb) {
      // No capturar console.log en producción
      if (breadcrumb.category === 'console' && ENVIRONMENT === 'production') {
        return null
      }
      return breadcrumb
    },
  })
}

// Capturar error manualmente
export function captureError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context,
  })

  // Log en desarrollo
  if (import.meta.env.DEV) {
    console.error('Error captured:', error, context)
  }
}

// Capturar mensaje
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level)
}

// Set user context
export function setUserContext(user: { id: string; email?: string; role?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
  })
}

// Clear user context (logout)
export function clearUserContext() {
  Sentry.setUser(null)
}

// Add breadcrumb
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  })
}

// Performance tracking
export function startTransaction(name: string, op: string) {
  return Sentry.startTransaction({ name, op })
}

// Error boundary component
export const SentryErrorBoundary = Sentry.ErrorBoundary

// Wrapper para componentes con Sentry
export function withSentry<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  return Sentry.withProfiler(Component, { name: componentName })
}
