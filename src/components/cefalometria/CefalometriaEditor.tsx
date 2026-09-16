import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  PUNTOS_CEFALOMETRICOS,
  SEGMENTOS_CEFALOMETRICOS,
  calcularAnalisisCefalometrico,
  distanciaPuntos,
} from '@/lib/cefalometria-calculos';
import {
  EstudioCefalometrico,
  PuntosCefalometricosMap,
  CalibracionRegla,
  CoordenadaPunto,
} from '@/types/cefalometria';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Save,
  CheckCircle2,
  Ruler,
  Printer,
  Eye,
  Move,
  FileCheck,
  ChevronRight,
  ChevronLeft,
  Upload,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

interface CefalometriaEditorProps {
  estudio: EstudioCefalometrico;
  pacienteNombre?: string;
  pacienteDocumento?: string;
  onGuardar: (estudioActualizado: EstudioCefalometrico) => Promise<void> | void;
  onEliminar?: () => void;
  onVolver?: () => void;
}

export function CefalometriaEditor({
  estudio,
  pacienteNombre = 'Paciente',
  pacienteDocumento = '',
  onGuardar,
  onEliminar,
  onVolver,
}: CefalometriaEditorProps) {
  // URL de imagen (local para poder reemplazarla sin recargar la página)
  const [imagenUrl, setImagenUrl] = useState<string>(estudio.imagen_url);
  const fileInputImagenRef = useRef<HTMLInputElement>(null);

  // Estado de los puntos anatómicos
  const [puntos, setPuntos] = useState<PuntosCefalometricosMap>(estudio.puntos || {});

  // Eliminar un punto individual por su id
  const handleEliminarPunto = React.useCallback((id: string) => {
    setPuntos((prev) => {
      const n = { ...prev };
      delete n[id];
      return n;
    });
    setGuardadoStatus('cambios');
    toast.info(`Punto ${id} eliminado.`);
  }, []);

  // Calibración
  const [calibracion, setCalibracion] = useState<CalibracionRegla>(
    estudio.calibracion || { distanciaRealMm: 10 }
  );
  const [modoCalibracion, setModoCalibracion] = useState(false);
  const [pasoCalibracion, setPasoCalibracion] = useState<1 | 2>(1);

  // Filtros de imagen
  const [brillo, setBrillo] = useState(100);
  const [contraste, setContraste] = useState(100);
  const [invertirColor, setInvertirColor] = useState(false);

  // Vista (Zoom y Pan)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Punto seleccionado para colocar o inspeccionar
  const [puntoActivoId, setPuntoActivoId] = useState<string>('S');
  const [mostrarEtiquetas, setMostrarEtiquetas] = useState(true);
  const [mostrarLineas, setMostrarLineas] = useState(true);
  const [filtroTipoPunto, setFiltroTipoPunto] = useState<'todos' | 'esqueletico' | 'dental' | 'blando'>('todos');

  // Arrastre de puntos
  const [arrastrandoPuntoId, setArrastrandoPuntoId] = useState<string | null>(null);
  const [puntoArrastrePos, setPuntoArrastrePos] = useState<CoordenadaPunto | null>(null);

  // Paneles
  const [tabDerecho, setTabDerecho] = useState<'herramientas' | 'puntos' | 'analisis'>('herramientas');
  const [panelDerechoAbierto, setPanelDerechoAbierto] = useState(true);
  const [guardadoStatus, setGuardadoStatus] = useState<'guardado' | 'guardando' | 'cambios'>('guardado');

  // Dimensiones de la imagen
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 800,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Si no hay puntos colocados, sugerir posiciones aproximadas iniciales al cargar la imagen
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const naturalW = e.currentTarget.naturalWidth || 800;
    const naturalH = e.currentTarget.naturalHeight || 800;
    setImgDimensions({ width: naturalW, height: naturalH });

    // Si aún no hay puntos, autogenerar los puntos sugeridos normalizados
    if (Object.keys(puntos).length === 0) {
      const sugeridos: PuntosCefalometricosMap = {};
      PUNTOS_CEFALOMETRICOS.forEach((p) => {
        if (p.sugerido) {
          sugeridos[p.id] = {
            x: Math.round(p.sugerido.x * naturalW),
            y: Math.round(p.sugerido.y * naturalH),
          };
        }
      });
      setPuntos(sugeridos);
      setGuardadoStatus('cambios');
    }
  };

  // Convertir coordenadas de pantalla (clientX, clientY) a coordenadas reales de la imagen
  const getCoordenadaImagen = useCallback(
    (clientX: number, clientY: number): CoordenadaPunto | null => {
      if (!imgRef.current) return null;
      const rect = imgRef.current.getBoundingClientRect();
      const xRel = clientX - rect.left;
      const yRel = clientY - rect.top;

      const x = Math.round((xRel / rect.width) * imgDimensions.width);
      const y = Math.round((yRel / rect.height) * imgDimensions.height);

      return {
        x: Math.max(0, Math.min(imgDimensions.width, x)),
        y: Math.max(0, Math.min(imgDimensions.height, y)),
      };
    },
    [imgDimensions]
  );

  // Cálculos cefalométricos en vivo
  const mediciones = useMemo(() => {
    return calcularAnalisisCefalometrico(puntos, calibracion);
  }, [puntos, calibracion]);

  // Manejo de clic sobre el lienzo (colocar punto o calibración)
  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) return;

    const coords = getCoordenadaImagen(e.clientX, e.clientY);
    if (!coords) return;

    if (modoCalibracion) {
      if (pasoCalibracion === 1) {
        setCalibracion((prev) => ({ ...prev, puntoA: coords }));
        setPasoCalibracion(2);
        toast.info('Marque el segundo punto en la regla milimetrada.');
      } else {
        const pA = calibracion.puntoA || coords;
        const distPx = distanciaPuntos(pA, coords);
        const distReal = calibracion.distanciaRealMm || 10;
        const pxPorMm = distPx / distReal;

        setCalibracion((prev) => ({
          ...prev,
          puntoB: coords,
          pixelesPorMm: Number(pxPorMm.toFixed(2)),
        }));
        setModoCalibracion(false);
        setPasoCalibracion(1);
        setGuardadoStatus('cambios');
        toast.success(`Calibración completada: 1 mm = ${pxPorMm.toFixed(2)} px.`);
      }
      return;
    }

    // Colocar el punto activo
    if (puntoActivoId) {
      setPuntos((prev) => ({
        ...prev,
        [puntoActivoId]: coords,
      }));
      setGuardadoStatus('cambios');

      // Avanzar al siguiente punto en la lista
      const idx = PUNTOS_CEFALOMETRICOS.findIndex((p) => p.id === puntoActivoId);
      if (idx >= 0 && idx < PUNTOS_CEFALOMETRICOS.length - 1) {
        setPuntoActivoId(PUNTOS_CEFALOMETRICOS[idx + 1].id);
      }
    }
  };

  // Inicio de arrastre de un punto
  const handlePointMouseDown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setArrastrandoPuntoId(id);
    setPuntoActivoId(id);
    const coords = getCoordenadaImagen(e.clientX, e.clientY);
    if (coords) setPuntoArrastrePos(coords);
  };

  // Movimiento del ratón (arrastrar punto o paneo)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (arrastrandoPuntoId) {
      const coords = getCoordenadaImagen(e.clientX, e.clientY);
      if (coords) {
        setPuntoArrastrePos(coords);
        setPuntos((prev) => ({
          ...prev,
          [arrastrandoPuntoId]: coords,
        }));
        setGuardadoStatus('cambios');
      }
      return;
    }

    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    }
  };

  // Fin de arrastre
  const handleMouseUp = () => {
    if (arrastrandoPuntoId) {
      setArrastrandoPuntoId(null);
      setPuntoArrastrePos(null);
    }
    if (isPanning) {
      setIsPanning(false);
    }
  };

  // Inicio de paneo
  const handlePanStart = (e: React.MouseEvent) => {
    if (e.button === 0 && e.target === containerRef.current) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  // Cambiar imagen de radiografía desde disco
  const handleCambiarImagen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        setImagenUrl(dataUrl);
        setPuntos({});  // Resetear puntos al cambiar radiografía
        setGuardadoStatus('cambios');
        toast.success('Imagen cargada. Ajuste los puntos anatómicos y guarde.');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Eliminar todos los puntos del trazado
  const handleLimpiarTrazado = () => {
    if (!window.confirm('¿Eliminar todos los puntos del trazado cefalométrico? Esta acción no se puede deshacer.')) return;
    setPuntos({});
    setCalibracion({ distanciaRealMm: 10 });
    setGuardadoStatus('cambios');
    toast.info('Trazado eliminado. Recuerde guardar.');
  };

  // Guardar estudio
  const handleGuardar = async () => {
    setGuardadoStatus('guardando');
    try {
      const actualizado: EstudioCefalometrico = {
        ...estudio,
        imagen_url: imagenUrl,
        puntos,
        calibracion,
        mediciones,
        progreso: 'digitalizacion',
        updated_at: new Date().toISOString(),
      };
      await onGuardar(actualizado);
      setGuardadoStatus('guardado');
      toast.success('Trazado cefalométrico guardado con éxito.');
    } catch {
      setGuardadoStatus('cambios');
      toast.error('Error al guardar el trazado.');
    }
  };

  // Restablecer puntos a valores sugeridos
  const handleRestablecerPuntos = () => {
    if (!window.confirm('¿Desea restablecer todos los puntos anatómicos a las posiciones estimadas?')) return;
    const sugeridos: PuntosCefalometricosMap = {};
    PUNTOS_CEFALOMETRICOS.forEach((p) => {
      if (p.sugerido) {
        sugeridos[p.id] = {
          x: Math.round(p.sugerido.x * imgDimensions.width),
          y: Math.round(p.sugerido.y * imgDimensions.height),
        };
      }
    });
    setPuntos(sugeridos);
    setGuardadoStatus('cambios');
    toast.info('Puntos restablecidos a posiciones sugeridas.');
  };

  // Imprimir reporte A4 de Cefalometría
  const handleImprimir = () => {
    const ventana = window.open('', '_blank');
    if (!ventana) {
      toast.error('Habilite las ventanas emergentes para imprimir.');
      return;
    }

    const fechaHoy = new Date().toLocaleDateString('es-PY');
    const filasMediciones = mediciones
      .map(
        (m) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 6px 8px; font-weight: bold;">${m.sigla}</td>
          <td style="padding: 6px 8px;">${m.nombre}</td>
          <td style="padding: 6px 8px; text-align: center; font-weight: bold; color: ${
            Math.abs(m.desviacion || 0) > 3 ? '#b91c1c' : '#15803d'
          };">${m.valor} ${m.unidad}</td>
          <td style="padding: 6px 8px; text-align: center; color: #64748b;">${m.norma}</td>
          <td style="padding: 6px 8px; font-size: 11px;">${m.interpretacion || '—'}</td>
        </tr>
      `
      )
      .join('');

    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Informe Cefalométrico - ${pacienteNombre}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; color: #1e293b; }
            h1 { color: #0f172a; margin-bottom: 4px; }
            .header { border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-bottom: 16px; }
            .meta { display: flex; justify-content: space-between; font-size: 13px; color: #475569; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 16px; }
            th { background: #f8fafc; padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1; }
            .footer { margin-top: 40px; text-align: right; font-size: 12px; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>INFORME CEFALOMÉTRICO COMPUTARIZADO</h1>
            <div class="meta">
              <div><strong>Paciente:</strong> ${pacienteNombre} | <strong>C.I.:</strong> ${pacienteDocumento || 'Sin doc'}</div>
              <div><strong>Fecha de Estudio:</strong> ${estudio.fecha || fechaHoy} | <strong>Impreso:</strong> ${fechaHoy}</div>
            </div>
          </div>
          <h3>Valores Diagnósticos Cefalométricos (Steiner / Ricketts / Tweed)</h3>
          <table>
            <thead>
              <tr>
                <th>Sigla</th>
                <th>Parámetro Clínico</th>
                <th style="text-align: center;">Medición</th>
                <th style="text-align: center;">Norma</th>
                <th>Diagnóstico Clínico</th>
              </tr>
            </thead>
            <tbody>
              ${filasMediciones}
            </tbody>
          </table>
          <div class="footer">
            <p>Firma del Odontólogo / Especialista en Ortodoncia: ___________________________</p>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    ventana.document.close();
  };

  // Puntos filtrados según la selección
  const puntosFiltrados = useMemo(() => {
    if (filtroTipoPunto === 'todos') return PUNTOS_CEFALOMETRICOS;
    return PUNTOS_CEFALOMETRICOS.filter((p) => p.tipo === filtroTipoPunto);
  }, [filtroTipoPunto]);

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Input oculto para reemplazar la imagen de radiografía */}
      <input
        ref={fileInputImagenRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCambiarImagen}
      />

      {/* Barra superior de herramientas estilo WebCeph */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-3">
          {onVolver && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onVolver}
              className="text-slate-300 hover:text-white hover:bg-slate-800 h-8 gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" /> Volver a Registros
            </Button>
          )}
          <div className="h-4 w-px bg-slate-700" />
          <div>
            <span className="font-semibold text-white text-sm">
              {pacienteNombre}
            </span>
            <span className="text-slate-400 ml-2">
              • {estudio.titulo || 'Teleradiografía Lateral'} ({estudio.fecha})
            </span>
          </div>
        </div>

        {/* Acciones principales */}
        <div className="flex items-center gap-2">
          {guardadoStatus === 'guardado' ? (
            <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800 gap-1 font-normal py-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Guardado
            </Badge>
          ) : guardadoStatus === 'guardando' ? (
            <Badge className="bg-blue-950 text-blue-300 border-blue-800 animate-pulse font-normal py-1">
              Guardando...
            </Badge>
          ) : (
            <Badge className="bg-amber-950 text-amber-300 border-amber-800 font-normal py-1">
              Cambios sin guardar
            </Badge>
          )}

          <Button
            size="sm"
            onClick={handleGuardar}
            disabled={guardadoStatus === 'guardando'}
            className="bg-primary hover:bg-primary/90 text-white gap-1.5 h-8 font-medium shadow-md"
          >
            <Save className="w-3.5 h-3.5" /> Guardar Trazado
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleImprimir}
            className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 h-8 gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" /> Imprimir Informe
          </Button>

          {/* Botones de cambio de imagen, limpieza y eliminación */}
          <div className="h-4 w-px bg-slate-700" />

          <label title="Cargar nueva radiografía (reemplaza la actual)">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCambiarImagen}
            />
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 gap-1.5 cursor-pointer"
              asChild
            >
              <span>
                <Upload className="w-3.5 h-3.5" /> Cambiar imagen
              </span>
            </Button>
          </label>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLimpiarTrazado}
            className="text-amber-400 hover:text-amber-300 hover:bg-slate-800 h-8 gap-1.5"
            title="Eliminar todos los puntos del trazado"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Limpiar trazado
          </Button>

          {onEliminar && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEliminar}
              className="text-red-400 hover:text-red-300 hover:bg-red-950/30 h-8 gap-1.5"
              title="Eliminar este registro cefalométrico permanentemente"
            >
              <Trash2 className="w-3.5 h-3.5" /> Eliminar registro
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPanelDerechoAbierto(!panelDerechoAbierto)}
            className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8"
            title={panelDerechoAbierto ? 'Ocultar panel lateral' : 'Mostrar panel lateral'}
          >
            {panelDerechoAbierto ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Área central dividida: Lienzo (izq) y Panel de Herramientas (der) */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* LIENZO DE TRABAJO (VISOR DE RADIOGRAFÍA) */}
        <div
          ref={containerRef}
          onMouseDown={handlePanStart}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="flex-1 bg-black relative overflow-hidden flex items-center justify-center cursor-crosshair"
          style={{ touchAction: 'none' }}
        >
          {/* Controles flotantes sobre el visor */}
          <div className="absolute top-4 left-4 z-30 flex flex-col gap-1.5 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-lg border border-slate-700 shadow-xl">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom((z) => Math.min(3.5, z + 0.2))}
              className="h-7 w-7 text-slate-200 hover:bg-slate-800 hover:text-white"
              title="Acercar (Zoom In)"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
              className="h-7 w-7 text-slate-200 hover:bg-slate-800 hover:text-white"
              title="Alejar (Zoom Out)"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="h-7 w-7 text-slate-200 hover:bg-slate-800 hover:text-white text-[10px] font-bold"
              title="Restablecer vista 100%"
            >
              1:1
            </Button>
            <div className="h-px bg-slate-700 my-0.5" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMostrarLineas(!mostrarLineas)}
              className={`h-7 w-7 ${mostrarLineas ? 'text-blue-400' : 'text-slate-500'} hover:bg-slate-800`}
              title="Alternar líneas anatómicas"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMostrarEtiquetas(!mostrarEtiquetas)}
              className={`h-7 w-7 ${mostrarEtiquetas ? 'text-emerald-400' : 'text-slate-500'} hover:bg-slate-800 text-[10px] font-bold`}
              title="Alternar nombres de puntos"
            >
              ABC
            </Button>
          </div>

          {/* Banner de Calibración activa */}
          {modoCalibracion && (
            <div className="absolute top-4 z-30 bg-amber-500 text-slate-950 px-4 py-2 rounded-full font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
              <Ruler className="w-4 h-4" />
              {pasoCalibracion === 1
                ? 'Paso 1: Haga clic en el inicio de la regla milimetrada'
                : 'Paso 2: Haga clic en la marca de los 10mm o 20mm'}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setModoCalibracion(false)}
                className="h-5 px-1.5 text-xs text-slate-950 hover:bg-amber-600 rounded"
              >
                Cancelar
              </Button>
            </div>
          )}

          {/* Lupa de precisión flotante mientras se arrastra un punto */}
          {arrastrandoPuntoId && puntoArrastrePos && (
            <div className="absolute bottom-4 left-4 z-30 bg-slate-900/90 border border-primary p-2 rounded-lg shadow-2xl flex items-center gap-3">
              <div className="text-xs">
                <span className="font-bold text-primary text-sm">
                  {PUNTOS_CEFALOMETRICOS.find((p) => p.id === arrastrandoPuntoId)?.simbolo || arrastrandoPuntoId}
                </span>
                <p className="text-[11px] text-slate-300">
                  X: {puntoArrastrePos.x}px | Y: {puntoArrastrePos.y}px
                </p>
              </div>
            </div>
          )}

          {/* CONTENEDOR TRANSFORMABLE CON ZOOM Y PAN */}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.05s ease-out',
            }}
            className="relative inline-block"
          >
            {/* Imagen Radiográfica con filtros CSS en tiempo real */}
            <img
              ref={imgRef}
              src={imagenUrl || '/placeholder-cefalometria.png'}
              alt="Teleradiografía lateral de cráneo"
              onLoad={handleImageLoad}
              style={{
                filter: `brightness(${brillo}%) contrast(${contraste}%) ${
                  invertirColor ? 'invert(100%)' : ''
                }`,
                maxWidth: '850px',
                height: 'auto',
                display: 'block',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
              className="rounded shadow-2xl"
            />

            {/* Capa SVG sobrepuesta para trazar líneas y puntos anatómicos */}
            <svg
              onClick={handleCanvasClick}
              viewBox={`0 0 ${imgDimensions.width} ${imgDimensions.height}`}
              className="absolute inset-0 w-full h-full cursor-crosshair"
              style={{ overflow: 'visible' }}
            >
              {/* Líneas y Planos Cefalométricos */}
              {mostrarLineas &&
                SEGMENTOS_CEFALOMETRICOS.map((seg) => {
                  const p1 = puntos[seg.de];
                  const p2 = puntos[seg.a];
                  if (!p1 || !p2) return null;

                  return (
                    <line
                      key={seg.id}
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={seg.color}
                      strokeWidth={seg.grosor || 1.5}
                      strokeDasharray={seg.dash ? '4,4' : undefined}
                      opacity={0.85}
                    />
                  );
                })}

              {/* Regla de Calibración visual si está calibrado */}
              {calibracion.puntoA && calibracion.puntoB && (
                <g>
                  <line
                    x1={calibracion.puntoA.x}
                    y1={calibracion.puntoA.y}
                    x2={calibracion.puntoB.x}
                    y2={calibracion.puntoB.y}
                    stroke="#eab308"
                    strokeWidth="3"
                  />
                  <circle cx={calibracion.puntoA.x} cy={calibracion.puntoA.y} r="4" fill="#eab308" />
                  <circle cx={calibracion.puntoB.x} cy={calibracion.puntoB.y} r="4" fill="#eab308" />
                  <text
                    x={(calibracion.puntoA.x + calibracion.puntoB.x) / 2}
                    y={(calibracion.puntoA.y + calibracion.puntoB.y) / 2 - 8}
                    fill="#eab308"
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {calibracion.distanciaRealMm} mm
                  </text>
                </g>
              )}

              {/* Puntos Cefalométricos Interactivos */}
              {PUNTOS_CEFALOMETRICOS.map((def) => {
                const pos = puntos[def.id];
                if (!pos) return null;

                const esActivo = puntoActivoId === def.id;
                const color = def.color || '#3b82f6';

                return (
                  <g
                    key={def.id}
                    onMouseDown={(e) => handlePointMouseDown(def.id, e)}
                    onContextMenu={(e) => {
                      // Clic derecho: eliminar el punto
                      e.preventDefault();
                      e.stopPropagation();
                      handleEliminarPunto(def.id);
                    }}
                    className="cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                    style={{ pointerEvents: 'all' }}
                  >
                    {/* Anillo de punto activo o seleccionado */}
                    {esActivo && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r="10"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="animate-ping opacity-75"
                      />
                    )}

                    {/* Punto principal con borde */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={esActivo ? '5.5' : '4'}
                      fill={color}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />

                    {/* Nombre del punto */}
                    {mostrarEtiquetas && (
                      <text
                        x={pos.x + 6}
                        y={pos.y - 4}
                        fill="#ffffff"
                        fontSize="10"
                        fontWeight="bold"
                        style={{
                          textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 2px black',
                          userSelect: 'none',
                        }}
                      >
                        {def.simbolo}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* PANEL LATERAL DERECHO ESTILO WEBCEPH */}
        {panelDerechoAbierto && (
          <div className="w-80 lg:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl z-20">
            {/* Selector de Pestañas del Panel */}
            <div className="flex border-b border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setTabDerecho('herramientas')}
                className={`flex-1 py-3 text-center border-b-2 transition-colors ${
                  tabDerecho === 'herramientas'
                    ? 'border-primary text-primary bg-slate-800/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Herramientas
              </button>
              <button
                onClick={() => setTabDerecho('puntos')}
                className={`flex-1 py-3 text-center border-b-2 transition-colors ${
                  tabDerecho === 'puntos'
                    ? 'border-primary text-primary bg-slate-800/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Puntos ({Object.keys(puntos).length})
              </button>
              <button
                onClick={() => setTabDerecho('analisis')}
                className={`flex-1 py-3 text-center border-b-2 transition-colors ${
                  tabDerecho === 'analisis'
                    ? 'border-primary text-primary bg-slate-800/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Diagnóstico ({mediciones.length})
              </button>
            </div>

            {/* CONTENIDO DEL PANEL */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
              {/* TAB 1: HERRAMIENTAS Y AJUSTES DE IMAGEN */}
              {tabDerecho === 'herramientas' && (
                <>
                  {/* Botones superiores estilo WebCeph */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toast.info('Arrastre cualquier punto directamente sobre la imagen para modificarlo.')}
                      className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 gap-1.5 h-9"
                    >
                      <Move className="w-3.5 h-3.5 text-blue-400" /> Modificar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRestablecerPuntos}
                      className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 gap-1.5 h-9"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> Restablecer
                    </Button>
                  </div>

                  {/* Sección Calibración Milimétrica */}
                  <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Ruler className="w-4 h-4 text-amber-400" /> Calibración de Escala (mm)
                      </Label>
                      {calibracion.pixelesPorMm ? (
                        <Badge variant="outline" className="bg-emerald-950 text-emerald-400 border-emerald-800 text-[10px]">
                          Calibrado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-slate-800 text-slate-400 border-slate-700 text-[10px]">
                          Sin calibrar
                        </Badge>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400">
                      Marque 2 puntos en la regla radiográfica milimetrada para calibrar la escala real.
                    </p>

                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={calibracion.distanciaRealMm}
                        onChange={(e) =>
                          setCalibracion((prev) => ({
                            ...prev,
                            distanciaRealMm: Number(e.target.value) || 10,
                          }))
                        }
                        className="h-8 bg-slate-900 border-slate-700 text-xs w-24 text-center font-bold"
                      />
                      <span className="text-slate-400 text-xs">mm</span>

                      <Button
                        size="sm"
                        onClick={() => {
                          setModoCalibracion(true);
                          setPasoCalibracion(1);
                          toast.info('Haga clic en el inicio de la regla milimetrada en la radiografía.');
                        }}
                        className="flex-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold h-8 text-xs"
                      >
                        {modoCalibracion ? 'Calibrando...' : 'Calibrar Regla'}
                      </Button>
                    </div>

                    {calibracion.pixelesPorMm && (
                      <p className="text-[10px] text-emerald-400">
                        1 mm = {calibracion.pixelesPorMm} px (Escala 1:{calibracion.pixelesPorMm.toFixed(1)})
                      </p>
                    )}
                  </div>

                  {/* Filtros de Imagen (Brillo y Contraste) */}
                  <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/70 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-200">Ajustes de Imagen</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setBrillo(100);
                          setContraste(100);
                          setInvertirColor(false);
                        }}
                        className="h-5 px-1.5 text-[10px] text-slate-400 hover:text-white"
                      >
                        Reiniciar
                      </Button>
                    </div>

                    {/* Slider de Brillo */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] text-slate-300">
                        <span>Brillo</span>
                        <span className="font-mono text-primary">{brillo}%</span>
                      </div>
                      <Slider
                        value={[brillo]}
                        min={30}
                        max={180}
                        step={1}
                        onValueChange={(vals) => setBrillo(vals[0])}
                        className="py-1"
                      />
                    </div>

                    {/* Slider de Contraste */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] text-slate-300">
                        <span>Contraste</span>
                        <span className="font-mono text-primary">{contraste}%</span>
                      </div>
                      <Slider
                        value={[contraste]}
                        min={40}
                        max={200}
                        step={1}
                        onValueChange={(vals) => setContraste(vals[0])}
                        className="py-1"
                      />
                    </div>

                    {/* Modo Rayos X Negativo / Invertido */}
                    <div className="flex items-center justify-between pt-1">
                      <Label className="text-[11px] text-slate-300 cursor-pointer" htmlFor="inv-switch">
                        Invertir Negativo (Rayos X)
                      </Label>
                      <Switch
                        id="inv-switch"
                        checked={invertirColor}
                        onCheckedChange={setInvertirColor}
                      />
                    </div>
                  </div>

                  {/* Resumen Rápido Diagnóstico */}
                  <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 space-y-2">
                    <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-primary" /> Diagnóstico Esquelético Principal
                    </span>
                    {(() => {
                      const anb = mediciones.find((m) => m.sigla === 'ANB');
                      const fma = mediciones.find((m) => m.sigla === 'FMA');
                      return (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-400">Patrón Sagital:</span>
                            <Badge className="bg-blue-900/60 text-blue-200 border-blue-700">
                              {anb?.interpretacion || 'Calculando...'}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-400">Patrón Vertical:</span>
                            <Badge className="bg-purple-900/60 text-purple-200 border-purple-700">
                              {fma?.interpretacion || 'Calculando...'}
                            </Badge>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}

              {/* TAB 2: TABLA Y SELECCIÓN DE PUNTOS */}
              {tabDerecho === 'puntos' && (
                <div className="space-y-3">
                  {/* Filtro por categoría */}
                  <div className="flex gap-1 bg-slate-800 p-1 rounded-lg">
                    {(['todos', 'esqueletico', 'dental', 'blando'] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setFiltroTipoPunto(cat)}
                        className={`flex-1 py-1 rounded text-[10px] capitalize transition-colors ${
                          filtroTipoPunto === cat
                            ? 'bg-primary text-white font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Lista de puntos */}
                  <div className="space-y-1 max-h-[550px] overflow-y-auto pr-1">
                    {puntosFiltrados.map((def) => {
                      const pos = puntos[def.id];
                      const esActivo = puntoActivoId === def.id;

                      return (
                        <div
                          key={def.id}
                          onClick={() => {
                            setPuntoActivoId(def.id);
                          }}
                          className={`p-2 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                            esActivo
                              ? 'bg-primary/20 border-primary shadow-sm'
                              : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-3.5 h-3.5 rounded-full border border-white/50 flex-shrink-0"
                              style={{ backgroundColor: def.color || '#3b82f6' }}
                            />
                            <div>
                              <div className="font-bold text-slate-100 flex items-center gap-1.5">
                                <span>{def.simbolo}</span>
                                <span className="text-[11px] font-normal text-slate-400">({def.nombre})</span>
                              </div>
                              <p className="text-[10px] text-slate-400 line-clamp-1">{def.descripcion}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {pos ? (
                              <span className="font-mono text-[10px] text-emerald-400">
                                {pos.x}, {pos.y}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">Pendiente</span>
                            )}
                            {/* Botón eliminar punto individual */}
                            {pos && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEliminarPunto(def.id);
                                }}
                                title={`Eliminar punto ${def.simbolo}`}
                                className="w-5 h-5 rounded-full bg-red-900/40 hover:bg-red-600 text-red-400 hover:text-white flex items-center justify-center transition-all ml-1"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: ANÁLISIS CEFALOMÉTRICO Y VALORES */}
              {tabDerecho === 'analisis' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-200">Resultados Cefalométricos</span>
                    <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">
                      Steiner / Tweed
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {mediciones.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700/60 space-y-1"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-200">{m.sigla}</span>
                          <span className="text-base font-extrabold text-primary font-mono">
                            {m.valor} {m.unidad}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{m.nombre}</p>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-700/40 text-[10px]">
                          <span className="text-slate-400">Norma: {m.norma}</span>
                          <span
                            className={`font-semibold ${
                              Math.abs(m.desviacion || 0) > 3 ? 'text-amber-400' : 'text-emerald-400'
                            }`}
                          >
                            {m.interpretacion || 'Normal'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
