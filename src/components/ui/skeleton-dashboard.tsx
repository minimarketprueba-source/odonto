import { Skeleton } from './skeleton';
import { Card, CardContent, CardHeader } from './card';

/**
 * Skeleton para cards de estadísticas del dashboard
 */
export function SkeletonStatsCard() {
    return (
        <Card className="border border-border/50">
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    {/* Icono */}
                    <Skeleton className="h-10 w-10 rounded-full" />
                    {/* Texto */}
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                    {/* Valor */}
                    <Skeleton className="h-6 w-12" />
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * Skeleton para el gráfico de pie del dashboard
 */
export function SkeletonPieChart() {
    return (
        <div className="flex flex-col items-center justify-center space-y-4 p-8">
            {/* Círculo del gráfico */}
            <Skeleton className="h-48 w-48 rounded-full" />
            {/* Toggle buttons */}
            <div className="flex gap-2">
                <Skeleton className="h-8 w-28 rounded-md" />
                <Skeleton className="h-8 w-24 rounded-md" />
            </div>
        </div>
    );
}

/**
 * Skeleton para filas de tabla
 */
export function SkeletonTableRow() {
    return (
        <div className="flex items-center gap-4 p-4 border-b">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-8 rounded" />
        </div>
    );
}

/**
 * Skeleton para tabla completa
 */
export function SkeletonTable({ rows = 5 }: { rows?: number }) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="p-0">
                {/* Header */}
                <div className="flex items-center gap-4 p-4 border-b bg-muted/30">
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                </div>
                {/* Rows */}
                {Array.from({ length: rows }).map((_, i) => (
                    <SkeletonTableRow key={i} />
                ))}
            </CardContent>
        </Card>
    );
}

/**
 * Skeleton para card con gráfico de líneas
 */
export function SkeletonLineChart() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
                <div className="h-[200px] flex items-end gap-2 px-4">
                    {/* Barras simulando gráfico */}
                    {Array.from({ length: 12 }).map((_, i) => (
                        <Skeleton
                            key={i}
                            className="flex-1 rounded-t"
                            style={{ height: `${Math.random() * 60 + 40}%` }}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * Skeleton completo del Dashboard
 */
export function SkeletonDashboard() {
    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-32" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonStatsCard key={i} />
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-56" />
                    </CardHeader>
                    <CardContent>
                        <SkeletonPieChart />
                    </CardContent>
                    <div className="px-6 pb-6 grid grid-cols-2 gap-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <SkeletonStatsCard key={i} />
                        ))}
                    </div>
                </Card>
                <SkeletonLineChart />
            </div>

            {/* Table */}
            <SkeletonTable rows={5} />
        </div>
    );
}

export default SkeletonDashboard;
