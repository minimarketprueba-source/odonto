import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Ambulance, Clock, Plus, Search, Stethoscope } from "lucide-react";
import { cn, matchPaciente, matchTexto } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { usePermissions } from "@/hooks/use-permissions";
import { RacForm } from "@/components/rac/rac-form";
import { fechaHoyISO } from "@/api/citas";
import {
  labelDestino, numeroRac, triaje as nivelTriaje, useFichasRac, type FichaRac,
} from "@/api/rac";

function fechaHaceDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const RANGOS = [
  { value: "hoy", label: "Hoy", dias: 0 },
  { value: "semana", label: "Última semana", dias: 7 },
  { value: "mes", label: "Último mes", dias: 30 },
] as const;

export default function Rac() {
  const { hasPermission } = usePermissions();
  const puedeAtender = hasPermission("consultas", "editar");

  const [rango, setRango] = useState<(typeof RANGOS)[number]["value"]>("hoy");
  const [busqueda, setBusqueda] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [seleccionada, setSeleccionada] = useState<FichaRac | null>(null);

  const dias = RANGOS.find((r) => r.value === rango)?.dias ?? 0;
  const { data: fichas = [], isLoading } = useFichasRac(fechaHaceDias(dias), fechaHoyISO());

  const busquedaDebounced = useDebounce(busqueda, 300);

  const filtradas = useMemo(() => {
    if (!busquedaDebounced.trim()) return fichas;
    return fichas.filter((f) => {
      if (f.paciente && matchPaciente(f.paciente, busquedaDebounced)) return true;
      return matchTexto(
        `${numeroRac(f.numero)} ${f.motivo_consulta || ""} ${f.diagnostico || ""}`,
        busquedaDebounced
      );
    });
  }, [fichas, busquedaDebounced]);

  const enEspera = filtradas.filter((f) => f.estado === "espera");
  const atendidas = filtradas.filter((f) => f.estado === "atendida");

  const abrir = (ficha: FichaRac | null) => {
    setSeleccionada(ficha);
    setFormOpen(true);
  };

  const tarjeta = (f: FichaRac) => {
    const nivel = nivelTriaje(f.triaje);
    const esperando = f.estado === "espera";
    return (
      <Card key={f.id} className={cn(esperando && f.triaje === "rojo" && "border-red-400")}>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold leading-tight truncate">
                {f.paciente ? `${f.paciente.apellidos}, ${f.paciente.nombres}` : "Paciente"}
              </p>
              <p className="text-xs text-muted-foreground">
                {numeroRac(f.numero)} · CI {f.paciente?.documento || "s/n"}
              </p>
            </div>
            {nivel && (
              <Badge className={cn("border flex-shrink-0", nivel.clase)}>
                {nivel.value.toUpperCase()}
              </Badge>
            )}
          </div>

          <p className="text-sm line-clamp-2">
            {f.motivo_consulta || <span className="text-muted-foreground">Sin motivo cargado</span>}
          </p>

          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {f.hora_admision?.slice(0, 5)}
            </span>
            {dias > 0 && <span>{f.fecha.split("-").reverse().join("/")}</span>}
            {!esperando && f.destino && (
              <Badge variant="outline">
                {labelDestino(f.destino)}
                {f.destino_dias ? ` · ${f.destino_dias} día${f.destino_dias === 1 ? "" : "s"}` : ""}
              </Badge>
            )}
          </div>

          <Button
            variant={esperando ? "default" : "outline"}
            size="sm"
            className="w-full gap-2"
            onClick={() => abrir(f)}
            disabled={esperando && !puedeAtender}
          >
            <Stethoscope className="w-4 h-4" />
            {esperando ? "Atender" : "Ver ficha"}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              Urgencias — Ficha de RAC{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({enEspera.length} en espera)
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Recepción, acogida y clasificación. Los más graves se atienden primero.
            </p>
          </div>
          {puedeAtender && (
            <Button className="gap-2" onClick={() => abrir(null)}>
              <Plus className="w-4 h-4" /> Nueva ficha
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por paciente, N° de ficha o motivo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            {RANGOS.map((r) => (
              <Button
                key={r.value}
                variant={rango === r.value ? "default" : "outline"}
                size="sm"
                onClick={() => setRango(r.value)}
              >
                {r.label}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground py-12">Cargando fichas...</p>
        ) : filtradas.length === 0 ? (
          <div className="text-center py-12">
            <Ambulance className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {busquedaDebounced
                ? `No se encontró ninguna ficha con «${busquedaDebounced}».`
                : "No hay fichas de RAC en este período."}
            </p>
            {puedeAtender && (
              <Button className="gap-2 mt-4" onClick={() => abrir(null)}>
                <Plus className="w-4 h-4" /> Abrir una ficha
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {enEspera.length > 0 && (
              <section>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                  En espera del médico ({enEspera.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {enEspera.map(tarjeta)}
                </div>
              </section>
            )}
            {atendidas.length > 0 && (
              <section>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                  Atendidas ({atendidas.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {atendidas.map(tarjeta)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <RacForm open={formOpen} onOpenChange={setFormOpen} ficha={seleccionada} />
    </AppLayout>
  );
}
