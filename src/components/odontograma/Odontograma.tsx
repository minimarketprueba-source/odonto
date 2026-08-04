import { useState, useMemo } from "react";
import { useOdontograma, useSaveOdontogramaRegistro, OdontogramaRegistro } from "@/api/odontologia";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Info, MousePointer2, History } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ESTADOS_DENTALES,
  CARAS_DENTALES,
  NOMBRE_CARA,
  estadoDeRegistro,
  type EstadoDental,
} from "./estados-dentales";
import { DienteFigura, esSuperior } from "./diente-figura";

interface OdontogramaProps {
  pacienteId: string;
}

// Notación FDI. Cada arcada se recorre de derecha a izquierda del paciente,
// que es como se la mira de frente: 18…11 | 21…28.
const SUP_DER = [18, 17, 16, 15, 14, 13, 12, 11];
const SUP_IZQ = [21, 22, 23, 24, 25, 26, 27, 28];
const INF_DER = [48, 47, 46, 45, 44, 43, 42, 41];
const INF_IZQ = [31, 32, 33, 34, 35, 36, 37, 38];

const TEMP_SUP_DER = [55, 54, 53, 52, 51];
const TEMP_SUP_IZQ = [61, 62, 63, 64, 65];
const TEMP_INF_DER = [85, 84, 83, 82, 81];
const TEMP_INF_IZQ = [71, 72, 73, 74, 75];

const SIN_COLOR = "#ffffff";

interface MarcaCara {
  estado: EstadoDental;
  fecha?: string;
}

export function Odontograma({ pacienteId }: OdontogramaProps) {
  const { data: registros = [], isLoading } = useOdontograma(pacienteId);
  const saveRegistro = useSaveOdontogramaRegistro();

  // Herramienta activa: se elige una vez y se marca con un clic por cara, en
  // lugar de abrir un menú en cada diente. Es como se carga un odontograma en
  // papel: se agarra el lápiz rojo y se recorre la boca.
  const [herramienta, setHerramienta] = useState<EstadoDental | null>(null);
  const [ultimoDetalle, setUltimoDetalle] = useState<string | null>(null);

  /** Estado vigente de cada cara y de cada pieza completa. */
  const { porCara, porPieza } = useMemo(() => {
    const porCara: Record<string, MarcaCara> = {};
    const porPieza: Record<number, MarcaCara> = {};

    // De más viejo a más nuevo: el último registro de una cara es el que vale.
    const ordenados = [...registros].sort(
      (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    );

    for (const r of ordenados) {
      const estado = estadoDeRegistro(r);
      if (!estado) continue;

      if (r.cara === "completo") {
        if (estado.limpia) {
          delete porPieza[r.pieza];
          for (const c of CARAS_DENTALES) delete porCara[`${r.pieza}_${c}`];
        } else {
          porPieza[r.pieza] = { estado, fecha: r.created_at };
        }
        continue;
      }

      const clave = `${r.pieza}_${r.cara}`;
      if (estado.limpia) delete porCara[clave];
      else porCara[clave] = { estado, fecha: r.created_at };
    }

    return { porCara, porPieza };
  }, [registros]);

  /** Historial legible, del más reciente al más viejo. */
  const historial = useMemo(() => {
    return [...registros]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .map((r) => {
        const estado = estadoDeRegistro(r);
        const fecha = r.created_at ? new Date(r.created_at) : null;
        return {
          id: r.id ?? `${r.pieza}-${r.cara}-${r.created_at}`,
          hora: fecha
            ? fecha.toLocaleString("es-PY", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          pieza: r.pieza,
          cara: NOMBRE_CARA[r.cara] ?? r.cara,
          etiqueta: estado?.label ?? r.tratamiento ?? r.diagnostico ?? "Registro",
          color: estado?.color ?? "#94a3b8",
        };
      });
  }, [registros]);

  const aplicar = async (pieza: number, cara: string) => {
    if (!herramienta) {
      const marca = cara === "completo" ? porPieza[pieza] : porCara[`${pieza}_${cara}`];
      setUltimoDetalle(
        marca
          ? `Pieza ${pieza} · ${NOMBRE_CARA[cara] ?? cara}: ${marca.estado.label}`
          : `Pieza ${pieza} · ${NOMBRE_CARA[cara] ?? cara}: sin hallazgos`
      );
      return;
    }

    // Una corona, una endodoncia o una extracción son de la pieza entera: no
    // tiene sentido registrarlas en una cara suelta.
    const caraFinal = herramienta.piezaCompleta ? "completo" : cara;

    try {
      const payload: OdontogramaRegistro = {
        paciente_id: pacienteId,
        pieza,
        cara: caraFinal,
        diagnostico: herramienta.diagnostico,
        tratamiento: herramienta.tratamiento,
        estado: herramienta.estado,
        color: herramienta.color,
        notas: null,
      };
      await saveRegistro.mutateAsync(payload);
      setUltimoDetalle(`Pieza ${pieza} · ${NOMBRE_CARA[caraFinal] ?? caraFinal}: ${herramienta.label}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const Diente = ({ numero }: { numero: number }) => {
    const marcaPieza = porPieza[numero];
    const colorPieza = marcaPieza?.estado.color ?? SIN_COLOR;
    const ausente = marcaPieza?.estado.ausente || marcaPieza?.estado.id === "extraccion";

    const colorDe = (cara: string) =>
      porCara[`${numero}_${cara}`]?.estado.color ?? (marcaPieza ? colorPieza : SIN_COLOR);

    const titulo = marcaPieza
      ? `Pieza ${numero}: ${marcaPieza.estado.label}`
      : `Pieza ${numero}`;

    // En la arcada inferior se invierte el orden (esquema arriba, número
    // abajo): así el esquema de caras de las dos arcadas queda mirando al
    // centro de la boca, como en el odontograma de papel.
    return (
      <div
        className={`flex items-center gap-1 shrink-0 ${
          esSuperior(numero) ? "flex-col" : "flex-col-reverse"
        }`}
      >
        <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">{numero}</span>

        <button
          type="button"
          title={titulo}
          onClick={() => aplicar(numero, "completo")}
          className="rounded transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={saveRegistro.isPending}
        >
          <DienteFigura numero={numero} color={colorPieza} tachado={ausente} className="w-7 h-11" />
        </button>

        {/* Esquema de las cinco caras: es donde se marca una caries o una
            obturación, que afectan a una cara y no a toda la pieza. */}
        <svg viewBox="0 0 40 40" className="w-8 h-8" role="group" aria-label={`Caras de la pieza ${numero}`}>
          <g stroke="#94a3b8" strokeWidth="1">
            <polygon
              points="0,0 40,0 30,10 10,10"
              fill={colorDe("vestibular")}
              className="cursor-pointer hover:brightness-90"
              onClick={() => aplicar(numero, "vestibular")}
            />
            <polygon
              points="40,0 40,40 30,30 30,10"
              fill={colorDe("distal")}
              className="cursor-pointer hover:brightness-90"
              onClick={() => aplicar(numero, "distal")}
            />
            <polygon
              points="0,40 40,40 30,30 10,30"
              fill={colorDe("palatina")}
              className="cursor-pointer hover:brightness-90"
              onClick={() => aplicar(numero, "palatina")}
            />
            <polygon
              points="0,0 0,40 10,30 10,10"
              fill={colorDe("mesial")}
              className="cursor-pointer hover:brightness-90"
              onClick={() => aplicar(numero, "mesial")}
            />
            <polygon
              points="10,10 30,10 30,30 10,30"
              fill={colorDe("oclusal")}
              className="cursor-pointer hover:brightness-90"
              onClick={() => aplicar(numero, "oclusal")}
            />
          </g>
        </svg>
      </div>
    );
  };

  /** Una arcada completa: los dos cuadrantes separados por la línea media. */
  const Arcada = ({ derecha, izquierda }: { derecha: number[]; izquierda: number[] }) => (
    <div className="flex items-start justify-center gap-3">
      <div className="flex gap-1">
        {derecha.map((n) => (
          <Diente key={n} numero={n} />
        ))}
      </div>
      <div className="self-stretch border-l border-dashed border-slate-300" />
      <div className="flex gap-1">
        {izquierda.map((n) => (
          <Diente key={n} numero={n} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      <Card className="xl:col-span-9 shadow-sm border-0 ring-1 ring-border/50">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold tracking-tight">
                Odontograma Técnico por Superficies
              </CardTitle>
              <CardDescription className="text-xs">
                Elija un estado y haga clic sobre la cara del diente. Sin estado elegido, el clic solo consulta.
              </CardDescription>
            </div>
            {(isLoading || saveRegistro.isPending) && (
              <RefreshCw className="w-5 h-5 animate-spin text-primary shrink-0" />
            )}
          </div>

          {/* Barra de herramientas */}
          <div className="flex flex-wrap items-center gap-1.5 pt-3">
            <Button
              type="button"
              size="sm"
              variant={herramienta === null ? "default" : "outline"}
              className="h-8 text-xs gap-1.5"
              onClick={() => setHerramienta(null)}
            >
              <MousePointer2 className="w-3.5 h-3.5" />
              Consultar
            </Button>

            {ESTADOS_DENTALES.map((e) => {
              const activo = herramienta?.id === e.id;
              return (
                <Button
                  key={e.id}
                  type="button"
                  size="sm"
                  variant="outline"
                  title={e.descripcion}
                  onClick={() => setHerramienta(activo ? null : e)}
                  className="h-8 text-xs gap-1.5 transition-all"
                  style={
                    activo
                      ? { backgroundColor: e.color, color: e.contraste, borderColor: e.color }
                      : undefined
                  }
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                    style={{ backgroundColor: e.color }}
                  />
                  {e.label}
                </Button>
              );
            })}
          </div>

          {herramienta && (
            <p className="text-xs text-muted-foreground pt-1">
              Marcando <strong style={{ color: herramienta.color }}>{herramienta.label}</strong>
              {herramienta.piezaCompleta
                ? " — se aplica a la pieza entera."
                : " — haga clic en una cara del esquema de abajo."}
            </p>
          )}
        </CardHeader>

        <CardContent className="p-6 overflow-x-auto">
          <div className="min-w-[720px] flex flex-col gap-8">
            <Arcada derecha={SUP_DER} izquierda={SUP_IZQ} />

            <div className="rounded-lg bg-muted/40 py-4 flex flex-col gap-6">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground text-center font-semibold">
                Dentición temporal
              </p>
              <Arcada derecha={TEMP_SUP_DER} izquierda={TEMP_SUP_IZQ} />
              <Arcada derecha={TEMP_INF_DER} izquierda={TEMP_INF_IZQ} />
            </div>

            <Arcada derecha={INF_DER} izquierda={INF_IZQ} />
          </div>
        </CardContent>
      </Card>

      <div className="xl:col-span-3 flex flex-col gap-4">
        {/* Referencia de colores */}
        <Card className="shadow-sm border-0 ring-1 ring-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Info className="w-4 h-4 text-primary" />
              Referencia
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-1.5 pb-4">
            {ESTADOS_DENTALES.filter((e) => !e.limpia).map((e) => (
              <div key={e.id} className="flex items-center gap-1.5 text-xs">
                <span
                  className="w-3 h-3 rounded border border-black/20 shrink-0"
                  style={{ backgroundColor: e.color }}
                />
                <span className="truncate" title={e.descripcion}>
                  {e.label}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0 ring-1 ring-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-1.5">
              <History className="w-4 h-4 text-primary" />
              Historial clínico
            </CardTitle>
            <CardDescription className="text-xs">
              {ultimoDetalle ?? "Registro cronológico de lo marcado en el odontograma."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            {historial.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay registros previos en el odontograma.
              </p>
            ) : (
              <ScrollArea className="h-[420px] pr-3">
                <ul className="space-y-2">
                  {historial.map((h) => (
                    <li key={h.id} className="flex items-start gap-2 text-xs border-b pb-2 last:border-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full mt-1 shrink-0 border border-black/20"
                        style={{ backgroundColor: h.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          Pieza {h.pieza} · {h.cara}
                        </p>
                        <p className="text-muted-foreground">{h.etiqueta}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0 tabular-nums">
                        {h.hora}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
