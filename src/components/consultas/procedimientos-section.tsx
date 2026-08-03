import { useState } from "react";
import { Plus, Trash2, ClipboardPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sanitizeMultilineText } from "@/lib/security";
import { TIPOS_PROCEDIMIENTO, labelTipoProcedimiento, type NuevoProcedimiento } from "@/api/procedimientos";

export function ProcedimientosSection({ value, onChange }: { value: NuevoProcedimiento[]; onChange: (value: NuevoProcedimiento[]) => void }) {
  const [tipo, setTipo] = useState("sutura");
  const [cantidad, setCantidad] = useState("1");
  const [detalle, setDetalle] = useState("");
  const agregar = () => {
    onChange([...value, { tipo, cantidad: Math.max(1, Number.parseInt(cantidad, 10) || 1), detalle: sanitizeMultilineText(detalle) || null }]);
    setDetalle(""); setCantidad("1");
  };
  return <div className="rounded-lg border border-violet-200 dark:border-violet-900/60 p-3.5 space-y-3 bg-violet-50/40 dark:bg-violet-950/20">
    <div className="flex items-center gap-2"><ClipboardPlus className="w-4 h-4 text-violet-700" /><div><p className="font-semibold text-sm">Procedimientos / prácticas sanitarias</p><p className="text-[11px] text-muted-foreground">Agregue una o más prácticas realizadas.</p></div></div>
    {value.length > 0 && <div className="space-y-1.5">{value.map((p, i) => <div key={`${p.tipo}-${i}`} className="flex items-start gap-2 rounded-md border bg-background p-2 text-sm"><div className="flex-1"><span className="font-medium">{labelTipoProcedimiento(p.tipo)}</span><span className="text-muted-foreground"> · {p.cantidad}</span>{p.detalle && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{p.detalle}</p>}</div><Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-red-600" onClick={() => onChange(value.filter((_, index) => index !== i))}><Trash2 className="w-3.5 h-3.5" /></Button></div>)}</div>}
    <div className="grid grid-cols-[1fr_72px] sm:grid-cols-[1fr_80px_auto] gap-2 items-end"><div className="space-y-1"><Label className="text-xs">Práctica</Label><Select value={tipo} onValueChange={setTipo}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent>{TIPOS_PROCEDIMIENTO.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label className="text-xs">Cantidad</Label><Input className="h-9" type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} /></div><Button type="button" variant="outline" className="h-9 gap-1" onClick={agregar}><Plus className="w-3.5 h-3.5" /> Agregar</Button></div>
    <Textarea rows={2} placeholder="Detalle, zona, material o resultado (opcional)" value={detalle} onChange={(e) => setDetalle(e.target.value)} />
  </div>;
}
