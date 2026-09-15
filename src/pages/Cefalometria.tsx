import { useState, useMemo } from 'react';
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
} from '@/api/cefalometria';
import { usePacientes } from '@/api/pacientes';
import { CefalometriaEditor } from '@/components/cefalometria/CefalometriaEditor';
import { EstudioCefalometrico, TipoEstudioCefalometrico } from '@/types/cefalometria';
import {
  Search,
  Plus,
  Sparkles,
  Trash2,
  ScanLine,
  Upload,
  User,
  CheckCircle,
  Clock,
  ChevronRight,
  ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';

// Radiografía de perfil predeterminada de alta definición para demostración y trazado inicial
const RADIOGRAFIA_DEMO_URL =
  'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80';

export default function Cefalometria() {
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: pacientes = [] } = usePacientes();

  // Paciente seleccionado
  const pacienteIdParam = searchParams.get('paciente');
  const [busqueda, setBusqueda] = useState('');

  // Paciente activo
  const pacienteSeleccionado = useMemo(() => {
    if (pacienteIdParam) {
      return pacientes.find((p) => String(p.id) === String(pacienteIdParam)) || pacientes[0] || null;
    }
    return pacientes[0] || null;
  }, [pacientes, pacienteIdParam]);

  const pacienteId = pacienteSeleccionado?.id ? String(pacienteSeleccionado.id) : '';

  // Estudios cefalométricos del paciente
  const { data: estudios = [], isLoading: loadingEstudios } = useEstudiosCefalometria(pacienteId);
  const guardarEstudioMutation = useGuardarEstudioCefalometria();
  const eliminarEstudioMutation = useEliminarEstudioCefalometria();

  // Estudio actualmente abierto en el editor de digitalización (Segunda imagen de WebCeph)
  const [estudioEnEdicion, setEstudioEnEdicion] = useState<EstudioCefalometrico | null>(null);

  // Selector de filtro de pacientes
  const pacientesFiltrados = useMemo(() => {
    if (!busqueda.trim()) return pacientes;
    const q = busqueda.toLowerCase();
    return pacientes.filter(
      (p) =>
        p.nombres.toLowerCase().includes(q) ||
        p.apellidos.toLowerCase().includes(q) ||
        (p.documento && p.documento.toLowerCase().includes(q))
    );
  }, [pacientes, busqueda]);

  // Edad del paciente seleccionado
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

  // Manejar cambio de paciente
  const handleSeleccionarPaciente = (id: string) => {
    setSearchParams({ paciente: id });
    setEstudioEnEdicion(null);
  };

  // Crear nuevo registro cefalométrico
  const handleCrearNuevoRegistro = async (tipo: TipoEstudioCefalometrico = 'teleradiografia_lateral') => {
    if (!pacienteId) {
      toast.error('Seleccione un paciente primero');
      return;
    }

    const nuevo: Partial<EstudioCefalometrico> & { paciente_id: string; imagen_url: string } = {
      paciente_id: pacienteId,
      fecha: new Date().toISOString().split('T')[0],
      titulo:
        tipo === 'teleradiografia_lateral'
          ? 'Teleradiografía Lateral de Cráneo'
          : tipo === 'radiografia_pa'
          ? 'Radiografía Frontal PA'
          : 'Estudio Fotográfico',
      tipo,
      imagen_url: RADIOGRAFIA_DEMO_URL,
      puntos: {},
      calibracion: { distanciaRealMm: 10, pixelesPorMm: 2.8 },
      progreso: 'digitalizacion',
    };

    try {
      const guardado = await guardarEstudioMutation.mutateAsync(nuevo);
      setEstudioEnEdicion(guardado);
      toast.success('Nuevo registro cefalométrico creado. Abriendo digitalizador...');
    } catch {
      toast.error('Error al crear el registro cefalométrico.');
    }
  };

  // Subir archivo radiográfico local
  const handleSubirArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pacienteId) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;

      const nuevo: Partial<EstudioCefalometrico> & { paciente_id: string; imagen_url: string } = {
        paciente_id: pacienteId,
        fecha: new Date().toISOString().split('T')[0],
        titulo: file.name.replace(/\.[^/.]+$/, ''),
        tipo: 'teleradiografia_lateral',
        imagen_url: dataUrl,
        puntos: {},
        calibracion: { distanciaRealMm: 10, pixelesPorMm: 3.0 },
        progreso: 'digitalizacion',
      };

      try {
        const guardado = await guardarEstudioMutation.mutateAsync(nuevo);
        setEstudioEnEdicion(guardado);
        toast.success('Radiografía cargada con éxito.');
      } catch {
        toast.error('Error al guardar el nuevo estudio.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Guardar desde el editor
  const handleGuardarDesdeEditor = async (actualizado: EstudioCefalometrico) => {
    await guardarEstudioMutation.mutateAsync(actualizado);
    setEstudioEnEdicion(actualizado);
  };

  // Eliminar estudio
  const handleEliminarEstudio = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('¿Está seguro de eliminar este registro cefalométrico?')) return;
    try {
      await eliminarEstudioMutation.mutateAsync({ id, pacienteId });
      if (estudioEnEdicion?.id === id) {
        setEstudioEnEdicion(null);
      }
      toast.success('Registro eliminado.');
    } catch {
      toast.error('Error al eliminar registro.');
    }
  };

  // Si está activo el editor de digitalización (Segunda imagen), mostrarlo a pantalla completa
  if (estudioEnEdicion) {
    return (
      <AppLayout>
        <CefalometriaEditor
          estudio={estudioEnEdicion}
          pacienteNombre={
            pacienteSeleccionado
              ? `${pacienteSeleccionado.apellidos}, ${pacienteSeleccionado.nombres}`
              : 'Paciente'
          }
          pacienteDocumento={pacienteSeleccionado?.documento || ''}
          onGuardar={handleGuardarDesdeEditor}
          onVolver={() => setEstudioEnEdicion(null)}
        />
      </AppLayout>
    );
  }

  // VISTA PRINCIPAL (Primera imagen estilo WebCeph: barra de progreso, selector de paciente y grilla de registros)
  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        {/* Cabecera superior con buscador de paciente y acciones */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <ScanLine className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Cefalometría y Ortodoncia</h1>
                <p className="text-xs text-muted-foreground">
                  Digitalización de trazados craneales, análisis esquelético y registros fotográficos
                </p>
              </div>
            </div>
          </div>

          {/* Selector de paciente rápido */}
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
              {busqueda && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                  {pacientesFiltrados.slice(0, 5).map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        handleSeleccionarPaciente(String(p.id));
                        setBusqueda('');
                      }}
                      className="p-2 hover:bg-accent cursor-pointer text-xs flex justify-between items-center"
                    >
                      <span className="font-semibold">{p.apellidos}, {p.nombres}</span>
                      <span className="text-[10px] text-muted-foreground">{p.documento}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={() => handleCrearNuevoRegistro('teleradiografia_lateral')}
              disabled={!pacienteId}
              className="gap-2 bg-primary hover:bg-primary/90 text-white font-semibold text-xs h-9 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Añadir Registro
            </Button>
          </div>
        </div>

        {/* Tarjeta del Paciente Activo y Progreso del Caso (Estilo WebCeph) */}
        {pacienteSeleccionado ? (
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/40 text-primary flex items-center justify-center font-bold text-lg border border-primary/30">
                  {pacienteSeleccionado.nombres[0]}
                  {pacienteSeleccionado.apellidos[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">
                      {pacienteSeleccionado.apellidos}, {pacienteSeleccionado.nombres}
                    </h2>
                    <Badge variant="outline" className="text-[11px] font-mono">
                      ID: {pacienteSeleccionado.documento || 'S/D'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {edadPaciente || 'Edad no especificada'} • {pacienteSeleccionado.sexo === 'M' ? 'Masculino' : pacienteSeleccionado.sexo === 'F' ? 'Femenino' : 'Sexo no def.'} • Cédula: {pacienteSeleccionado.documento || '—'}
                  </p>
                </div>
              </div>

              {/* Barra de Progreso del Tratamiento Ortodóncico estilo WebCeph */}
              <div className="bg-muted/50 px-4 py-2.5 rounded-xl border border-border/50 flex items-center gap-4">
                <span className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
                  Progreso:
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 font-bold text-primary">
                    <CheckCircle className="w-3.5 h-3.5 text-primary" /> Digitalización
                  </span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" /> Análisis
                  </span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Tratamiento</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Terminado</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-muted/20 border border-dashed rounded-2xl">
            <User className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No hay paciente seleccionado</p>
          </div>
        )}

        {/* Sección: Lista de Registros Cefalométricos (Primera imagen de WebCeph) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold">Lista de Registros</h3>
              <Badge variant="secondary" className="text-xs">
                {estudios.length} {estudios.length === 1 ? 'registro' : 'registros'}
              </Badge>
            </div>

            {/* Carga inteligente de archivo radiográfico */}
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSubirArchivo}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="gap-1.5 text-xs h-8 cursor-pointer border-primary/40 text-primary hover:bg-primary/10"
                >
                  <span>
                    <Upload className="w-3.5 h-3.5" /> Subir Radiografía
                  </span>
                </Button>
              </label>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCrearNuevoRegistro('teleradiografia_lateral')}
                className="gap-1.5 text-xs h-8 bg-card"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Cargar Demo Radiografía
              </Button>
            </div>
          </div>

          {/* Grilla de Estudios / Registros */}
          {loadingEstudios ? (
            <div className="py-16 text-center text-xs text-muted-foreground">
              Cargando registros cefalométricos...
            </div>
          ) : estudios.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <ScanLine className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Sin registros cefalométricos para este paciente</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                    Cargue una teleradiografía lateral de cráneo o utilice la radiografía de demostración para iniciar el trazado anatómico.
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    onClick={() => handleCrearNuevoRegistro('teleradiografia_lateral')}
                    className="gap-2 text-xs"
                  >
                    <Plus className="w-4 h-4" /> Iniciar Primer Trazado Cefalométrico
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {estudios.map((est, index) => {
                const numPuntos = Object.keys(est.puntos || {}).length;
                return (
                  <div
                    key={est.id}
                    className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:border-primary/50 transition-all"
                  >
                    {/* Encabezado del registro con fecha */}
                    <div className="flex items-center justify-between pb-3 border-b border-border/50 text-xs">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary/10 text-primary border-primary/20 font-bold">
                          Registro {index + 1} : {est.fecha}
                        </Badge>
                        <span className="text-muted-foreground">• {est.titulo}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => setEstudioEnEdicion(est)}
                          className="gap-1.5 text-xs h-7.5 bg-primary hover:bg-primary/90 text-white font-medium"
                        >
                          <ScanLine className="w-3.5 h-3.5" /> Digitalización / Trazar
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleEliminarEstudio(est.id, e)}
                          className="h-7.5 w-7.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Eliminar registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Grilla de miniaturas clínicas estilo WebCeph */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 pt-3">
                      {/* Miniatura 1: Teleradiografía Lateral (Principal) */}
                      <div
                        onClick={() => setEstudioEnEdicion(est)}
                        className="group relative border rounded-xl overflow-hidden cursor-pointer hover:border-primary transition-all aspect-square bg-black flex flex-col items-center justify-center"
                      >
                        <img
                          src={est.imagen_url}
                          alt="Teleradiografía"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 text-white">
                          <span className="text-[10px] font-bold truncate">Teleradiografía</span>
                          <span className="text-[9px] text-emerald-400">
                            {numPuntos > 0 ? `${numPuntos} puntos` : 'Sin trazar'}
                          </span>
                        </div>
                      </div>

                      {/* Miniaturas de referencia complementarias */}
                      <div className="border border-dashed rounded-xl flex flex-col items-center justify-center p-2 text-center text-muted-foreground hover:bg-accent/40 cursor-pointer transition-colors aspect-square">
                        <ImageIcon className="w-5 h-5 mb-1 opacity-50" />
                        <span className="text-[10px] font-medium">Frontal PA</span>
                      </div>

                      <div className="border border-dashed rounded-xl flex flex-col items-center justify-center p-2 text-center text-muted-foreground hover:bg-accent/40 cursor-pointer transition-colors aspect-square">
                        <ImageIcon className="w-5 h-5 mb-1 opacity-50" />
                        <span className="text-[10px] font-medium">Panorámica</span>
                      </div>

                      <div className="border border-dashed rounded-xl flex flex-col items-center justify-center p-2 text-center text-muted-foreground hover:bg-accent/40 cursor-pointer transition-colors aspect-square">
                        <ImageIcon className="w-5 h-5 mb-1 opacity-50" />
                        <span className="text-[10px] font-medium">Foto Reposo</span>
                      </div>

                      <div className="border border-dashed rounded-xl flex flex-col items-center justify-center p-2 text-center text-muted-foreground hover:bg-accent/40 cursor-pointer transition-colors aspect-square">
                        <ImageIcon className="w-5 h-5 mb-1 opacity-50" />
                        <span className="text-[10px] font-medium">Foto Sonrisa</span>
                      </div>

                      <div className="border border-dashed rounded-xl flex flex-col items-center justify-center p-2 text-center text-muted-foreground hover:bg-accent/40 cursor-pointer transition-colors aspect-square">
                        <ImageIcon className="w-5 h-5 mb-1 opacity-50" />
                        <span className="text-[10px] font-medium">Foto Perfil</span>
                      </div>

                      <div className="border border-dashed rounded-xl flex flex-col items-center justify-center p-2 text-center text-muted-foreground hover:bg-accent/40 cursor-pointer transition-colors aspect-square">
                        <ImageIcon className="w-5 h-5 mb-1 opacity-50" />
                        <span className="text-[10px] font-medium">Oclusal Sup.</span>
                      </div>

                      <div className="border border-dashed rounded-xl flex flex-col items-center justify-center p-2 text-center text-muted-foreground hover:bg-accent/40 cursor-pointer transition-colors aspect-square">
                        <ImageIcon className="w-5 h-5 mb-1 opacity-50" />
                        <span className="text-[10px] font-medium">Oclusal Inf.</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
