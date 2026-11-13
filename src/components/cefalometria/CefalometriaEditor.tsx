import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  PUNTOS_CEFALOMETRICOS,
  PUNTOS_FRONTAL_RICKETTS,
  SECUENCIA_RICKETTS,
  SECUENCIA_FRONTAL_RICKETTS,
  SEGMENTOS_CEFALOMETRICOS,
  SEGMENTOS_FRONTAL_RICKETTS,
  calcularAnalisisCefalometrico,
  calcularAnalisisFrontalRicketts,
  calcularSintesisRicketts,
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
  PenLine,
  Eye,
  Undo2,
  Move,
  FileCheck,
  ChevronRight,
  ChevronLeft,
  Upload,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { esRutaDeposito, useUrlImagenCefalometria } from '@/api/cefalometria';
import { imprimirInformeCefalometrico } from '@/lib/imprimir';
import { showSwal } from '@/components/ui/swal';

interface CefalometriaEditorProps {
  estudio: EstudioCefalometrico;
  pacienteNombre?: string;
  pacienteDocumento?: string;
  onGuardar: (estudioActualizado: EstudioCefalometrico) => Promise<EstudioCefalometrico | void> | void;
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
  // Guardada: es una ruta del depósito privado y hay que pedir un enlace.
  // Recién elegida del disco: es un data URL y se muestra tal cual.
  const { data: urlFirmada, isError: errorImagen } = useUrlImagenCefalometria(
    esRutaDeposito(imagenUrl) ? imagenUrl : null
  );
  const srcImagen = esRutaDeposito(imagenUrl) ? urlFirmada : imagenUrl;

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
  const [distanciaInput, setDistanciaInput] = useState<string>(
    String(estudio.calibracion?.distanciaRealMm || 10)
  );
  const [historialPuntos, setHistorialPuntos] = useState<string[]>([]);
  const [modoCalibracion, setModoCalibracion] = useState(false);
  const [pasoCalibracion, setPasoCalibracion] = useState<1 | 2>(1);

  // Filtros de imagen
  const [brillo, setBrillo] = useState(100);
  const [contraste, setContraste] = useState(100);
  const [invertirColor, setInvertirColor] = useState(false);

  // Vista (Zoom y desplazamiento)
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  // La guía no debe tapar una referencia anatómica. Se puede llevar a
  // cualquier zona libre del visor desde su barra superior.
  const [guiaPosicion, setGuiaPosicion] = useState<{ x: number; y: number } | null>(null);
  const [moviendoGuia, setMoviendoGuia] = useState(false);
  const [inicioMovimientoGuia, setInicioMovimientoGuia] = useState({ x: 0, y: 0 });
  const [guiaVisible, setGuiaVisible] = useState(true);

  // Punto seleccionado para colocar o inspeccionar
  // Asistente de marcado: guía punto por punto en el orden de Ricketts (o por
  // todos los puntos si se apaga). Cada clic coloca el punto que toca y pasa
  // solo al siguiente que falte. No coloca nada por su cuenta: cada punto lo
  // marca el profesional sobre ESTA radiografía.
  const esFrontal = estudio.tipo === 'radiografia_pa';
  const catalogoPuntos = esFrontal ? PUNTOS_FRONTAL_RICKETTS : PUNTOS_CEFALOMETRICOS;
  const catalogoSegmentos = esFrontal ? SEGMENTOS_FRONTAL_RICKETTS : SEGMENTOS_CEFALOMETRICOS;
  const secuenciaRicketts = esFrontal ? SECUENCIA_FRONTAL_RICKETTS : SECUENCIA_RICKETTS;

  const [guiaRicketts, setGuiaRicketts] = useState(true);
  const secuencia = useMemo(
    () => (guiaRicketts ? secuenciaRicketts : catalogoPuntos.map((p) => p.id)),
    [guiaRicketts, secuenciaRicketts, catalogoPuntos]
  );
  const siguienteSinMarcar = (desde: string | null, marcados: PuntosCefalometricosMap): string => {
    const i = desde ? secuencia.indexOf(desde) : -1;
    const orden = [...secuencia.slice(i + 1), ...secuencia.slice(0, Math.max(i + 1, 0))];
    return orden.find((id) => !marcados[id]) ?? '';
  };
  const [puntoActivoId, setPuntoActivoId] = useState<string>(
    () => secuenciaRicketts.find((id) => !(estudio.puntos || {})[id]) ?? ''
  );
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const guiaRef = useRef<HTMLDivElement>(null);
  // Punto bajo el mouse: muestra un cartel con su nombre y qué es.
  const [hoverPunto, setHoverPunto] = useState<{ id: string; x: number; y: number } | null>(null);
  const mostrarCartel = (id: string, e: React.MouseEvent) => {
    const caja = containerRef.current?.getBoundingClientRect();
    if (!caja) return;
    setHoverPunto({ id, x: e.clientX - caja.left, y: e.clientY - caja.top });
  };
  const imgRef = useRef<HTMLImageElement>(null);

  // Si no hay puntos colocados, sugerir posiciones aproximadas iniciales al cargar la imagen
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const naturalW = e.currentTarget.naturalWidth || 800;
    const naturalH = e.currentTarget.naturalHeight || 800;
    setImgDimensions({ width: naturalW, height: naturalH });
    // Antes, si no había puntos, se colocaban solos en posiciones de una
    // plantilla genérica, y con eso ya aparecía un diagnóstico (Clase II,
    // hiperdivergente…) sin que nadie hubiera marcado nada en ESTA radiografía.
    // Ahora cada punto lo coloca el profesional; la plantilla es opcional.
  };

  // Sincronizar estado local cuando cambia el estudio activo
  useEffect(() => {
    setImagenUrl(estudio.imagen_url || '');
    setPuntos(estudio.puntos || {});
    setCalibracion(estudio.calibracion || { distanciaRealMm: 10 });
    setDistanciaInput(String(estudio.calibracion?.distanciaRealMm || 10));
    setHistorialPuntos([]);
    setModoCalibracion(false);
    setPasoCalibracion(1);
    setZoom(1);
    setFiltroTipoPunto('todos');
    setGuardadoStatus('guardado');
    setPuntoActivoId(secuenciaRicketts.find((id) => !(estudio.puntos || {})[id]) ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estudio.id]);

  const deshacerUltimoPunto = useCallback(() => {
    setHistorialPuntos((prev) => {
      if (!prev.length) return prev;
      const ultimoId = prev[prev.length - 1];
      setPuntos((actuales) => {
        const copia = { ...actuales };
        delete copia[ultimoId];
        return copia;
      });
      setPuntoActivoId(ultimoId);
      setGuardadoStatus('cambios');
      return prev.slice(0, -1);
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (historialPuntos.length > 0) {
          e.preventDefault();
          deshacerUltimoPunto();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [historialPuntos.length, deshacerUltimoPunto]);

  // Listener nativo no-pasivo para zoom con Ctrl/Cmd + rueda sin advertencia de navegador
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!srcImagen) return;
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const paso = e.deltaY < 0 ? 0.15 : -0.15;
      setZoom((actual) => Math.max(0.4, Math.min(3.5, Number((actual + paso).toFixed(2)))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [srcImagen]);

  // Convertir coordenadas de pantalla (clientX, clientY) a coordenadas reales de la imagen
  const getCoordenadaImagen = useCallback(
    (clientX: number, clientY: number): CoordenadaPunto | null => {
      if (!imgRef.current) return null;
      const rect = imgRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
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
    return esFrontal
      ? calcularAnalisisFrontalRicketts(puntos, calibracion)
      : calcularAnalisisCefalometrico(puntos, calibracion);
  }, [esFrontal, puntos, calibracion]);

  const sintesisRicketts = useMemo(() => {
    return calcularSintesisRicketts(mediciones);
  }, [mediciones]);

  // Manejo de clic sobre el lienzo (colocar punto o calibración)
  const handleCanvasClick = (e: React.MouseEvent<SVGElement>) => {
    if (isPanning || !srcImagen) return;

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
        if (distPx < 5) {
          toast.warning('Los dos puntos están demasiado cerca. Marque los extremos de la regla.');
          return;
        }
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

    // Colocar el punto activo y pasar al siguiente que falte
    if (puntoActivoId) {
      const nuevos = { ...puntos, [puntoActivoId]: coords };
      setPuntos(nuevos);
      setHistorialPuntos((prev) => [...prev.filter((id) => id !== puntoActivoId), puntoActivoId]);
      setGuardadoStatus('cambios');

      const siguiente = siguienteSinMarcar(puntoActivoId, nuevos);
      setPuntoActivoId(siguiente);
      if (!siguiente) {
        toast.success(
          guiaRicketts
            ? 'Puntos de Ricketts completos. Revise el diagnóstico y guarde.'
            : 'Todos los puntos marcados. Revise el diagnóstico y guarde.'
        );
        setTabDerecho('analisis');
      }
    }
  };

  // Inicio de arrastre de un punto
  const handlePointMouseDown = (id: string, e: React.MouseEvent) => {
    // Shift + clic o botón central queda reservado para desplazarse (paneo)
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) return;
    e.stopPropagation();
    setArrastrandoPuntoId(id);
    setPuntoActivoId(id);
    const coords = getCoordenadaImagen(e.clientX, e.clientY);
    if (coords) setPuntoArrastrePos(coords);
  };

  // Movimiento del ratón (arrastrar punto o paneo)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (moviendoGuia) {
      const contenedor = containerRef.current;
      const guia = guiaRef.current;
      if (!contenedor || !guia) return;
      const caja = contenedor.getBoundingClientRect();
      setGuiaPosicion({
        x: Math.max(0, Math.min(caja.width - guia.offsetWidth, e.clientX - caja.left - inicioMovimientoGuia.x)),
        y: Math.max(0, Math.min(caja.height - guia.offsetHeight, e.clientY - caja.top - inicioMovimientoGuia.y)),
      });
      return;
    }

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

    if (isPanning && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = startPan.scrollLeft - (e.clientX - startPan.x);
      scrollContainerRef.current.scrollTop = startPan.scrollTop - (e.clientY - startPan.y);
    }
  };

  // Fin de arrastre
  const handleMouseUp = () => {
    if (moviendoGuia) setMoviendoGuia(false);
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
    // El clic normal sigue colocando puntos. Para recorrer la imagen arrastrando,
    // use Shift + arrastre o el botón central, además de las barras de scroll.
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      e.preventDefault();
      const scroller = scrollContainerRef.current;
      setIsPanning(true);
      setStartPan({
        x: e.clientX,
        y: e.clientY,
        scrollLeft: scroller?.scrollLeft ?? 0,
        scrollTop: scroller?.scrollTop ?? 0,
      });
    }
  };

  const handleInicioMovimientoGuia = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || !containerRef.current || !guiaRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const cajaContenedor = containerRef.current.getBoundingClientRect();
    const cajaGuia = guiaRef.current.getBoundingClientRect();
    setGuiaPosicion({ x: cajaGuia.left - cajaContenedor.left, y: cajaGuia.top - cajaContenedor.top });
    setInicioMovimientoGuia({ x: e.clientX - cajaGuia.left, y: e.clientY - cajaGuia.top });
    setMoviendoGuia(true);
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
        // La escala también: la regla de la radiografía vieja no mide la nueva.
        setCalibracion((prev) => ({ distanciaRealMm: prev.distanciaRealMm || 10 }));
        setGuardadoStatus('cambios');
        toast.success('Imagen cargada. Ajuste los puntos anatómicos y guarde.');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Eliminar todos los puntos del trazado
  const handleLimpiarTrazado = async () => {
    const { isConfirmed } = await showSwal({
      icon: 'warning',
      title: '¿Eliminar todo el trazado?',
      text: 'Se eliminarán todos los puntos y la calibración. Esta acción no se puede deshacer.',
      showCancelButton: true,
      confirmButtonText: 'Eliminar trazado',
      cancelButtonText: 'Cancelar',
    });
    if (!isConfirmed) return;
    setPuntos({});
    setCalibracion({ distanciaRealMm: 10 });
    setGuardadoStatus('cambios');
    toast.info('Trazado eliminado. Recuerde guardar.');
  };

  const handleIniciarDigitalizacion = () => {
    setModoCalibracion(false);
    setPuntoActivoId(secuencia.find((id) => !puntos[id]) ?? '');
    setTabDerecho('puntos');

    const faltantes = secuencia.filter((id) => !puntos[id]).length;
    if (faltantes) {
      toast.info(`Digitalización iniciada: faltan ${faltantes} puntos.`);
    } else {
      toast.success('Todos los puntos de la guía están completos. Revise el diagnóstico.');
      setTabDerecho('analisis');
    }
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
        progreso: estudio.progreso ?? 'digitalizacion',
        updated_at: new Date().toISOString(),
      };
      const guardado = await onGuardar(actualizado);
      // La imagen recién elegida ya se subió: de acá en más se usa su ruta.
      if (guardado) setImagenUrl(guardado.imagen_url);
      setGuardadoStatus('guardado');
      toast.success('Trazado cefalométrico guardado con éxito.');
    } catch (error) {
      setGuardadoStatus('cambios');
      toast.error(error instanceof Error ? error.message : 'Error al guardar el trazado.');
    }
  };

  // Restablecer puntos a valores sugeridos
  const handleRestablecerPuntos = async () => {
    const { isConfirmed } = await showSwal({
      icon: 'warning',
      title: '¿Usar la plantilla de puntos?',
      text:
        'Colocará los puntos en posiciones promedio, no en esta radiografía. Son solo una guía: ajuste cada punto antes de usar las medidas.',
      showCancelButton: true,
      confirmButtonText: 'Usar plantilla',
      cancelButtonText: 'Cancelar',
    });
    if (!isConfirmed) return;
    const sugeridos: PuntosCefalometricosMap = {};
    catalogoPuntos.forEach((p) => {
      if (p.sugerido) {
        sugeridos[p.id] = {
          x: Math.round(p.sugerido.x * imgDimensions.width),
          y: Math.round(p.sugerido.y * imgDimensions.height),
        };
      }
    });
    setPuntos(sugeridos);
    setGuardadoStatus('cambios');
    toast.info('Plantilla colocada. Ajuste cada punto sobre la radiografía.');
  };

  // Radiografía con el trazado dibujado encima, para el informe impreso.
  const componerImagenTrazado = async (): Promise<string | null> => {
    if (!srcImagen) return null;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = srcImagen;
    await img.decode();
    const ancho = img.naturalWidth;
    const alto = img.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    // Grosor proporcional al tamaño de la imagen, así se ve igual en papel.
    const k = Math.max(1, ancho / 800);
    catalogoSegmentos.forEach((seg) => {
      const p1 = puntos[seg.de];
      const p2 = puntos[seg.a];
      if (!p1 || !p2) return;
      ctx.strokeStyle = seg.color;
      ctx.lineWidth = (seg.grosor || 1.5) * k;
      ctx.setLineDash(seg.dash ? [4 * k, 4 * k] : []);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.font = `bold ${Math.round(10 * k)}px Arial`;
    catalogoPuntos.forEach((def) => {
      const p = puntos[def.id];
      if (!p) return;
      ctx.fillStyle = def.color || '#3b82f6';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5 * k;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4 * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.fillText(def.simbolo, p.x + 6 * k, p.y - 4 * k);
    });
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const handleImprimir = async () => {
    let imagenTrazado: string | null = null;
    try {
      imagenTrazado = await componerImagenTrazado();
    } catch {
      toast.warning('No se pudo incluir la radiografía en el informe; se imprime solo la tabla.');
    }
    imprimirInformeCefalometrico({
      pacienteNombre,
      pacienteDocumento,
      fecha: estudio.fecha,
      imagenTrazado,
      calibrado: Boolean(calibracion.pixelesPorMm),
      puntosColocados: Object.keys(puntos).length,
      mediciones,
    });
  };

  const handleVolver = async () => {
    if (guardadoStatus === 'cambios') {
      const { isConfirmed } = await showSwal({
        icon: 'warning',
        title: 'Hay cambios sin guardar',
        text: 'Si sale ahora, se perderán los cambios del trazado.',
        showCancelButton: true,
        confirmButtonText: 'Salir sin guardar',
        cancelButtonText: 'Seguir editando',
      });
      if (!isConfirmed) return;
    }
    onVolver?.();
  };

  // Puntos filtrados según la selección
  const puntosFiltrados = useMemo(() => {
    if (filtroTipoPunto === 'todos') return catalogoPuntos;
    return catalogoPuntos.filter((p) => p.tipo === filtroTipoPunto);
  }, [filtroTipoPunto, catalogoPuntos]);

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
              onClick={handleVolver}
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
            size="sm"
            variant="outline"
            onClick={handleIniciarDigitalizacion}
            className="border-cyan-600/80 bg-cyan-950/50 text-cyan-200 hover:bg-cyan-900/70 hover:text-white gap-1.5 h-8 font-medium"
            title="Iniciar o retomar el trazado cefalométrico guiado"
          >
            <PenLine className="w-3.5 h-3.5" /> Digitalización
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

          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputImagenRef.current?.click()}
            className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 gap-1.5"
            title="Cargar nueva radiografía (reemplaza la actual)"
          >
            <Upload className="w-3.5 h-3.5" /> Cambiar imagen
          </Button>

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
        {/* Lienzo de dibujo: se maneja con el mouse por definición (colocar y
            arrastrar puntos); no tiene equivalente de teclado. */}
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <div
          ref={containerRef}
          onMouseDown={handlePanStart}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`flex-1 bg-black relative overflow-hidden ${isPanning ? 'cursor-grabbing' : 'cursor-crosshair'}`}
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
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollLeft = 0;
                  scrollContainerRef.current.scrollTop = 0;
                }
              }}
              className="h-7 w-7 text-slate-200 hover:bg-slate-800 hover:text-white text-[10px] font-bold"
              title="Restablecer vista 100% y posición"
            >
              1:1
            </Button>
            <span className="px-0.5 text-center text-[9px] font-medium text-slate-400" title="Use Ctrl + rueda del mouse para acercar o alejar">
              {Math.round(zoom * 100)}%
            </span>
            {!guiaVisible && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setGuiaVisible(true)}
                className="h-7 w-7 text-cyan-300 hover:bg-slate-800 hover:text-white text-[10px] font-bold"
                title="Mostrar guía de marcado"
                aria-label="Mostrar guía de marcado"
              >
                ?
              </Button>
            )}
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
            <Button
              variant="ghost"
              size="icon"
              disabled={historialPuntos.length === 0}
              onClick={deshacerUltimoPunto}
              className="h-7 w-7 text-slate-200 hover:bg-slate-800 hover:text-white disabled:opacity-30"
              title="Deshacer último punto (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Cartel del punto bajo el mouse */}
          {hoverPunto && !arrastrandoPuntoId && (() => {
            const def = catalogoPuntos.find((p) => p.id === hoverPunto.id);
            if (!def) return null;
            const ancho = containerRef.current?.clientWidth ?? 0;
            const izquierda = hoverPunto.x + 290 > ancho ? hoverPunto.x - 284 : hoverPunto.x + 14;
            return (
              <div
                className="pointer-events-none absolute z-40 w-[270px] rounded-lg border border-slate-600 bg-slate-900/95 px-3 py-2 text-xs shadow-2xl"
                style={{ left: izquierda, top: hoverPunto.y + 14 }}
              >
                <p className="font-bold text-white">
                  <span style={{ color: def.color }}>●</span> {def.simbolo}
                  <span className="font-normal text-slate-300"> · {def.nombre}</span>
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{def.descripcion}</p>
                <p className="mt-1 text-[10px] text-slate-500">Arrastre para moverlo · clic derecho para borrarlo</p>
              </div>
            );
          })()}

          {/* Asistente: qué punto toca, qué es y dónde buscarlo */}
          {!modoCalibracion && srcImagen && guiaVisible && (() => {
            const def = catalogoPuntos.find((p) => p.id === puntoActivoId);
            const hechos = secuencia.filter((id) => puntos[id]).length;
            const posicion = def ? secuencia.indexOf(def.id) : -1;
            const irA = (paso: number) => {
              if (posicion < 0) return;
              const n = secuencia.length;
              setPuntoActivoId(secuencia[(posicion + paso + n) % n]);
            };
            return (
              <div
                ref={guiaRef}
                className={`absolute z-30 w-[min(640px,calc(100%-6rem))] rounded-xl border border-cyan-500/40 bg-slate-900/95 px-4 py-2.5 text-xs shadow-2xl backdrop-blur ${moviendoGuia ? 'cursor-grabbing' : ''}`}
                style={
                  guiaPosicion
                    ? { left: guiaPosicion.x, top: guiaPosicion.y }
                    : { left: '50%', top: '0.75rem', transform: 'translateX(-50%)' }
                }
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <button
                      type="button"
                      onMouseDown={handleInicioMovimientoGuia}
                      className="flex h-6 w-6 flex-shrink-0 cursor-grab items-center justify-center rounded text-cyan-300 hover:bg-slate-800 hover:text-white active:cursor-grabbing"
                      title="Arrastre para mover la guía y despejar la radiografía"
                      aria-label="Mover guía"
                    >
                      <Move className="h-3.5 w-3.5" />
                    </button>
                    <span className="font-semibold text-cyan-300">
                      {guiaRicketts ? 'Guía Ricketts' : 'Todos los puntos'} · {hechos} de {secuencia.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px] text-slate-300 hover:bg-slate-800"
                      onClick={() => irA(-1)} disabled={!def}>
                      Anterior
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px] text-slate-300 hover:bg-slate-800"
                      onClick={() => setPuntoActivoId(siguienteSinMarcar(puntoActivoId, puntos))} disabled={!def}>
                      Saltar
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px] text-slate-400 hover:bg-slate-800"
                      onClick={() => {
                        setGuiaRicketts((g) => !g);
                        setPuntoActivoId('');
                      }}
                      title="Cambiar entre los puntos de Ricketts y todos los puntos">
                      {guiaRicketts ? 'Ver todos' : 'Solo Ricketts'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[11px] text-slate-400 hover:bg-slate-800 hover:text-white"
                      onClick={() => setGuiaVisible(false)}
                      title="Ocultar la guía para ver y marcar la radiografía"
                    >
                      Ocultar
                    </Button>
                  </div>
                </div>
                {def ? (
                  <p className="mt-1 text-slate-200">
                    Marque <span className="font-bold text-white">{def.simbolo}</span>
                    <span className="text-slate-400"> · {def.nombre}</span>
                    <span className="block text-[11px] text-slate-400">{def.descripcion}</span>
                  </p>
                ) : hechos < secuencia.length ? (
                  <button type="button" className="mt-1 text-cyan-300 underline"
                    onClick={() => setPuntoActivoId(siguienteSinMarcar(null, puntos))}>
                    Seguir marcando los puntos que faltan
                  </button>
                ) : (
                  <p className="mt-1 text-emerald-300">
                    Listo. Para corregir un punto, arrástrelo o elíjalo en la pestaña Puntos.
                  </p>
                )}
              </div>
            );
          })()}

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
                  {catalogoPuntos.find((p) => p.id === arrastrandoPuntoId)?.simbolo || arrastrandoPuntoId}
                </span>
                <p className="text-[11px] text-slate-300">
                  X: {puntoArrastrePos.x}px | Y: {puntoArrastrePos.y}px
                </p>
              </div>
            </div>
          )}

          {/* CONTENEDOR CON SCROLL BIDIRECCIONAL Y ZOOM */}
          <div
            ref={scrollContainerRef}
            className="w-full h-full overflow-auto flex"
          >
            <div className="m-auto p-6 flex-shrink-0">
              <div
                style={
                  srcImagen
                    ? {
                        width: Math.round(Math.min(imgDimensions.width, 850) * zoom),
                        height: Math.round(
                          Math.min(imgDimensions.width, 850) *
                            (imgDimensions.height / Math.max(imgDimensions.width, 1)) *
                            zoom
                        ),
                      }
                    : undefined
                }
                className="relative inline-block"
              >
                {/* Imagen Radiográfica con filtros CSS en tiempo real */}
                {!srcImagen && (
                  <div className="w-[600px] max-w-full h-[400px] flex items-center justify-center text-slate-400 text-sm">
                    {errorImagen
                      ? 'No se pudo abrir la radiografía. Revise la conexión.'
                      : imagenUrl
                      ? 'Cargando radiografía…'
                      : 'Este registro todavía no tiene radiografía: use «Cambiar imagen» para cargarla.'}
                  </div>
                )}
                <img
                  ref={imgRef}
                  src={srcImagen || undefined}
                  crossOrigin="anonymous"
                  alt={esFrontal ? 'Radiografía frontal (PA)' : 'Teleradiografía lateral de cráneo'}
                  onLoad={handleImageLoad}
                  style={{
                    filter: `brightness(${brillo}%) contrast(${contraste}%) ${
                      invertirColor ? 'invert(100%)' : ''
                    }`,
                    width: '100%',
                    height: '100%',
                    display: srcImagen ? 'block' : 'none',
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                  className="rounded shadow-2xl"
                />

            {/* Capa SVG sobrepuesta para trazar líneas y puntos anatómicos */}
            <svg
              viewBox={`0 0 ${imgDimensions.width} ${imgDimensions.height}`}
              className="absolute inset-0 w-full h-full cursor-crosshair"
              style={{ overflow: 'visible', pointerEvents: 'all' }}
              onMouseDown={(e) => {
                // Solo el botón izquierdo: el derecho es para borrar un punto.
                // Shift + arrastre queda reservado para desplazar la vista.
                if (e.button === 0 && !e.shiftKey) handleCanvasClick(e);
              }}
            >
              {/* Superficie de captura: responde al primer clic sobre cualquier
                  parte de la radiografía, aun sin puntos. */}
              <rect
                x="0"
                y="0"
                width={imgDimensions.width}
                height={imgDimensions.height}
                fill="#000000"
                fillOpacity="0.001"
                pointerEvents="all"
              />

              {/* Líneas y Planos Cefalométricos */}
              {mostrarLineas &&
                catalogoSegmentos.map((seg) => {
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
                    >
                      <title>{seg.etiqueta ?? `${seg.de} – ${seg.a}`}</title>
                    </line>
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
              {catalogoPuntos.map((def) => {
                const pos = puntos[def.id];
                if (!pos) return null;

                const esActivo = puntoActivoId === def.id;
                const color = def.color || '#3b82f6';

                return (
                  <g
                    key={def.id}
                    onMouseDown={(e) => handlePointMouseDown(def.id, e)}
                    onClick={(e) => e.stopPropagation()}
                    onMouseEnter={(e) => mostrarCartel(def.id, e)}
                    onMouseLeave={() => setHoverPunto(null)}
                    onContextMenu={(e) => {
                      // Clic derecho: eliminar el punto
                      e.preventDefault();
                      e.stopPropagation();
                      handleEliminarPunto(def.id);
                    }}
                    className="cursor-grab active:cursor-grabbing"
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
                  <div className={`grid gap-2 ${esFrontal ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toast.info('Arrastre cualquier punto directamente sobre la imagen para modificarlo.')}
                      className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 gap-1.5 h-9"
                    >
                      <Move className="w-3.5 h-3.5 text-blue-400" /> Modificar
                    </Button>
                    {!esFrontal && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!srcImagen}
                        onClick={handleRestablecerPuntos}
                        className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 gap-1.5 h-9"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> Plantilla guía
                      </Button>
                    )}
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
                        value={distanciaInput}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setDistanciaInput(raw);
                          const val = Number(raw);
                          if (val > 0) {
                            setCalibracion((prev) => ({
                              ...prev,
                              distanciaRealMm: val,
                            }));
                          }
                        }}
                        onBlur={() => {
                          const val = Number(distanciaInput);
                          const corregido = val > 0 ? val : 10;
                          setDistanciaInput(String(corregido));
                          setCalibracion((prev) => ({
                            ...prev,
                            distanciaRealMm: corregido,
                          }));
                        }}
                        className="h-8 bg-slate-900 border-slate-700 text-xs w-24 text-center font-bold"
                      />
                      <span className="text-slate-400 text-xs">mm</span>

                      <Button
                        size="sm"
                        disabled={!srcImagen}
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
                  {!esFrontal && (
                  <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 space-y-2">
                    <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-primary" /> Diagnóstico Esquelético Principal
                    </span>
                    {(() => {
                      const anb = mediciones.find((m) => m.sigla === 'ANB');
                      const fma = mediciones.find((m) => m.sigla === 'FMA');
                      const faltanAnb = ['S', 'N', 'A', 'B'].filter((id) => !puntos[id]);
                      const faltanFma = ['Po', 'Or', 'Go', 'Me'].filter((id) => !puntos[id]);
                      return (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-400">Patrón Sagital:</span>
                            <Badge
                              className="bg-blue-900/60 text-blue-200 border-blue-700"
                              title={anb ? undefined : `Marque: ${faltanAnb.join(', ')}`}
                            >
                              {anb?.interpretacion ?? `Faltan: ${faltanAnb.join(', ')}`}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-400">Patrón Vertical:</span>
                            <Badge
                              className="bg-purple-900/60 text-purple-200 border-purple-700"
                              title={fma ? undefined : `Marque: ${faltanFma.join(', ')}`}
                            >
                              {fma?.interpretacion ?? `Faltan: ${faltanFma.join(', ')}`}
                            </Badge>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  )}
                </>
              )}

              {/* TAB 2: TABLA Y SELECCIÓN DE PUNTOS */}
              {tabDerecho === 'puntos' && (
                <div className="space-y-3">
                  {/* Filtro por categoría */}
                  <div className="flex gap-1 bg-slate-800 p-1 rounded-lg">
                    {(esFrontal ? (['todos', 'esqueletico', 'dental'] as const) : (['todos', 'esqueletico', 'dental', 'blando'] as const)).map((cat) => (
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
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setPuntoActivoId(def.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setPuntoActivoId(def.id);
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
                      {mediciones.length} medidas
                    </Badge>
                  </div>
                  {!calibracion.pixelesPorMm && (
                    <p className="rounded-md border border-amber-700/50 bg-amber-950/40 p-2 text-[11px] text-amber-300">
                      {esFrontal
                        ? 'Sin calibrar: faltan los factores en milímetros del análisis frontal (relación molar, dimensiones transversales, línea media y plano oclusal). Calibre con la regla de la radiografía.'
                        : 'Sin calibrar: faltan los factores en milímetros (relación molar/canina, overjet/overbite, A6-PTV, convexidad, incisivos a A-Pog, labios, McNamara, Wits, CC-N, Go-CF, Xi-PM). Calibre con la regla de la radiografía.'}
                    </p>
                  )}

                  {/* Síntesis Ricketts (Lateral 33 Factores o Frontal 18 Factores) */}
                  {!esFrontal ? (
                    <div className="p-3 rounded-xl bg-slate-800/80 border border-cyan-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-cyan-300 text-xs">
                          Ricketts · 33 Factores
                        </span>
                        <Badge variant="outline" className="text-[10px] border-cyan-500/40 text-cyan-200">
                          {sintesisRicketts.factoresMedidos} / {sintesisRicketts.totalFactores}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-400">Biotipo (VERT):</span>
                          <span className="font-semibold text-slate-100 text-right">
                            {sintesisRicketts.vert !== null
                              ? `${sintesisRicketts.biotipo} (${sintesisRicketts.vert > 0 ? '+' : ''}${sintesisRicketts.vert})`
                              : sintesisRicketts.biotipo}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-400">Clase esquelética:</span>
                          <span className="font-semibold text-slate-100 text-right">
                            {sintesisRicketts.claseEsqueletica}
                          </span>
                        </div>
                      </div>
                      {sintesisRicketts.sugerenciasPlan.length > 0 && (
                        <div className="pt-1.5 border-t border-slate-700/60 space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                            Orientación Plan de Tratamiento
                          </p>
                          <ul className="space-y-1 text-[11px] text-slate-300 list-disc pl-3.5">
                            {sintesisRicketts.sugerenciasPlan.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-800/80 border border-cyan-500/30 flex items-center justify-between">
                      <span className="font-bold text-cyan-300 text-xs">
                        Ricketts Frontal · 18 Factores
                      </span>
                      <Badge variant="outline" className="text-[10px] border-cyan-500/40 text-cyan-200">
                        {mediciones.length} / 18
                      </Badge>
                    </div>
                  )}

                  {(['Ricketts', 'Ricketts Frontal', 'McNamara', 'Steiner', 'Tweed', 'Wits'] as const).map((grupo) => {
                    const delGrupo = mediciones
                      .filter((m) => (m.analisis ?? 'Ricketts') === grupo)
                      .sort((a, b) => (a.factorNumero ?? 99) - (b.factorNumero ?? 99));
                    if (!delGrupo.length) return null;

                    const campos =
                      grupo === 'Ricketts'
                        ? [
                            'Campo I · Problema Dentario',
                            'Campo II · Relación Maxilo-Mandibular',
                            'Campo III · Dentoesquelético',
                            'Campo IV · Problema Estético',
                            'Campo V · Relación Craneofacial',
                            'Campo VI · Estructuras Internas',
                          ]
                        : grupo === 'Ricketts Frontal'
                        ? [
                            'Campo I · Problemas Dentarios',
                            'Campo II · Problemas Esqueléticos',
                            'Campo III · Problemas Dento-Esqueléticos',
                            'Campo V · Relación Craneofacial',
                            'Campo VI · Estructuras Internas',
                          ]
                        : [null];

                    return (
                  <div key={grupo} className="space-y-2">
                    <p className="pt-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                      {grupo} {grupo === 'Ricketts' ? `(${delGrupo.filter((m) => m.factorNumero != null).length}/33)` : grupo === 'Ricketts Frontal' ? `(${delGrupo.length}/18)` : ''}
                    </p>
                    {campos.map((campoNombre) => {
                      const items = campoNombre
                        ? delGrupo.filter((m) => m.campo === campoNombre)
                        : delGrupo;
                      if (!items.length) return null;
                      return (
                        <div key={campoNombre ?? grupo} className="space-y-1.5">
                          {campoNombre && (
                            <p className="text-[10px] font-semibold text-slate-400 pt-1">
                              {campoNombre}
                            </p>
                          )}
                          {items.map((m, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700/60 space-y-1"
                            >
                              <div className="flex justify-between items-center gap-2">
                                <span className="font-bold text-slate-200">
                                  {m.factorNumero ? (
                                    <span className="text-cyan-400 font-mono mr-1">#{m.factorNumero}</span>
                                  ) : null}
                                  {m.sigla}
                                </span>
                                <span className="text-base font-extrabold text-primary font-mono flex-shrink-0">
                                  {m.valor} {m.unidad}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400">{m.nombre}</p>
                              <div className="flex justify-between items-center pt-1 border-t border-slate-700/40 text-[10px] gap-2">
                                <span className="text-slate-400">Norma: {m.norma}</span>
                                <span
                                  className={`font-semibold text-right ${
                                    (m.enNorma !== undefined ? !m.enNorma : Math.abs(m.desviacion || 0) > 3)
                                      ? 'text-amber-400'
                                      : 'text-emerald-400'
                                  }`}
                                >
                                  {m.interpretacion || 'Normal'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
