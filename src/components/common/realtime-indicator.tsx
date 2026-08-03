import { Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RealtimeIndicatorProps {
  isConnected: boolean;
  className?: string;
}

export function RealtimeIndicator({ isConnected, className = "" }: RealtimeIndicatorProps) {
  if (!isConnected) {
    return (
      <Badge
        variant="outline"
        className={`gap-1.5 py-0.5 px-2 text-[11px] font-normal border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 ${className}`}
        title="Estableciendo conexión en tiempo real..."
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
        <span>Sincronizando...</span>
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`gap-1.5 py-0.5 px-2 text-[11px] font-medium border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 ${className}`}
      title="Sincronización instantánea en vivo activada"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <Radio className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
      <span>En vivo</span>
    </Badge>
  );
}
