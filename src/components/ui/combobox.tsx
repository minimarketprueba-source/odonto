import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn, matchTexto } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";

export interface OpcionCombobox {
  value: string;
  label: string;
  /** Segunda línea (especialidad, cédula, nombre oficial...). */
  detalle?: string | null;
  /** Texto extra por el que se puede buscar sin que se muestre. */
  buscarPor?: string | null;
}

interface ComboboxProps {
  opciones: OpcionCombobox[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Texto del cuadro de búsqueda. */
  buscarPlaceholder?: string;
  vacioTexto?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/**
 * Desplegable con buscador. La lista de profesionales pasa de 20 y los destinos
 * tienen nombres largos: sin buscador hay que recorrer todo a ojo.
 * Filtra con `matchTexto`, así que ignora tildes y el orden de las palabras
 * ("lopez irala" encuentra "Irala López").
 */
export function Combobox({
  opciones, value, onChange,
  placeholder = "Seleccione",
  buscarPlaceholder = "Buscar...",
  vacioTexto = "Sin resultados.",
  disabled, id, className,
}: ComboboxProps) {
  const [abierto, setAbierto] = React.useState(false);
  const [busqueda, setBusqueda] = React.useState("");

  const seleccionada = opciones.find((o) => o.value === value) ?? null;

  const filtradas = React.useMemo(() => {
    if (!busqueda.trim()) return opciones;
    return opciones.filter((o) =>
      matchTexto(`${o.label} ${o.detalle ?? ""} ${o.buscarPor ?? ""}`, busqueda)
    );
  }, [opciones, busqueda]);

  return (
    <Popover
      open={abierto}
      onOpenChange={(v) => {
        setAbierto(v);
        if (!v) setBusqueda("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={abierto}
          disabled={disabled}
          className={cn(
            "w-full min-w-0 justify-between font-normal",
            !seleccionada && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{seleccionada?.label ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] min-w-[240px] p-0"
        align="start"
      >
        {/* El filtrado lo hace matchTexto, no cmdk: así "lopez irala" también
            encuentra "Irala López" y no hace falta escribir en orden. */}
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={buscarPlaceholder}
            value={busqueda}
            onValueChange={setBusqueda}
          />
          <CommandList>
            <CommandEmpty>{vacioTexto}</CommandEmpty>
            <CommandGroup>
              {filtradas.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.value}
                  onSelect={() => {
                    onChange(o.value);
                    setAbierto(false);
                    setBusqueda("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      o.value === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block truncate">{o.label}</span>
                    {o.detalle && (
                      <span className="block text-xs text-muted-foreground truncate">
                        {o.detalle}
                      </span>
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
