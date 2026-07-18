import { Suspense, ComponentType } from 'react'

interface LoadingFallbackProps {
  message?: string
  minHeight?: string
}

function LoadingFallback({ message = 'Cargando...', minHeight = '200px' }: LoadingFallbackProps) {
  return (
    <div className="flex items-center justify-center" style={{ minHeight }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

interface LazyLoadProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function LazyLoad({ children, fallback }: LazyLoadProps) {
  return (
    <Suspense fallback={fallback || <LoadingFallback />}>
      {children}
    </Suspense>
  )
}

export function withLazyLoad<P extends object>(
  Component: ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function LazyLoadedComponent(props: P) {
    return (
      <Suspense fallback={fallback || <LoadingFallback />}>
        <Component {...props} />
      </Suspense>
    )
  }
}

export { LoadingFallback }
