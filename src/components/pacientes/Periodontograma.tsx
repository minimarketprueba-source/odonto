import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Printer, Droplet, History, Info } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { fechaHoyISO } from "@/api/citas";
import { useMiMedico } from "@/api/citas";
import {
  type Sitio,
  type DatosPeriodontograma,
  type DatosDiente,
  resumirPeriodontograma,
  usePeriodontogramas,
  useGuardarPeriodontograma,
} from "@/api/periodontograma";
import { imprimirPeriodontograma } from "@/lib/imprimir";
import { DienteFigura } from "@/components/odontograma/diente-figura";
import { calcularNIC } from "@/api/periodontograma";

interface PeriodontogramaProps {
  pacienteId: string;
  pacienteNombre?: string;
  pacienteDocumento?: string | null;
}

// Notación FDI. Cada arcada se recorre como se mira al paciente de frente.
const SUP = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const INF = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

/** Los tres sitios de cada cara, para cargarlos juntos. */
const SITIOS_VESTIBULAR: Sitio[] = ["mv", "v", "dv"];
const SITIOS_PALATINO: Sitio[] = ["mp", "p", "dp"];

function dienteVacio(): DatosDiente {
  return { sitios: {}, movilidad: null, furca: null };
}

/** Color de fondo según la profundidad: es la lectura rápida del periodontograma. */
function colorPS(ps?: number | null): string {
  // Sin medir: acompaña el tema. Antes quedaba con el fondo blanco del
  // navegador y, en modo oscuro, la arcada era un muro de cuadritos brillantes.
  if (ps === null || ps === undefined) return "bg-background text-foreground";
  if (ps >= 6) return "bg-red-500/90 text-white dark:bg-red-600";              // bolsa profunda
  if (ps >= 4) return "bg-amber-200 text-amber-900 dark:bg-amber-700 dark:text-amber-50"; // moderada
  return "bg-emerald-100 text-emerald-900 dark:bg-emerald-800 dark:text-emerald-50";      // normal
}

export function Periodontograma({ pacienteId, pacienteNombre, pacienteDocumento }: PeriodontogramaProps) {
  const { user } = useAuth();
  const { data: miMedico } = useMiMedico(user?.id);
  const { data: anteriores = [] } = usePeriodontogramas(pacienteId);
  const guardar = useGuardarPeriodontograma();

  const [datos, setDatos] = useState<DatosPeriodontograma>({ dientes: {} });
  const [observaciones, setObservaciones] = useState("");
  const [sinGuardar, setSinGuardar] = useState(false);

  const ultimo = anteriores[0];

  // Se parte del último sondaje cargado: en un control periodontal casi todo se
  // repite y solo cambian algunos sitios, así que copiarlo ahorra rehacer 192
  // mediciones a mano. Queda como borrador hasta que se guarde.
  useEffect(() => {
    if (ultimo?.datos_json?.dientes && !sinGuardar) {
      setDatos({ dientes: JSON.parse(JSON.stringify(ultimo.datos_json.dientes)) });
    }
  }, [ultimo?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const resumen = useMemo(() => resumirPeriodontograma(datos), [datos]);

  const dienteDe = (n: number): DatosDiente => datos.dientes[String(n)] ?? dienteVacio();

  const actualizarDiente = (n: number, cambio: Partial<DatosDiente>) => {
    setSinGuardar(true);
    setDatos((prev) => ({
      dientes: {
        ...prev.dientes,
        [String(n)]: { ...dienteVacio(), ...prev.dientes[String(n)], ...cambio },
      },
    }));
  };

  const actualizarSitio = (
    n: number,
    sitio: Sitio,
    cambio: Partial<{ ps: number | null; rec: number | null; sangra: boolean; placa: boolean; pus: boolean }>
  ) => {
    setSinGuardar(true);
    setDatos((prev) => {
      const actual = prev.dientes[String(n)] ?? dienteVacio();
      return {
        dientes: {
          ...prev.dientes,
          [String(n)]: {
            ...actual,
            sitios: { ...actual.sitios, [sitio]: { ...actual.sitios?.[sitio], ...cambio } },
          },
        },
      };
    });
  };

  const handleGuardar = async () => {
    if (resumen.sitiosMedidos === 0) {
      toast.error("Cargue al menos una profundidad de sondaje antes de guardar.");
      return;
    }
    try {
      await guardar.mutateAsync({
        pacienteId,
        medicoId: miMedico?.id ?? null,
        fecha: fechaHoyISO(),
        datos,
        observaciones: observaciones.trim() || null,
      });
      setSinGuardar(false);
      toast.success("Periodontograma guardado en la historia clínica.");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleImprimir = () => {
    imprimirPeriodontograma({
      pacienteNombre: pacienteNombre ?? "—",
      pacienteDocumento,
      fecha: new Date().toLocaleDateString("es-PY"),
      profesional: miMedico ? `${miMedico.apellidos}, ${miMedico.nombres}` : null,
      arcadas: [
        { titulo: "Arcada superior", dientes: SUP.map((n) => ({ numero: n, datos: dienteDe(n) })) },
        { titulo: "Arcada inferior", dientes: INF.map((n) => ({ numero: n, datos: dienteDe(n) })) },
      ],
      resumen,
      observaciones: observaciones.trim() || null,
    });
  };

  const columnas = { gridTemplateColumns: "148px repeat(16, minmax(62px, 1fr))" };

  /** Planilla periodontal por arcada, inspirada en el formato clínico convencional. */
  const ArcadaClinica = ({ titulo, dientes }: { titulo: string; dientes: number[] }) => {
    const Fila = ({ etiqueta, children, tono = "" }: { etiqueta: string; children: (n: number) => React.ReactNode; tono?: string }) => (
      <div className={`grid min-w-[1140px] ${tono}`} style={columnas}>
        <div className="flex items-center justify-end border border-border bg-muted/60 px-2 text-right text-[11px] font-bold leading-tight">{etiqueta}</div>
        {dientes.map((n) => <div key={n} className="flex min-h-8 items-center justify-center border border-border bg-card px-0.5">{children(n)}</div>)}
      </div>
    );

    const SelectDiente = ({ numero, campo, etiqueta }: { numero: number; campo: "movilidad" | "furca"; etiqueta: string }) => {
      const d = dienteDe(numero);
      return (
        <select
          aria-label={`Pieza ${numero}, ${etiqueta}`}
          className="h-6 w-11 rounded border bg-background text-center text-[11px]"
          value={d[campo] ?? ""}
          onChange={(e) => actualizarDiente(numero, { [campo]: e.target.value === "" ? null : Number(e.target.value) })}
        >
          <option value="">—</option><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option>
        </select>
      );
    };

    const ValoresSitio = ({ numero, sitios, campo }: { numero: number; sitios: Sitio[]; campo: "ps" | "rec" | "nic" }) => {
      const d = dienteDe(numero);
      return <div className="flex gap-px">{sitios.map((s) => {
        const medicion = d.sitios?.[s];
        const nic = calcularNIC(medicion);
        if (campo === "nic") return <span key={s} className="flex h-6 w-[18px] items-center justify-center rounded-sm bg-slate-100 text-[10px] font-bold tabular-nums dark:bg-slate-800">{nic ?? ""}</span>;
        const valor = campo === "ps" ? medicion?.ps : medicion?.rec;
        return <input key={s} type="number" min={campo === "ps" ? 0 : -15} max={15} inputMode="numeric"
          aria-label={`Pieza ${numero}, sitio ${s}, ${campo === "ps" ? "profundidad de sondaje" : "margen gingival"}`}
          className={`h-6 w-[18px] rounded-sm border text-center text-[10px] tabular-nums outline-none focus:ring-1 focus:ring-primary ${campo === "ps" ? colorPS(medicion?.ps) : "bg-background"}`}
          value={valor ?? ""}
          onChange={(e) => { const v = e.target.value; actualizarSitio(numero, s, { [campo]: v === "" ? null : Math.min(15, Math.max(campo === "ps" ? 0 : -15, Number(v))) }); }} />;
      })}</div>;
    };

    const MarcasSitio = ({ numero, sitios, campo, simbolo, color }: { numero: number; sitios: Sitio[]; campo: "sangra" | "placa" | "pus"; simbolo: string; color: string }) => {
      const d = dienteDe(numero);
      return <div className="flex gap-1">{sitios.map((s) => {
        const activo = !!d.sitios?.[s]?.[campo];
        return <button key={s} type="button" onClick={() => actualizarSitio(numero, s, { [campo]: !activo })}
          aria-label={`Pieza ${numero}, sitio ${s}, ${campo}`} className={`flex h-5 w-5 items-center justify-center rounded-sm border text-[9px] font-black ${activo ? color : "bg-background text-muted-foreground/30"}`}>{simbolo}</button>;
      })}</div>;
    };

    const SangradoSupuracion = ({ numero, sitios }: { numero: number; sitios: Sitio[] }) => {
      const d = dienteDe(numero);
      return <div className="flex gap-0.5">{sitios.map((s) => {
        const m = d.sitios?.[s];
        return <div key={s} className="flex flex-col gap-px">
          <button type="button" title="Sangrado al sondaje" onClick={() => actualizarSitio(numero, s, { sangra: !m?.sangra })} className={`flex h-[11px] w-5 items-center justify-center rounded-sm border text-[8px] font-black ${m?.sangra ? "border-red-600 bg-red-600 text-white" : "bg-background text-muted-foreground/30"}`}>S</button>
          <button type="button" title="Supuración" onClick={() => actualizarSitio(numero, s, { pus: !m?.pus })} className={`flex h-[11px] w-5 items-center justify-center rounded-sm border text-[8px] font-black ${m?.pus ? "border-amber-600 bg-amber-500 text-white" : "bg-background text-muted-foreground/30"}`}>U</button>
        </div>;
      })}</div>;
    };

    const Dientes = ({ cara, invertido = false }: { cara: string; invertido?: boolean }) => (
      <div className="grid min-w-[1140px]" style={columnas}>
        <div className="flex items-center justify-end border-x border-border bg-muted/60 px-2 text-right text-[11px] font-bold">{cara}</div>
        {dientes.map((n) => {
          const d = dienteDe(n);
          return <div key={n} className={`flex h-20 items-center justify-center border-x border-border bg-card ${d.ausente ? "opacity-35" : ""}`}>
            <DienteFigura numero={n} color="transparent" tachado={d.ausente} className={`h-[72px] w-[52px] ${invertido ? "rotate-180" : ""}`} />
          </div>;
        })}
      </div>
    );

    return (
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <div className="min-w-[1140px] bg-violet-800 px-3 py-1 text-center text-xs font-extrabold uppercase tracking-wider text-white">{titulo}</div>
        <div className="grid min-w-[1140px]" style={columnas}>
          <div className="border border-border bg-muted/60" />
          {dientes.map((n) => <button key={n} type="button" onClick={() => actualizarDiente(n, { ausente: !dienteDe(n).ausente })} title="Clic: marcar pieza ausente/presente" className="border border-border bg-slate-100 py-1 text-xs font-extrabold tabular-nums hover:bg-primary/10 dark:bg-slate-900">{n}</button>)}
        </div>
        <Fila etiqueta="Implante">{(n) => <button type="button" onClick={() => actualizarDiente(n, { implante: !dienteDe(n).implante })} className={`h-5 w-8 rounded border text-[10px] font-bold ${dienteDe(n).implante ? "border-violet-600 bg-violet-100 text-violet-800 dark:bg-violet-900" : "bg-background text-muted-foreground"}`}>{dienteDe(n).implante ? "Sí" : "—"}</button>}</Fila>
        <Fila etiqueta="Movilidad">{(n) => <SelectDiente numero={n} campo="movilidad" etiqueta="movilidad" />}</Fila>
        <Fila etiqueta="Furca">{(n) => <SelectDiente numero={n} campo="furca" etiqueta="furca" />}</Fila>
        <Fila etiqueta="Sangrado / supuración">{(n) => <SangradoSupuracion numero={n} sitios={SITIOS_VESTIBULAR} />}</Fila>
        <Fila etiqueta="Placa">{(n) => <MarcasSitio numero={n} sitios={SITIOS_VESTIBULAR} campo="placa" simbolo="P" color="border-blue-600 bg-blue-600 text-white" />}</Fila>
        <Fila etiqueta="Margen gingival">{(n) => <ValoresSitio numero={n} sitios={SITIOS_VESTIBULAR} campo="rec" />}</Fila>
        <Fila etiqueta="Profundidad de sondaje">{(n) => <ValoresSitio numero={n} sitios={SITIOS_VESTIBULAR} campo="ps" />}</Fila>
        <Fila etiqueta="Nivel de inserción">{(n) => <ValoresSitio numero={n} sitios={SITIOS_VESTIBULAR} campo="nic" />}</Fila>
        <Dientes cara="Vestibular" />
        <Dientes cara="Palatino / lingual" invertido />
        <Fila etiqueta="Nivel de inserción">{(n) => <ValoresSitio numero={n} sitios={SITIOS_PALATINO} campo="nic" />}</Fila>
        <Fila etiqueta="Profundidad de sondaje">{(n) => <ValoresSitio numero={n} sitios={SITIOS_PALATINO} campo="ps" />}</Fila>
        <Fila etiqueta="Margen gingival">{(n) => <ValoresSitio numero={n} sitios={SITIOS_PALATINO} campo="rec" />}</Fila>
        <Fila etiqueta="Placa">{(n) => <MarcasSitio numero={n} sitios={SITIOS_PALATINO} campo="placa" simbolo="P" color="border-blue-600 bg-blue-600 text-white" />}</Fila>
        <Fila etiqueta="Sangrado / supuración">{(n) => <SangradoSupuracion numero={n} sitios={SITIOS_PALATINO} />}</Fila>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Periodontograma</h3>
          <p className="text-sm text-muted-foreground">
            Profundidad de sondaje, sangrado, placa, movilidad y furca.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleImprimir}>
            <Printer className="w-4 h-4" /> Imprimir
          </Button>
          <Button onClick={handleGuardar} size="sm" className="gap-2" disabled={guardar.isPending}>
            {guardar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </Button>
        </div>
      </div>

      {sinGuardar && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40 px-3 py-2 text-sm text-sky-900 dark:text-sky-200">
          Hay mediciones sin guardar. Se pierden si sale de la ficha sin apretar <strong>Guardar</strong>.
        </div>
      )}

      {/* La referencia tiene que estar a la vista mientras se sondea */}
      <div className="flex flex-wrap items-center gap-4 text-xs bg-muted/40 rounded-lg px-3 py-2">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-sm border bg-emerald-100 dark:bg-emerald-800" /> 1-3 mm
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-sm border bg-amber-200 dark:bg-amber-700" /> 4-5 mm
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-sm border bg-red-500/90 dark:bg-red-600" /> 6 mm o más
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-600" /> sangrado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-600" /> placa
        </span>
        <span className="text-muted-foreground">
          S = sangrado · P = placa · clic en el número del diente = ausente · margen gingival admite valores negativos
        </span>
      </div>

      <Card className="border-0 ring-1 ring-border/50">
        <CardContent className="p-3 space-y-5">
          <ArcadaClinica titulo="Superior · vestibular y palatino" dientes={SUP} />
          <ArcadaClinica titulo="Inferior · vestibular y lingual" dientes={INF} />
        </CardContent>
      </Card>

      {/* Índices: lo que se mira para decidir el tratamiento */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { etiqueta: "Sitios medidos", valor: String(resumen.sitiosMedidos), color: "text-foreground" },
          { etiqueta: "Sangrado", valor: `${resumen.porcentajeSangrado}%`, color: "text-red-600" },
          { etiqueta: "Placa", valor: `${resumen.porcentajePlaca}%`, color: "text-blue-600" },
          { etiqueta: "Bolsas 4-5 mm", valor: String(resumen.bolsas4a5), color: "text-amber-700 dark:text-amber-400" },
          { etiqueta: "Bolsas ≥6 mm", valor: String(resumen.bolsas6omas), color: "text-red-600" },
          { etiqueta: "PS promedio", valor: `${resumen.psPromedio} mm`, color: "text-foreground" },
        ].map((i) => (
          <div key={i.etiqueta} className="rounded-lg border bg-card p-2.5 text-center">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">{i.etiqueta}</p>
            <p className={`text-lg font-extrabold ${i.color}`}>{i.valor}</p>
          </div>
        ))}
      </div>

      <Card className="border-0 ring-1 ring-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <Droplet className="w-4 h-4 text-primary" /> Observaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Diagnóstico periodontal, plan de tratamiento, indicaciones de higiene..."
            value={observaciones}
            onChange={(e) => {
              setObservaciones(e.target.value);
              setSinGuardar(true);
            }}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Comparar entre sesiones es para lo que sirve el periodontograma */}
      <Card className="border-0 ring-1 ring-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <History className="w-4 h-4 text-primary" /> Registros anteriores
          </CardTitle>
          <CardDescription className="text-xs">
            {anteriores.length > 0
              ? "El sondaje de hoy arranca con los valores del último registro; corrija lo que cambió."
              : "Todavía no hay registros previos de este paciente."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {anteriores.length === 0 ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Info className="w-4 h-4" /> Al guardar quedará el primero, para comparar en el próximo control.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {anteriores.slice(0, 8).map((p) => {
                const r = resumirPeriodontograma(p.datos_json ?? { dientes: {} });
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 text-xs border-b pb-1.5 last:border-0"
                  >
                    <span className="font-medium">
                      {new Date(`${p.fecha}T12:00:00`).toLocaleDateString("es-PY")}
                      {p.medico && ` · ${p.medico.apellidos}, ${p.medico.nombres}`}
                    </span>
                    <span className="flex gap-1.5 shrink-0">
                      <Badge variant="secondary" className="text-[10px]">Sangrado {r.porcentajeSangrado}%</Badge>
                      <Badge variant="secondary" className="text-[10px]">Placa {r.porcentajePlaca}%</Badge>
                      <Badge variant="secondary" className="text-[10px]">≥6 mm: {r.bolsas6omas}</Badge>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
