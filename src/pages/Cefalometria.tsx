import { useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  useEstudiosCefalometria,
  useGuardarEstudioCefalometria,
  useEliminarEstudioCefalometria,
  CefalometriaNoInstaladaError,
} from '@/api/cefalometria';
import { usePacientes } from '@/api/pacientes';
import { CefalometriaEditor } from '@/components/cefalometria/CefalometriaEditor';
import { CasoDetalleView, ImagenGuardada } from '@/components/cefalometria/CasoDetalleView';
import { EstudioCefalometrico } from '@/types/cefalometria';
import { Search, Plus, Trash2, ScanLine, User, ImageIcon, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const mensajeError = (error: unknown, porDefecto: string) =>
  error instanceof Error && error.message ? error.message : porDefecto;

export default function Cefalometria() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: pacientes = [] } = usePacientes();
  const [busqueda, setBusqueda] = useState('');
  const inputRadiografiaRef = useRef<HTMLInputElement>(null);

  // Antes, sin paciente en la dirección, se elegía solo el primero de la lista:
  // era fácil cargar una radiografía en la ficha de otra persona. Ahora hay que
  // elegirlo (o llegar desde su ficha, que ya lo trae).
  const pacienteIdParam = searchParams.get('paciente');
  const pacienteSeleccionado = useMemo(
    () => (pacienteIdParam ? pacientes.find((p) => String(p.id) === String(pacienteIdParam)) || null : null),
    [pacientes, pacienteIdParam]
  );
  const pacienteId = pacienteSeleccionado?.id ? String(pacienteSeleccionado.id) : '';
  const nombrePaciente = pacienteSeleccionado
    ? `${pacienteSeleccionado.apellidos}, ${pacienteSeleccionado.nombres}`
    : 'Paciente';

  const {
    data: estudios = [],
    isLoading: loadingEstudios,
    error: errorEstudios,
  } = useEstudiosCefalometria(pacienteId);
  const guardarEstudioMutation = useGuardarEstudioCefalometria();
  const eliminarEstudioMutation = useEliminarEstudioCefalometria();

  // Tres vistas: lista de registros → caso (fotos y pestañas) → digitalizador.
  const [registroEnVista, setRegistroEnVista] = useState<EstudioCefalometrico | null>(null);
  const [estudioEnEdicion, setEstudioEnEdicion] = useState<EstudioCefalometrico | null>(null);

  // La lista viene del más nuevo al más viejo; el número cuenta desde el primero.
  const numeroDe = (id: string) => {
    const i = estudios.findIndex((e) => e.id === id);
    return i >= 0 ? estudios.length - i : estudios.length + 1;
  };

  const pacientesFiltrados = useMemo(() => {
    if (!busqueda.trim()) return pacientes;
    const q = busqueda.toLowerCase();
    return pacientes.filter(
      (p) =>
        (p.nombres || '').toLowerCase().includes(q) ||
        (p.apellidos || '').toLowerCase().includes(q) ||
        (p.documento || '').toLowerCase().includes(q)
    );
  }, [pacientes, busqueda]);

  const edadPaciente = useMemo(() => {
    if (!pacienteSeleccionado?.fecha_nacimiento) return null;
    const nac = new Date(`${pacienteSeleccionado.fecha_nacimiento}T00:00:00`);
    if (Number.isNaN(nac.getTime())) return null;
    const hoy = new Date();
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad >= 0 ? `${edad} años` : null;
  }, [pacienteSeleccionado]);

  const handleSeleccionarPaciente = (id: string) => {
    setSearchParams({ paciente: id });
    setRegistroEnVista(null);
    setEstudioEnEdicion(null);
  };

  // Un registro nuevo empieza con su teleradiografía: sin imagen no hay nada
  // que trazar. (Antes se creaba con una foto de internet de "demostración".)
  const handleSubirArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !pacienteId) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;
      const aviso = toast.loading('Subiendo radiografía…');
      try {
        const guardado = await guardarEstudioMutation.mutateAsync({
          paciente_id: pacienteId,
          fecha: new Date().toLocaleDateString('en-CA'),
          titulo: 'Teleradiografía lateral',
          tipo: 'teleradiografia_lateral',
          imagen_url: dataUrl,
          puntos: {},
          calibracion: { distanciaRealMm: 10 },
          progreso: 'digitalizacion',
        });
        toast.success('Radiografía guardada. Abriendo el digitalizador…', { id: aviso });
        setRegistroEnVista(guardado);
        setEstudioEnEdicion(guardado);
      } catch (error) {
        toast.error(mensajeError(error, 'No se pudo guardar la radiografía.'), { id: aviso });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGuardar = async (actualizado: EstudioCefalometrico) => {
    const guardado = await guardarEstudioMutation.mutateAsync(actualizado);
    if (estudioEnEdicion?.id === guardado.id) setEstudioEnEdicion(guardado);
    if (registroEnVista?.id === guardado.id) setRegistroEnVista(guardado);
    return guardado;
  };

  const handleEliminarEstudio = async (estudio: EstudioCefalometrico, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('¿Eliminar este registro cefalométrico con su trazado y sus imágenes?')) return;
    try {
      await eliminarEstudioMutation.mutateAsync(estudio);
      if (estudioEnEdicion?.id === estudio.id) setEstudioEnEdicion(null);
      if (registroEnVista?.id === estudio.id) setRegistroEnVista(null);
      toast.success('Registro eliminado.');
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo eliminar el registro.'));
    }
  };

  const inputRadiografia = (
    <input ref={inputRadiografiaRef} type="file" accept="image/*" onChange={handleSubirArchivo} className="hidden" />
  );
  const nuevoRegistro = () => inputRadiografiaRef.current?.click();

  // ================================================================
  // VISTA 3: digitalizador
  // ================================================================
  if (estudioEnEdicion) {
    return (
      <AppLayout>
        <CefalometriaEditor
          key={estudioEnEdicion.id}
          estudio={estudioEnEdicion}
          pacienteNombre={nombrePaciente}
          pacienteDocumento={pacienteSeleccionado?.documento || ''}
          onGuardar={handleGuardar}
          onVolver={() => setEstudioEnEdicion(null)}
        />
      </AppLayout>
    );
  }

  // ================================================================
  // VISTA 2: caso con sus imágenes
  // ================================================================
  if (registroEnVista) {
    return (
      <AppLayout>
        <CasoDetalleView
          estudio={registroEnVista}
          numeroRegistro={numeroDe(registroEnVista.id)}
          pacienteNombre={nombrePaciente}
          pacienteEdad={edadPaciente}
          pacienteDocumento={pacienteSeleccionado?.documento || ''}
          onVolver={() => setRegistroEnVista(null)}
          onAbrirDigitalizacion={(est) => setEstudioEnEdicion(est)}
          onGuardar={handleGuardar}
          onEliminar={() => handleEliminarEstudio(registroEnVista)}
        />
      </AppLayout>
    );
  }

  // ================================================================
  // VISTA 1: lista de registros del paciente
  // ================================================================
  const noInstalado = errorEstudios instanceof CefalometriaNoInstaladaError;

  return (
    <AppLayout>
      {inputRadiografia}
      <div className="space-y-6 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <ScanLine className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Cefalometría y Ortodoncia</h1>
              <p className="text-xs text-muted-foreground">
                Trazado sobre la teleradiografía, análisis esquelético y registros fotográficos
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
              {busqueda && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                  {pacientesFiltrados.length === 0 && (
                    <div className="p-2 text-xs text-muted-foreground">Sin resultados</div>
                  )}
                  {pacientesFiltrados.slice(0, 8).map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => {
                        handleSeleccionarPaciente(String(p.id));
                        setBusqueda('');
                      }}
                      className="w-full text-left p-2 hover:bg-accent cursor-pointer text-xs flex justify-between items-center"
                    >
                      <span className="font-semibold">
                        {p.apellidos}, {p.nombres}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{p.documento}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={nuevoRegistro}
              disabled={!pacienteId || noInstalado || guardarEstudioMutation.isPending}
              className="gap-2 font-semibold text-xs h-9 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Nuevo registro
            </Button>
          </div>
        </div>

        {noInstalado && (
          <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold">El módulo todavía no está instalado en la base de datos.</p>
              <p className="text-xs mt-1">
                Hasta que se instale no se puede guardar nada. Hay que ejecutar una sola vez el archivo{' '}
                <code>supabase/migrations/cefalometria_setup.sql</code> en el SQL Editor de Supabase.
              </p>
            </div>
          </div>
        )}

        {pacienteSeleccionado ? (
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/40 text-primary flex items-center justify-center font-bold text-lg border border-primary/30">
                {pacienteSeleccionado.nombres?.[0]}
                {pacienteSeleccionado.apellidos?.[0]}
              </div>
              <div>
                <h2 className="text-lg font-bold">{nombrePaciente}</h2>
                <p className="text-xs text-muted-foreground">
                  {edadPaciente || 'Edad no cargada'} •{' '}
                  {pacienteSeleccionado.sexo === 'M'
                    ? 'Masculino'
                    : pacienteSeleccionado.sexo === 'F'
                    ? 'Femenino'
                    : 'Sexo no cargado'}{' '}
                  • Cédula: {pacienteSeleccionado.documento || '—'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-10 text-center bg-muted/20 border border-dashed rounded-2xl">
            <User className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">Elija un paciente</p>
            <p className="text-xs text-muted-foreground mt-1">
              Búsquelo arriba por nombre o cédula, o entre desde su ficha con el botón «Cefalometría».
            </p>
          </div>
        )}

        {pacienteSeleccionado && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold">Registros</h3>
              <Badge variant="secondary" className="text-xs">
                {estudios.length} {estudios.length === 1 ? 'registro' : 'registros'}
              </Badge>
            </div>

            {loadingEstudios ? (
              <div className="py-16 text-center text-xs text-muted-foreground">Cargando registros…</div>
            ) : errorEstudios && !noInstalado ? (
              <div className="py-10 text-center text-sm text-destructive">
                No se pudieron cargar los registros: {mensajeError(errorEstudios, 'error desconocido')}
              </div>
            ) : estudios.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <ScanLine className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Este paciente no tiene registros cefalométricos</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                      Cargue la teleradiografía lateral de cráneo (foto o archivo escaneado) para empezar el
                      trazado.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Button onClick={nuevoRegistro} disabled={noInstalado} className="gap-2 text-xs">
                      <Plus className="w-4 h-4" /> Cargar teleradiografía
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {estudios.map((est) => {
                  const numPuntos = Object.keys(est.puntos || {}).length;
                  const numMedidas = est.mediciones?.length || 0;
                  const numFotos = Object.keys(est.imagenes || {}).length;
                  return (
                    <div
                      key={est.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setRegistroEnVista(est)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setRegistroEnVista(est);
                      }}
                      className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:border-primary/60 hover:shadow-md cursor-pointer transition-all group"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/50 text-xs">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-primary/10 text-primary border-primary/20 font-bold hover:bg-primary/10">
                            Registro {numeroDe(est.id)} · {est.fecha.split('-').reverse().join('/')}
                          </Badge>
                          <span className="text-muted-foreground">
                            {numPuntos} puntos · {numMedidas} medidas · {numFotos}{' '}
                            {numFotos === 1 ? 'foto' : 'fotos'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRegistroEnVista(est);
                            }}
                            variant="outline"
                            className="gap-1.5 text-xs h-7 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all font-medium"
                          >
                            <ScanLine className="w-3.5 h-3.5" /> Abrir caso
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleEliminarEstudio(est, e)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRegistroEnVista(est);
                            if (est.imagen_url) setEstudioEnEdicion(est);
                          }}
                          className="relative border rounded-xl overflow-hidden cursor-pointer hover:border-primary transition-all aspect-square bg-black"
                          title="Abrir digitalizador"
                        >
                          {est.imagen_url ? (
                            <ImagenGuardada
                              refImagen={est.imagen_url}
                              alt="Teleradiografía"
                              className="w-full h-full object-cover opacity-90"
                            />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-slate-500 m-auto mt-6" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-1.5 text-white">
                            <span className="text-[9px] font-bold truncate">Teleradiografía</span>
                            <span className={`text-[8px] ${numPuntos > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                              {numPuntos > 0 ? `${numPuntos} pts` : 'Sin trazar'}
                            </span>
                          </div>
                        </button>

                        {Object.entries(est.imagenes || {})
                          .slice(0, 7)
                          .map(([slot, ref]) => (
                            <div key={slot} className="border rounded-xl overflow-hidden aspect-square bg-muted">
                              <ImagenGuardada refImagen={ref} alt={slot} className="w-full h-full object-cover" />
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
