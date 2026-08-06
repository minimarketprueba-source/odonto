// ============================================================================
// Vademécum odontológico
// ============================================================================
// Sugerencias para cargar una receta rápido, con la dosis habitual ya escrita.
// Es una ayuda, no una obligación: en el formulario se puede escribir cualquier
// medicamento a mano, esté o no en esta lista.
//
// Es lo que receta un odontólogo. El catálogo original venía del sistema médico
// del que se clonó esto y traía Salbutamol inhalador, Losartán y Enalapril (para
// la presión), Buscapina y Metoclopramida; se sacaron. En cambio faltaban dos
// que en odontología se usan todos los días: Metronidazol (infección
// periodontal y de origen dentario) y Clindamicina (el reemplazo cuando el
// paciente es alérgico a la penicilina).

export interface MedicamentoFrecuente {
  id: string;
  nombre: string;
  categoria: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  indicaciones?: string;
  /**
   * Grupo farmacológico, para poder cruzarlo con las alergias de la anamnesis
   * antes de emitir la receta. `penicilina` es el que más importa: un alérgico
   * a la penicilina también lo es a la amoxicilina, y eso no se ve en el
   * nombre del medicamento.
   */
  familia?: "penicilina" | "aine";
}

export const MEDICAMENTOS_FRECUENTES: MedicamentoFrecuente[] = [
  // --- Analgésicos / Antiinflamatorios ---------------------------------------
  {
    id: "para-500",
    nombre: "Paracetamol 500 mg",
    categoria: "Analgésicos / Antiinflamatorios",
    dosis: "1 comprimido",
    frecuencia: "c/8 horas",
    duracion: "3 a 5 días",
    indicaciones: "En caso de dolor o fiebre.",
  },
  {
    id: "para-1g",
    nombre: "Paracetamol 1 g",
    categoria: "Analgésicos / Antiinflamatorios",
    dosis: "1 comprimido",
    frecuencia: "c/8 horas",
    duracion: "3 días",
    indicaciones: "En caso de fiebre o dolor moderado.",
  },
  {
    id: "ibu-400",
    nombre: "Ibuprofeno 400 mg",
    categoria: "Analgésicos / Antiinflamatorios",
    dosis: "1 comprimido",
    frecuencia: "c/8 horas",
    duracion: "5 días",
    indicaciones: "Tomar después de los alimentos.",
    familia: "aine",
  },
  {
    id: "ibu-600",
    nombre: "Ibuprofeno 600 mg",
    categoria: "Analgésicos / Antiinflamatorios",
    dosis: "1 comprimido",
    frecuencia: "c/8 horas",
    duracion: "5 días",
    indicaciones: "Tomar después de los alimentos.",
    familia: "aine",
  },
  {
    id: "diclo-50",
    nombre: "Diclofenac 50 mg",
    categoria: "Analgésicos / Antiinflamatorios",
    dosis: "1 comprimido",
    frecuencia: "c/8 horas",
    duracion: "3 a 5 días",
    indicaciones: "Tomar con abundante agua tras las comidas.",
    familia: "aine",
  },
  {
    id: "diclo-75",
    nombre: "Diclofenac 75 mg",
    categoria: "Analgésicos / Antiinflamatorios",
    dosis: "1 comprimido",
    frecuencia: "c/12 horas",
    duracion: "5 días",
    indicaciones: "Tomar con abundante agua tras las comidas.",
    familia: "aine",
  },
  {
    id: "keto-10",
    nombre: "Ketorolac 10 mg SL",
    categoria: "Analgésicos / Antiinflamatorios",
    dosis: "1 comprimido sublingual",
    frecuencia: "c/8 horas",
    duracion: "3 días",
    indicaciones: "No exceder 5 días de tratamiento.",
    familia: "aine",
  },
  {
    id: "dipi-500",
    nombre: "Dipirona 500 mg",
    categoria: "Analgésicos / Antiinflamatorios",
    dosis: "1 comprimido",
    frecuencia: "c/6 u 8 horas",
    duracion: "3 días",
    indicaciones: "Para fiebre alta o dolor agudo.",
  },
  {
    id: "mefe-500",
    nombre: "Ácido Mefenámico 500 mg",
    categoria: "Analgésicos / Antiinflamatorios",
    dosis: "1 comprimido",
    frecuencia: "c/8 horas",
    duracion: "3 a 5 días",
    indicaciones: "En caso de dolor dental o posprocedimiento.",
    familia: "aine",
  },
  {
    id: "napro-550",
    nombre: "Naproxeno sódico 550 mg",
    categoria: "Analgésicos / Antiinflamatorios",
    dosis: "1 comprimido",
    frecuencia: "c/12 horas",
    duracion: "5 días",
    indicaciones: "Tomar con alimentos.",
    familia: "aine",
  },
  {
    id: "nime-100",
    nombre: "Nimesulida 100 mg",
    categoria: "Analgésicos / Antiinflamatorios",
    dosis: "1 comprimido",
    frecuencia: "c/12 horas",
    duracion: "5 días",
    indicaciones: "Tomar después de las comidas. No exceder 15 días.",
    familia: "aine",
  },

  // --- Antibióticos -----------------------------------------------------------
  {
    id: "amox-500",
    nombre: "Amoxicilina 500 mg",
    categoria: "Antibióticos",
    dosis: "1 cápsula",
    frecuencia: "c/8 horas",
    duracion: "7 días",
    indicaciones: "Completar todo el tratamiento indicado.",
    familia: "penicilina",
  },
  {
    id: "amox-875",
    nombre: "Amoxicilina 875 mg",
    categoria: "Antibióticos",
    dosis: "1 comprimido",
    frecuencia: "c/12 horas",
    duracion: "7 días",
    indicaciones: "Completar todo el tratamiento indicado.",
    familia: "penicilina",
  },
  {
    id: "amox-clav-875",
    nombre: "Amoxicilina + Ácido Clavulánico 875/125 mg",
    categoria: "Antibióticos",
    dosis: "1 comprimido",
    frecuencia: "c/12 horas",
    duracion: "7 días",
    indicaciones: "Tomar al inicio de las comidas principales.",
    familia: "penicilina",
  },
  {
    id: "metro-500",
    nombre: "Metronidazol 500 mg",
    categoria: "Antibióticos",
    dosis: "1 comprimido",
    frecuencia: "c/8 horas",
    duracion: "7 días",
    indicaciones: "NO consumir alcohol durante el tratamiento ni 48 horas después.",
  },
  {
    id: "clinda-300",
    nombre: "Clindamicina 300 mg",
    categoria: "Antibióticos",
    dosis: "1 cápsula",
    frecuencia: "c/8 horas",
    duracion: "7 días",
    indicaciones: "Alternativa en pacientes alérgicos a la penicilina. Tomar con abundante agua.",
  },
  {
    id: "azi-500",
    nombre: "Azitromicina 500 mg",
    categoria: "Antibióticos",
    dosis: "1 comprimido",
    frecuencia: "c/24 horas",
    duracion: "3 días",
    indicaciones: "Tomar 1 hora antes o 2 horas después de comer.",
  },
  {
    id: "cefa-500",
    nombre: "Cefalexina 500 mg",
    categoria: "Antibióticos",
    dosis: "1 cápsula",
    frecuencia: "c/6 horas",
    duracion: "7 días",
    indicaciones: "Ingerir con agua.",
  },

  // --- Antisépticos y tópicos bucales -----------------------------------------
  {
    id: "clorhex-col",
    nombre: "Clorhexidina 0.12% Colutorio",
    categoria: "Antisépticos y tópicos bucales",
    dosis: "15 ml",
    frecuencia: "c/12 horas",
    duracion: "7 a 10 días",
    indicaciones: "Buches de 1 minuto tras el cepillado. No enjuagar con agua después.",
  },
  {
    id: "clorhex-gel",
    nombre: "Clorhexidina 1% Gel",
    categoria: "Antisépticos y tópicos bucales",
    dosis: "Aplicación local",
    frecuencia: "c/12 horas",
    duracion: "7 días",
    indicaciones: "Aplicar sobre la zona con hisopo, sin enjuagar.",
  },
  {
    id: "triam-orabase",
    nombre: "Triamcinolona acetónido 0.1% en orabase",
    categoria: "Antisépticos y tópicos bucales",
    dosis: "Aplicación local",
    frecuencia: "c/8 horas",
    duracion: "5 días",
    indicaciones: "Para aftas. Aplicar una capa fina después de las comidas y al acostarse.",
  },
  {
    id: "nista-susp",
    nombre: "Nistatina suspensión 100.000 UI/ml",
    categoria: "Antisépticos y tópicos bucales",
    dosis: "5 ml",
    frecuencia: "c/6 horas",
    duracion: "14 días",
    indicaciones: "Para candidiasis oral. Mantener en boca 2 minutos antes de tragar.",
  },

  // --- Coadyuvantes -----------------------------------------------------------
  {
    id: "dexa-4",
    nombre: "Dexametasona 4 mg",
    categoria: "Coadyuvantes",
    dosis: "1 comprimido",
    frecuencia: "c/24 horas",
    duracion: "3 días",
    indicaciones: "Para inflamación posquirúrgica. Tomar con el desayuno.",
  },
  {
    id: "ome-20",
    nombre: "Omeprazol 20 mg",
    categoria: "Coadyuvantes",
    dosis: "1 cápsula",
    frecuencia: "c/24 horas",
    duracion: "Mientras dure el antiinflamatorio",
    indicaciones: "Protección gástrica. Tomar en ayunas, 30 minutos antes del desayuno.",
  },
  {
    id: "lora-10",
    nombre: "Loratadina 10 mg",
    categoria: "Coadyuvantes",
    dosis: "1 comprimido",
    frecuencia: "c/24 horas",
    duracion: "5 días",
    indicaciones: "Para reacción alérgica leve.",
  },
];

/**
  Normaliza un texto quitando tildes y pasando a minúsculas.
 */
function normalizarTexto(txt: string): string {
  return txt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Busca medicamentos en el catálogo por nombre o categoría.
 */
export function buscarMedicamentos(query: string): MedicamentoFrecuente[] {
  const q = normalizarTexto(query.trim());
  if (!q) return MEDICAMENTOS_FRECUENTES;

  const palabras = q.split(/\s+/).filter(Boolean);
  return MEDICAMENTOS_FRECUENTES.filter((m) => {
    const textoCompleto = normalizarTexto(`${m.nombre} ${m.categoria}`);
    return palabras.every((p) => textoCompleto.includes(p));
  });
}

/**
 * Obtiene la lista de categorías únicas de medicamentos.
 */
export function obtenerCategoriasMedicamentos(): string[] {
  const categorias = new Set(MEDICAMENTOS_FRECUENTES.map((m) => m.categoria));
  return Array.from(categorias);
}

// ============================================================================
// Cruce con las alergias del paciente
// ============================================================================

/** Palabras que en la anamnesis significan alergia a la penicilina. */
const SENALES_PENICILINA = ["penicilina", "amoxicilina", "amoxilina", "betalactam", "ampicilina"];

/** Palabras que significan alergia o intolerancia a los antiinflamatorios. */
const SENALES_AINE = [
  "aine",
  "aspirina",
  "acido acetilsalicilico",
  "ibuprofeno",
  "diclofenac",
  "ketorolac",
  "naproxeno",
  "nimesulida",
  "antiinflamatorio",
];

/**
 * Avisa si algún medicamento de la receta choca con lo que el paciente declaró
 * en la anamnesis.
 *
 * Por qué existe: el riesgo real de una receta odontológica es indicarle
 * amoxicilina a un alérgico a la penicilina. El odontólogo escribió esa alergia
 * en la anamnesis meses atrás, en otra pestaña, y no la tiene delante al
 * recetar. Esto la trae.
 *
 * Es un aviso, no un bloqueo: la decisión clínica es del profesional, que puede
 * tener motivos para recetarlo igual. Solo se asegura de que no sea por olvido.
 */
export function alergiasEnConflicto(
  medicamentos: string[],
  alergiasTexto: string | null | undefined
): string[] {
  const texto = normalizarTexto(alergiasTexto || "");
  if (!texto.trim()) return [];

  const alergicoAPenicilina = SENALES_PENICILINA.some((s) => texto.includes(s));
  const alergicoAAine = SENALES_AINE.some((s) => texto.includes(s));
  if (!alergicoAPenicilina && !alergicoAAine) return [];

  const avisos: string[] = [];
  for (const nombre of medicamentos) {
    const n = normalizarTexto(nombre);
    if (!n.trim()) continue;

    // Se busca por el nombre escrito, no por el id del catálogo: el odontólogo
    // puede haberlo tipeado a mano y el aviso tiene que salir igual.
    const esPenicilina =
      SENALES_PENICILINA.some((s) => n.includes(s)) || n.includes("clavulanico");
    const esAine = SENALES_AINE.some((s) => n.includes(s)) || n.includes("mefenamico");

    if (alergicoAPenicilina && esPenicilina) {
      avisos.push(`${nombre} es una penicilina y el paciente declaró alergia a la penicilina.`);
    } else if (alergicoAAine && esAine) {
      avisos.push(`${nombre} es un antiinflamatorio y el paciente declaró alergia a los antiinflamatorios.`);
    }
  }
  return avisos;
}
