import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EstudioCefalometrico } from '@/types/cefalometria';
import {
  ChevronLeft,
  Plus,
  ScanLine,
  BarChart2,
  Grid2X2,
  Heart,
  Smile,
  ClipboardList,
  Stethoscope,
  Layers,
  Eye,
  Folder,
  Timer,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Camera,
} from 'lucide-react';
import { toast } from 'sonner';

// =============================================
// Tipos de imágenes clínicas de WebCeph
// =============================================
interface SlotImagen {
  id: string;
  etiqueta: string;
  subetiqueta?: string;
  icono?: React.ReactNode;
  url?: string;
  fila: 1 | 2 | 3 | 4;
}

const SLOTS_IMAGENES: SlotImagen[] = [
  // Fila 1: Radiografías
  { id: 'tele_lat', etiqueta: 'Lateral', subetiqueta: 'Teleradiografía', fila: 1 },
  { id: 'craneo_lat', etiqueta: 'Lateral', subetiqueta: 'Cráneo', fila: 1 },
  { id: 'panoramica', etiqueta: 'Panorámica', subetiqueta: 'Radiografía', fila: 1 },
  { id: 'frontal_pa', etiqueta: 'Frontal PA', subetiqueta: 'Radiografía', fila: 1 },
  { id: 'mano', etiqueta: 'Mano', subetiqueta: 'Carpal', fila: 1 },
  { id: 'extra1', etiqueta: 'Extra', subetiqueta: 'Radiografía 1', fila: 1 },
  // Fila 2: Fotos faciales
  { id: 'foto_frontal', etiqueta: 'Frontal', subetiqueta: 'En reposo', fila: 2 },
  { id: 'foto_sonrisa', etiqueta: 'Sonrisa', subetiqueta: 'Foto', fila: 2 },
  { id: 'foto_perfil_d', etiqueta: 'Perfil Dcho.', subetiqueta: 'Foto', fila: 2 },
  { id: 'foto_perfil_i', etiqueta: 'Perfil Izq.', subetiqueta: 'Foto', fila: 2 },
  { id: 'foto34_d', etiqueta: '3/4 Dcho.', subetiqueta: 'Foto', fila: 2 },
  { id: 'foto34_i', etiqueta: '3/4 Izq.', subetiqueta: 'Foto', fila: 2 },
  // Fila 3: Fotos intraorales
  { id: 'intra_frontal', etiqueta: 'Frontal', subetiqueta: 'Intraoral', fila: 3 },
  { id: 'intra_lat_d', etiqueta: 'Lat. Dcha.', subetiqueta: 'Intraoral', fila: 3 },
  { id: 'intra_lat_i', etiqueta: 'Lat. Izq.', subetiqueta: 'Intraoral', fila: 3 },
  { id: 'oclusal_sup', etiqueta: 'Oclusal Sup.', subetiqueta: 'Modelo / Foto', fila: 3 },
  { id: 'oclusal_inf', etiqueta: 'Oclusal Inf.', subetiqueta: 'Modelo / Foto', fila: 3 },
  { id: 'intra_extra1', etiqueta: 'Extra 1', subetiqueta: 'Intraoral', fila: 3 },
  // Fila 4: Fotos extras
  { id: 'extra_foto1', etiqueta: 'Extra Foto 1', fila: 4 },
  { id: 'extra_foto2', etiqueta: 'Extra Foto 2', fila: 4 },
  { id: 'extra_foto3', etiqueta: 'Extra Foto 3', fila: 4 },
  { id: 'extra_foto4', etiqueta: 'Extra Foto 4', fila: 4 },
  { id: 'extra_foto5', etiqueta: 'Extra Foto 5', fila: 4 },
  { id: 'extra_foto6', etiqueta: 'Extra Foto 6', fila: 4 },
];

// =============================================
// Pestañas del sidebar de WebCeph
// =============================================
type PestanaId =
  | 'digitalizacion'
  | 'analisis'
  | 'pa'
  | 'tejido_blando'
  | 'oclusograma'
  | 'evaluacion'
  | 'tratamiento'
  | 'superposicion'
  | 'visor'
  | 'caso'
  | 'lapso';

interface PestanaConfig {
  id: PestanaId;
  label: string;
  icono: React.ReactNode;
  indicador?: 'ok' | 'warn' | 'pending';
  habilitada: boolean;
}

const PESTANAS: PestanaConfig[] = [
  { id: 'digitalizacion', label: 'Digitalización', icono: <ScanLine className="w-3.5 h-3.5" />, habilitada: true },
  { id: 'analisis', label: 'Análisis', icono: <BarChart2 className="w-3.5 h-3.5" />, habilitada: true },
  { id: 'pa', label: 'PA', icono: <Grid2X2 className="w-3.5 h-3.5" />, indicador: 'warn', habilitada: false },
  { id: 'tejido_blando', label: 'Tejido blando', icono: <Heart className="w-3.5 h-3.5" />, indicador: 'warn', habilitada: true },
  { id: 'oclusograma', label: 'Oclusograma', icono: <Smile className="w-3.5 h-3.5" />, indicador: 'warn', habilitada: false },
  { id: 'evaluacion', label: 'Evaluación', icono: <ClipboardList className="w-3.5 h-3.5" />, habilitada: false },
  { id: 'tratamiento', label: 'Tratamiento', icono: <Stethoscope className="w-3.5 h-3.5" />, habilitada: false },
  { id: 'superposicion', label: 'Superposición', icono: <Layers className="w-3.5 h-3.5" />, habilitada: false },
  { id: 'visor', label: 'Visor', icono: <Eye className="w-3.5 h-3.5" />, habilitada: false },
  { id: 'caso', label: 'Caso', icono: <Folder className="w-3.5 h-3.5" />, indicador: 'ok', habilitada: false },
  { id: 'lapso', label: 'Lapso de tiempo', icono: <Timer className="w-3.5 h-3.5" />, indicador: 'ok', habilitada: false },
];

// =============================================
// Props del componente
// =============================================
interface CasoDetalleViewProps {
  estudio: EstudioCefalometrico;
  pacienteNombre: string;
  pacienteEdad?: string | null;
  pacienteDocumento?: string;
  onVolver: () => void;
  onAbrirDigitalizacion: (estudio: EstudioCefalometrico) => void;
  onGuardar: (estudioActualizado: EstudioCefalometrico) => Promise<void> | void;
  onEliminar?: () => void;
}

// =============================================
// Componente Principal: Vista Caso Clínico
// =============================================
export function CasoDetalleView({
  estudio,
  pacienteNombre,
  pacienteEdad,
  onVolver,
  onAbrirDigitalizacion,
  onEliminar,
}: CasoDetalleViewProps) {
  const [pestanaActiva, setPestanaActiva] = useState<PestanaId>('digitalizacion');
  const [imagenesSlots, setImagenesSlots] = useState<Record<string, string>>({
    tele_lat: estudio.imagen_url, // La teleradiografía lateral viene del estudio
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [slotParaSubir, setSlotParaSubir] = useState<string | null>(null);

  const numPuntos = Object.keys(estudio.puntos || {}).length;
  const tieneDigitalizacion = numPuntos > 0;

  // Cargar imagen desde disco al slot correspondiente
  const handleSlotClick = (slotId: string) => {
    if (slotId === 'tele_lat') {
      // La teleradiografía lateral abre el editor de digitalización
      onAbrirDigitalizacion(estudio);
      return;
    }
    setSlotParaSubir(slotId);
    fileInputRef.current?.click();
  };

  const handleArchivoSeleccionado = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !slotParaSubir) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        setImagenesSlots((prev) => ({ ...prev, [slotParaSubir]: dataUrl }));
        toast.success(`Imagen cargada para: ${SLOTS_IMAGENES.find((s) => s.id === slotParaSubir)?.etiqueta || slotParaSubir}.`);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
    setSlotParaSubir(null);
  };

  const handleEliminarImagen = (slotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (slotId === 'tele_lat') {
      toast.info('La teleradiografía principal no se puede eliminar desde aquí.');
      return;
    }
    setImagenesSlots((prev) => {
      const n = { ...prev };
      delete n[slotId];
      return n;
    });
  };

  // Renderizar indicador de estado de pestaña
  const renderIndicador = (ind?: 'ok' | 'warn' | 'pending') => {
    if (!ind) return null;
    return (
      <span
        className={`w-2 h-2 rounded-full inline-block ml-1 ${
          ind === 'ok' ? 'bg-emerald-400' : ind === 'warn' ? 'bg-amber-400' : 'bg-slate-400'
        }`}
      />
    );
  };

  // Render del contenido del panel derecho según la pestaña activa
  const renderContenido = () => {
    if (pestanaActiva === 'digitalizacion') {
      return (
        <div className="flex flex-col gap-5 flex-1">
          {/* Nota de IA */}
          <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-[11px] text-blue-700 dark:text-blue-300">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-500" />
            <span>La Inteligencia Artificial puede trazar automáticamente la radiografía lateral. Abra el digitalizador para colocar y ajustar los puntos anatómicos cefalométricos.</span>
          </div>

          {/* Estado de detección */}
          <div className="flex items-center gap-2 text-xs">
            {tieneDigitalizacion ? (
              <Badge className="gap-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700">
                <CheckCircle2 className="w-3 h-3" /> {numPuntos} puntos trazados
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1.5 text-muted-foreground border-muted-foreground/30">
                <AlertCircle className="w-3 h-3" /> Sin digitalizar
              </Badge>
            )}
          </div>

          {/* Botones de acción */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => onAbrirDigitalizacion(estudio)}
              className="bg-primary hover:bg-primary/90 text-white font-semibold text-xs h-9 gap-1.5 shadow-sm"
            >
              <ScanLine className="w-4 h-4" />
              {tieneDigitalizacion ? 'Modificar' : 'Digitalizar'}
            </Button>
            <Button
              variant="outline"
              onClick={() => onAbrirDigitalizacion(estudio)}
              className="text-xs h-9 gap-1.5 border-border"
            >
              <Camera className="w-3.5 h-3.5" />
              Restablecer
            </Button>
          </div>

          {/* Calibración */}
          <div className="flex items-center justify-between bg-muted/40 rounded-xl border px-3 py-2 text-xs">
            <span className="text-muted-foreground font-medium">Aplicar calibración preestablecida</span>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-4 rounded-full transition-colors ${estudio.calibracion?.pixelesPorMm ? 'bg-primary' : 'bg-muted-foreground/30'} relative cursor-pointer`}>
                <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all ${estudio.calibracion?.pixelesPorMm ? 'right-0.5' : 'left-0.5'}`} />
              </div>
            </div>
          </div>

          {/* Sliders Brillo y Contraste (informativos, se controlan en el editor) */}
          <div className="space-y-3">
            <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
              <span>Brillo:</span>
              <span className="font-mono text-foreground">100%</span>
            </div>
            <input type="range" min={30} max={180} defaultValue={100} className="w-full accent-primary h-1.5 cursor-pointer" disabled />

            <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
              <span>Contraste:</span>
              <span className="font-mono text-foreground">100%</span>
            </div>
            <input type="range" min={40} max={200} defaultValue={100} className="w-full accent-primary h-1.5 cursor-pointer" disabled />
          </div>

          <p className="text-[10px] text-muted-foreground italic text-center">
            * Los filtros de imagen se ajustan en tiempo real dentro del editor de digitalización.
          </p>
        </div>
      );
    }

    if (pestanaActiva === 'analisis') {
      // Análisis cefalométrico rápido (valores del estudio guardado)
      const mediciones = estudio.mediciones || [];
      if (mediciones.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center text-muted-foreground">
            <BarChart2 className="w-8 h-8 opacity-30" />
            <p className="text-xs max-w-xs">
              Digitalice los puntos cefalométricos en el editor para ver el análisis automático aquí.
            </p>
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => onAbrirDigitalizacion(estudio)}
            >
              <ScanLine className="w-3.5 h-3.5" /> Abrir Digitalizador
            </Button>
          </div>
        );
      }
      return (
        <div className="space-y-2 overflow-y-auto flex-1">
          {mediciones.map((m, i) => (
            <div key={i} className="p-2.5 rounded-lg bg-muted/40 border border-border/50 space-y-0.5">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold">{m.sigla}</span>
                <span className={`text-sm font-extrabold font-mono ${Math.abs(m.desviacion || 0) > 3 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {m.valor} {m.unidad}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">{m.interpretacion}</p>
            </div>
          ))}
        </div>
      );
    }

    if (pestanaActiva === 'tejido_blando') {
      return (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center text-muted-foreground">
          <Heart className="w-8 h-8 opacity-30 text-pink-400" />
          <p className="text-xs max-w-xs font-medium">Análisis de Tejido Blando</p>
          <p className="text-[11px] max-w-xs">
            Coloque los puntos de tejido blando (Pn, Sn, UL, LL, Pog', Me') en el digitalizador para activar este análisis.
          </p>
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => onAbrirDigitalizacion(estudio)}>
            <ScanLine className="w-3.5 h-3.5" /> Abrir Digitalizador
          </Button>
        </div>
      );
    }

    // Pestaña no implementada
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center text-muted-foreground">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center opacity-40">
          {PESTANAS.find((p) => p.id === pestanaActiva)?.icono}
        </div>
        <p className="text-xs font-semibold">{PESTANAS.find((p) => p.id === pestanaActiva)?.label}</p>
        <p className="text-[11px] max-w-xs text-muted-foreground/70">
          Este módulo estará disponible en una próxima versión.
        </p>
      </div>
    );
  };

  // Agrupar slots por fila
  const filas: Record<number, SlotImagen[]> = { 1: [], 2: [], 3: [], 4: [] };
  SLOTS_IMAGENES.forEach((s) => filas[s.fila].push(s));

  const labelsFila: Record<number, string> = {
    1: 'Radiografías',
    2: 'Fotografías Faciales',
    3: 'Fotografías Intraorales y Modelos',
    4: 'Fotografías Adicionales',
  };

  return (
    <div className="flex h-[calc(100vh-4.5rem)] overflow-hidden bg-background">
      {/* INPUT OCULTO PARA CARGA DE IMÁGENES */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleArchivoSeleccionado}
      />

      {/* ===================== SIDEBAR IZQUIERDO (Pestañas de WebCeph) ===================== */}
      <div className="w-44 flex-shrink-0 bg-card border-r border-border flex flex-col shadow-sm z-10">
        {/* Botón volver */}
        <div className="p-2 border-b border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={onVolver}
            className="w-full justify-start gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Lista de registros
          </Button>
        </div>

        {/* Info del paciente en el sidebar */}
        <div className="p-3 border-b border-border bg-muted/30">
          <p className="text-[11px] font-bold leading-tight truncate" title={pacienteNombre}>
            {pacienteNombre}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {pacienteEdad || 'Edad no especificada'} • {estudio.fecha}
          </p>
        </div>

        {/* Pestañas de navegación estilo WebCeph */}
        <nav className="flex-1 overflow-y-auto py-1">
          {PESTANAS.map((tab) => {
            const activa = pestanaActiva === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'digitalizacion') {
                    // Al hacer click en Digitalización directamente, abrir el editor
                    onAbrirDigitalizacion(estudio);
                    return;
                  }
                  setPestanaActiva(tab.id);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-[11px] text-left transition-all border-l-2 ${
                  activa
                    ? 'border-primary bg-primary/8 text-primary font-bold'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/60'
                } ${!tab.habilitada && tab.id !== 'digitalizacion' ? 'opacity-60' : ''}`}
                title={tab.habilitada ? tab.label : `${tab.label} (próximamente)`}
              >
                <span className={`flex-shrink-0 ${activa ? 'text-primary' : ''}`}>{tab.icono}</span>
                <span className="flex-1 truncate">{tab.label}</span>
                {renderIndicador(tab.indicador)}
              </button>
            );
          })}
        </nav>

        {/* Acciones del registro */}
        {onEliminar && (
          <div className="p-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEliminar}
              className="w-full text-[11px] text-destructive hover:bg-destructive/10 gap-1.5 h-7"
            >
              <Trash2 className="w-3 h-3" /> Eliminar registro
            </Button>
          </div>
        )}
      </div>

      {/* ===================== ÁREA CENTRAL (Grilla de imágenes del caso) ===================== */}
      <div className="flex-1 overflow-y-auto">
        {/* Barra de tabs superior (igual al nav de WebCeph) */}
        <div className="flex items-center gap-0 border-b border-border bg-card/80 backdrop-blur-sm px-4 overflow-x-auto sticky top-0 z-20">
          {PESTANAS.map((tab) => {
            const activa = pestanaActiva === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'digitalizacion') {
                    onAbrirDigitalizacion(estudio);
                    return;
                  }
                  setPestanaActiva(tab.id);
                }}
                className={`flex items-center gap-1.5 px-3 py-3 text-[11px] font-medium whitespace-nowrap border-b-2 transition-all ${
                  activa
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                {tab.label}
                {renderIndicador(tab.indicador)}
              </button>
            );
          })}
        </div>

        {/* GRILLA DE IMÁGENES (sección central principal) */}
        <div className="p-5 space-y-6">
          {([1, 2, 3, 4] as const).map((fila) => (
            <div key={fila} className="space-y-2">
              <h4 className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                {labelsFila[fila]}
              </h4>
              <div className="grid grid-cols-6 gap-2">
                {filas[fila].map((slot) => {
                  const url = imagenesSlots[slot.id];
                  const esPrincipal = slot.id === 'tele_lat';

                  return (
                    <div
                      key={slot.id}
                      onClick={() => handleSlotClick(slot.id)}
                      className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all group flex flex-col items-center justify-center
                        ${url
                          ? 'border-border/70 hover:border-primary/70'
                          : esPrincipal
                          ? 'border-primary/40 bg-primary/5 hover:border-primary'
                          : 'border-dashed border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-border'
                        }`}
                    >
                      {url ? (
                        <>
                          <img
                            src={url}
                            alt={slot.etiqueta}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          {/* Overlay al hover */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                            {!esPrincipal && (
                              <button
                                onClick={(e) => handleEliminarImagen(slot.id, e)}
                                className="bg-red-500/90 hover:bg-red-600 text-white rounded-full p-1"
                                title="Eliminar imagen"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                            <button className="bg-white/90 text-slate-800 rounded-full p-1" title="Ver / Editar">
                              <Eye className="w-3 h-3" />
                            </button>
                          </div>
                          {/* Etiqueta inferior */}
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 text-white">
                            <p className="text-[9px] font-bold leading-tight truncate">{slot.etiqueta}</p>
                            {slot.subetiqueta && (
                              <p className="text-[8px] opacity-70 truncate">{slot.subetiqueta}</p>
                            )}
                          </div>
                          {/* Badge de digitalización si es la telero */}
                          {esPrincipal && tieneDigitalizacion && (
                            <div className="absolute top-1 right-1">
                              <span className="bg-emerald-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full leading-none">
                                ✓ {numPuntos}pts
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {esPrincipal ? (
                            // Slot de telero vacía: botón de subir
                            <div className="flex flex-col items-center gap-1 p-2 text-center">
                              <ScanLine className="w-5 h-5 text-primary/50" />
                              <span className="text-[9px] font-bold text-primary/70">Teleradiografía</span>
                              <span className="text-[8px] text-muted-foreground">Subir / Abrir</span>
                            </div>
                          ) : (
                            // Slot vacío genérico
                            <div className="flex flex-col items-center gap-1 p-2 text-center opacity-60 group-hover:opacity-100 transition-opacity">
                              <Plus className="w-4 h-4 text-muted-foreground" />
                              <span className="text-[9px] font-medium text-muted-foreground leading-tight">{slot.etiqueta}</span>
                              {slot.subetiqueta && (
                                <span className="text-[8px] text-muted-foreground/60">{slot.subetiqueta}</span>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===================== PANEL DERECHO (Controles de la pestaña activa) ===================== */}
      <div className="w-60 flex-shrink-0 bg-card border-l border-border flex flex-col overflow-hidden shadow-sm">
        {/* Header del panel */}
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <span className="text-muted-foreground">
            {PESTANAS.find((p) => p.id === pestanaActiva)?.icono}
          </span>
          <h4 className="text-xs font-bold">
            {PESTANAS.find((p) => p.id === pestanaActiva)?.label}
          </h4>
        </div>

        {/* Contenido del panel */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col">
          {renderContenido()}
        </div>
      </div>
    </div>
  );
}
