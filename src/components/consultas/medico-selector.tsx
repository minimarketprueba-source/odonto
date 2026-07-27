import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { useAuth } from "@/context/auth-context";
import { useMedicosActivos, useMiMedico } from "@/api/citas";

interface MedicoSelectorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Campo del profesional que firma el registro (consulta, receta, salvoconducto,
 * ficha de RAC).
 *
 * Si la cuenta que entró tiene ficha de profesional (`medicos.user_id`), el campo
 * queda FIJO en esa persona: un médico no puede registrar a nombre de otro, ni
 * siquiera cuando lo abre desde una cita agendada para un colega.
 *
 * Las cuentas sin ficha propia (enfermería y admin) siguen eligiendo de la lista,
 * porque cargan a nombre de las profesionales.
 */
export function MedicoSelector({ id, value, onChange, disabled, placeholder }: MedicoSelectorProps) {
  const { user } = useAuth();
  const { data: medicos = [] } = useMedicosActivos();
  const { data: miMedico, isLoading } = useMiMedico(user?.id);

  // En solo lectura (una ficha ya cerrada) NO se fija nada: hay que seguir viendo
  // al profesional que firmó de verdad, no al que está mirando la pantalla.
  const fijo = !disabled && miMedico ? String(miMedico.id) : null;

  // Pisa también lo que venga precargado (el médico de la cita, una ficha de RAC
  // abierta por enfermería): el registro sale siempre a nombre de quien firma.
  useEffect(() => {
    if (fijo && value !== fijo) onChange(fijo);
  }, [fijo, value, onChange]);

  if (isLoading && !disabled) {
    return (
      <div className="flex items-center h-10 px-3 rounded-md border bg-muted/40 text-sm text-muted-foreground">
        Cargando profesional...
      </div>
    );
  }

  if (fijo && miMedico) {
    return (
      <div
        data-testid="medico-fijo"
        className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/40"
        title="Queda a tu nombre porque la consulta la firma quien atiende."
      >
        <span className="text-sm font-medium truncate">
          {miMedico.apellidos}, {miMedico.nombres}
        </span>
        {miMedico.especialidad && (
          <Badge variant="outline" className="text-xs font-normal shrink-0">
            {miMedico.especialidad.nombre}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Combobox
      id={id}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder ?? "Elija el profesional"}
      buscarPlaceholder="Buscar por nombre o especialidad..."
      vacioTexto="No hay ningún profesional con ese nombre."
      opciones={medicos.map((m) => ({
        value: String(m.id),
        label: `${m.apellidos}, ${m.nombres}`,
        detalle: m.especialidad?.nombre ?? null,
      }))}
    />
  );
}
