import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart2 } from "lucide-react";
import { useCitasRango, fechaHoyISO, ESTADOS_CITA } from "@/api/citas";

function inicioDeMes(): string {
  return `${fechaHoyISO().slice(0, 7)}-01`;
}

function Barra({ etiqueta, valor, max, color }: { etiqueta: string; valor: number; max: number; color?: string }) {
  const ancho = max > 0 ? Math.max(2, Math.round((valor / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="truncate mr-2">{etiqueta}</span>
        <span className="font-semibold">{valor}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${ancho}%`, backgroundColor: color || "hsl(var(--primary))" }}
        />
      </div>
    </div>
  );
}

export default function Reportes() {
  const [desde, setDesde] = useState(inicioDeMes());
  const [hasta, setHasta] = useState(fechaHoyISO());

  const { data: citas = [], isLoading } = useCitasRango(desde, hasta);

  const porEstado = useMemo(() => ESTADOS_CITA.map((e) => ({
    ...e,
    total: citas.filter((c) => c.estado === e.value).length,
  })), [citas]);

  const porEspecialidad = useMemo(() => {
    const mapa = new Map<string, { total: number; color: string | null }>();
    for (const c of citas) {
      const nombre = c.medico?.especialidad?.nombre ?? "Sin especialidad";
      const prev = mapa.get(nombre) ?? { total: 0, color: c.medico?.especialidad?.color ?? null };
      prev.total += 1;
      mapa.set(nombre, prev);
    }
    return [...mapa.entries()]
      .map(([nombre, v]) => ({ nombre, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [citas]);

  const topMedicos = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const c of citas) {
      const nombre = c.medico ? `${c.medico.apellidos}, ${c.medico.nombres}` : `Médico #${c.medico_id}`;
      mapa.set(nombre, (mapa.get(nombre) ?? 0) + 1);
    }
    return [...mapa.entries()]
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [citas]);

  const maxEstado = Math.max(1, ...porEstado.map((e) => e.total));
  const maxEsp = Math.max(1, ...porEspecialidad.map((e) => e.total));
  const maxMed = Math.max(1, ...topMedicos.map((m) => m.total));

  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" /> Reportes de citas
          </h2>
          <p className="text-sm text-muted-foreground">
            {citas.length} cita{citas.length !== 1 ? "s" : ""} en el rango seleccionado.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="r-desde">Desde</Label>
            <Input id="r-desde" type="date" className="w-40" value={desde} onChange={(e) => e.target.value && setDesde(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="r-hasta">Hasta</Label>
            <Input id="r-hasta" type="date" className="w-40" value={hasta} onChange={(e) => e.target.value && setHasta(e.target.value)} />
          </div>
        </div>

        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground py-12">Generando reporte...</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Citas por estado</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {porEstado.map((e) => (
                  <Barra key={e.value} etiqueta={e.label} valor={e.total} max={maxEstado} />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Por especialidad</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {porEspecialidad.length === 0
                  ? <p className="text-sm text-muted-foreground">Sin datos en el rango.</p>
                  : porEspecialidad.map((e) => (
                      <Barra key={e.nombre} etiqueta={e.nombre} valor={e.total} max={maxEsp} color={e.color || undefined} />
                    ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Citas por médico</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {topMedicos.length === 0
                  ? <p className="text-sm text-muted-foreground">Sin datos en el rango.</p>
                  : topMedicos.map((m) => (
                      <Barra key={m.nombre} etiqueta={m.nombre} valor={m.total} max={maxMed} />
                    ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
