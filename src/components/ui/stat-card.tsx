import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  icon?: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

function StatCardComponent({
  title,
  value,
  description,
  trend,
  icon,
  variant = 'default',
}: StatCardProps) {
  const variantColors = {
    default: 'text-primary',
    success: 'text-green-600',
    warning: 'text-orange-600 dark:text-orange-400',
    danger: 'text-red-600',
  }

  const trendIcon = trend
    ? trend.value > 0
      ? <ArrowUp className="h-4 w-4" />
      : trend.value < 0
      ? <ArrowDown className="h-4 w-4" />
      : <Minus className="h-4 w-4" />
    : null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${variantColors[variant]}`}>
          {value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <Badge
              variant={trend.isPositive ? 'default' : 'destructive'}
              className="text-xs"
            >
              {trendIcon}
              {Math.abs(trend.value)}%
            </Badge>
            <span className="text-xs text-muted-foreground">vs mes anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export const StatCard = memo(StatCardComponent)
StatCard.displayName = 'StatCard'
