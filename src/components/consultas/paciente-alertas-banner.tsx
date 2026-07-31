import { useMemo } from "react";
import { AlertCircle, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFichasRacPaciente } from "@/api/rac";

interface PacienteAlertasBannerProps {
  pacienteId: number | null;
  className?: string;
}

export function PacienteAlertasBanner({ pacienteId, className = "" }: PacienteAlertasBannerProps) {
  const { data: fichasRac = [] } = useFichasRacPaciente(pacienteId);

  const { alergias, patologias } = useMemo(() => {
    const listaAlergias = new Set<string>();
    const listaPatologias = new Set<string>();

    for (const f of fichasRac) {
      if (f.alergias && f.alergias.trim()) {
        listaAlergias.add(f.alergias.trim());
      }
      if (f.patologia_previa && f.patologia_previa.trim()) {
        listaPatologias.add(f.patologia_previa.trim());
      }
    }

    return {
      alergias: Array.from(listaAlergias),
      patologias: Array.from(listaPatologias),
    };
  }, [fichasRac]);

  if (alergias.length === 0 && patologias.length === 0) {
    return null;
  }

  return (
    <div
      className={`rounded-lg border p-3 text-xs space-y-1.5 transition-all ${
        alergias.length > 0
          ? "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
          : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
      } ${className}`}
    >
      <div className="flex items-center gap-2 font-bold uppercase tracking-wide">
        {alergias.length > 0 ? (
          <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 animate-pulse flex-shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        )}
        <span>ALERTAS CLÍNICAS Y ANTECEDENTES DEL PACIENTE</span>
      </div>

      {alergias.length > 0 && (
        <div className="flex items-start gap-1.5 flex-wrap">
          <span className="font-semibold text-red-800 dark:text-red-300 flex-shrink-0">
            ⚠️ ALERGIAS CONOCIDAS:
          </span>
          {alergias.map((a, i) => (
            <Badge
              key={i}
              className="bg-red-600 text-white hover:bg-red-700 font-bold border-0"
            >
              {a}
            </Badge>
          ))}
        </div>
      )}

      {patologias.length > 0 && (
        <div className="flex items-start gap-1.5 flex-wrap">
          <span className="font-semibold text-amber-800 dark:text-amber-300 flex-shrink-0">
            📋 PATOLOGÍAS PREVIAS / CRÓNICAS:
          </span>
          {patologias.map((p, i) => (
            <Badge
              key={i}
              variant="outline"
              className="border-amber-500 text-amber-950 bg-amber-100/80 dark:bg-amber-900/40 dark:text-amber-200 font-medium"
            >
              {p}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
