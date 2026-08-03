import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './card';

interface ErrorCardProps {
    /** Título del error */
    title?: string;
    /** Mensaje descriptivo del error */
    message?: string;
    /** Callback para reintentar la operación */
    onRetry?: () => void;
    /** Mostrar botón de reintentar */
    showRetry?: boolean;
    /** Clase CSS adicional */
    className?: string;
}

/**
 * Card amigable para mostrar errores al usuario.
 * 
 * @example
 * ```tsx
 * <ErrorCard 
 *   title="Error de conexión"
 *   message="No pudimos cargar los datos"
 *   onRetry={() => refetch()}
 * />
 * ```
 */
export function ErrorCard({
    title = 'Ha ocurrido un error',
    message = 'No pudimos completar la operación. Por favor, intenta de nuevo.',
    onRetry,
    showRetry = true,
    className = '',
}: ErrorCardProps) {
    return (
        <Card className={`border-destructive/50 bg-destructive/5 ${className}`}>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">{message}</p>
            </CardContent>
            {showRetry && onRetry && (
                <CardFooter>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onRetry}
                        className="gap-2"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Reintentar
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}

export default ErrorCard;
