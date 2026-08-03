import { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorCard } from './error-card';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    /** Nombre del componente para logging */
    componentName?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary reutilizable para capturar errores en el árbol de componentes.
 * 
 * @example
 * ```tsx
 * <ErrorBoundary componentName="Dashboard" onError={logError}>
 *   <DashboardContent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log del error
        console.error(`[ErrorBoundary${this.props.componentName ? `:${this.props.componentName}` : ''}]`, error, errorInfo);

        // Callback opcional para enviar a servicio de monitoreo (e.g., Sentry)
        this.props.onError?.(error, errorInfo);
    }

    handleRetry = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Si se proporciona un fallback personalizado, usarlo
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Fallback por defecto: ErrorCard
            return (
                <ErrorCard
                    title="Algo salió mal"
                    message={this.state.error?.message || 'Ha ocurrido un error inesperado'}
                    onRetry={this.handleRetry}
                />
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
