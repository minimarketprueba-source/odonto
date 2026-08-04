// ============================================================================
// Catálogo de Medicamentos Frecuentes
// ============================================================================
// Proporciona sugerencias y valores predeterminados para la prescripción rápida
// en recetas médicas.

export interface MedicamentoFrecuente {
  id: string;
  nombre: string;
  categoria: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  indicaciones?: string;
}

export const MEDICAMENTOS_FRECUENTES: MedicamentoFrecuente[] = [
  // Analgésicos / Antiinflamatorios
  {
    id: "ibu-400",
    nombre: "Ibuprofeno 400 mg",
    categoria: "Analgésicos / Antiinflamatorios",
    dosis: "1 comprimido",
    frecuencia: "c/8 horas",
    duracion: "5 días",
    indicaciones: "Tomar después de los alimentos.",
  },
  {
    id: "ibu-600",
    nombre: "Ibuprofeno 600 mg",
    categoria: "Analgésicos / Antiinflamatorios",
    dosis: "1 comprimido",
    frecuencia: "c/8 horas",
    duracion: "5 días",
    indicaciones: "Tomar después de los alimentos.",
  },
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
    id: "dipi-500",
    nombre: "Dipirona 500 mg",
    categoria: "Analgésicos / Antiinflamatorios",
    dosis: "1 comprimido",
    frecuencia: "c/6 u 8 horas",
    duracion: "3 días",
    indicaciones: "Para fiebre alta o dolor agudo.",
  },
  {
    id: "keto-10",
    nombre: "Ketorolac 10 mg SL",
    categoria: "Analgésicos / Antiinflamatorios",
    dosis: "1 comprimido sublingual",
    frecuencia: "c/8 horas",
    duracion: "3 días",
    indicaciones: "No exceder 5 días de tratamiento.",
  },
  {
    id: "diclo-75",
    nombre: "Diclofenac 75 mg",
    categoria: "Analgésicos / Antiinflamatorios",
    dosis: "1 comprimido",
    frecuencia: "c/12 horas",
    duracion: "5 días",
    indicaciones: "Tomar con abundante agua tras las comidas.",
  },

  // Antibióticos
  {
    id: "amox-500",
    nombre: "Amoxicilina 500 mg",
    categoria: "Antibióticos",
    dosis: "1 cápsula",
    frecuencia: "c/8 horas",
    duracion: "7 a 10 días",
    indicaciones: "Completar todo el tratamiento indicado.",
  },
  {
    id: "amox-clav-875",
    nombre: "Amoxicilina + Ácido Clavulánico 875/125 mg",
    categoria: "Antibióticos",
    dosis: "1 comprimido",
    frecuencia: "c/12 horas",
    duracion: "7 días",
    indicaciones: "Tomar al inicio de las comidas principales.",
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
    id: "cipro-500",
    nombre: "Ciprofloxacina 500 mg",
    categoria: "Antibióticos",
    dosis: "1 comprimido",
    frecuencia: "c/12 horas",
    duracion: "7 días",
    indicaciones: "Evitar ingerir con lácteos simultáneos.",
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

  // Antihistamínicos y Respiratorios
  {
    id: "lora-10",
    nombre: "Loratadina 10 mg",
    categoria: "Antihistamínicos / Respiratorios",
    dosis: "1 comprimido",
    frecuencia: "c/24 horas",
    duracion: "5 a 7 días",
    indicaciones: "Preferentemente por la mañana o noche.",
  },
  {
    id: "salbu-aero",
    nombre: "Salbutamol Inhalador 100 mcg",
    categoria: "Antihistamínicos / Respiratorios",
    dosis: "2 disparos (puff)",
    frecuencia: "c/6 u 8 horas",
    duracion: "Según necesidad",
    indicaciones: "Usar aerocámara si fuera necesario.",
  },
  {
    id: "dexa-4",
    nombre: "Dexametasona 4 mg",
    categoria: "Antihistamínicos / Respiratorios",
    dosis: "1 comprimido",
    frecuencia: "c/24 horas",
    duracion: "3 días",
    indicaciones: "Tomar con desayuno.",
  },

  // Gastrointestinales
  {
    id: "ome-20",
    nombre: "Omeprazol 20 mg",
    categoria: "Gastrointestinales",
    dosis: "1 cápsula",
    frecuencia: "c/24 horas",
    duracion: "14 a 28 días",
    indicaciones: "Tomar en ayunas, 30 minutos antes del desayuno.",
  },
  {
    id: "busca-10",
    nombre: "Buscapina (Hioscina) 10 mg",
    categoria: "Gastrointestinales",
    dosis: "1 a 2 comprimidos",
    frecuencia: "c/8 horas",
    duracion: "En caso de espasmos",
    indicaciones: "Para alivio de cólicos abdominales.",
  },
  {
    id: "metoclo-10",
    nombre: "Metoclopramida 10 mg",
    categoria: "Gastrointestinales",
    dosis: "1 comprimido",
    frecuencia: "c/8 horas",
    duracion: "3 días",
    indicaciones: "Tomar 15 minutos antes de las comidas.",
  },

  // Cardiovascular / Antihipertensivos
  {
    id: "losa-50",
    nombre: "Losartán 50 mg",
    categoria: "Cardiovascular / Antihipertensivos",
    dosis: "1 comprimido",
    frecuencia: "c/24 horas",
    duracion: "Tratamiento continuo",
    indicaciones: "Control diario de presión arterial.",
  },
  {
    id: "enal-10",
    nombre: "Enalapril 10 mg",
    categoria: "Cardiovascular / Antihipertensivos",
    dosis: "1 comprimido",
    frecuencia: "c/12 o 24 horas",
    duracion: "Tratamiento continuo",
    indicaciones: "Monitorear presión arterial.",
  },

  // Odontología / Tópicos
  {
    id: "clorhex-col",
    nombre: "Clorhexidina 0.12% Colutorio",
    categoria: "Odontología / Tópicos",
    dosis: "15 ml",
    frecuencia: "c/12 horas",
    duracion: "7 a 10 días",
    indicaciones: "Buches de 1 minuto tras el cepillado.",
  },
  {
    id: "mefe-500",
    nombre: "Ácido Mefenámico 500 mg",
    categoria: "Odontología / Tópicos",
    dosis: "1 comprimido",
    frecuencia: "c/8 horas",
    duracion: "3 a 5 días",
    indicaciones: "En caso de dolor dental o posprocedimiento.",
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
