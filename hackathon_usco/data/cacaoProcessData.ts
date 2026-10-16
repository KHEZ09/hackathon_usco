// Contenido editable de la sección "Del grano al producto".
// Textos, insignias, botones, métricas, assets y efectos de cada etapa viven aquí; los
// componentes de components/landing/proceso solo los presentan y animan con el scroll.

export interface ProcessStage {
  id: "cosecha" | "fermentacion" | "secado" | "empaque" | "verificacion";
  stepNumber: number;
  label: string; // Ej: 'Finca La Esperanza'
  subLabel?: string; // Ej: '(Cosecha)'
  title: string; // Ej: 'Del grano al producto'
  description: string;
  badgeText?: string; // Ej: 'BENEFICIO · 6 DÍAS'
  actionButton: {
    label: string;
    url?: string;
    actionType: "navigate" | "modal" | "scroll";
  };
  metrics?: { label: string; value: string }[]; // Ej: [{ label: 'HUMEDAD', value: 'Del 55% al 7%' }]
  visualAsset: {
    type: "canvas-sequence" | "layered-vector";
    imagePath: string;
    fallbackImage: string;
    particleEffect?: "sparks" | "steam" | "humidity-meter" | "orbital-ring";
    /**
     * Solo para 'canvas-sequence': tramo [inicio, fin] de cuadros de PROCESS_SEQUENCE que recorre
     * esta etapa mientras se hace scroll. Los tramos consecutivos se encadenan sin cortes.
     */
    sequenceRange?: [number, number];
  };
}

/**
 * Recorrido visual continuo (mazorca → apertura → cajón → bandeja → saco): 152 cuadros WebP
 * a 20 fps extraídos del video de referencia, sin la interfaz impresa.
 */
export const PROCESS_SEQUENCE = {
  pattern: "/media/proceso/viaje/v{n}.webp",
  frames: 152,
  pad: 3,
  /** Punto del cuadro que se mantiene centrado al recortar (0→1). */
  focus: { x: 0.5, y: 0.5 },
};

export const CACAO_STAGES: ProcessStage[] = [
  {
    id: "cosecha",
    stepNumber: 1,
    label: "Finca La Esperanza",
    subLabel: "(Cosecha)",
    title: "Del grano al producto",
    description: "Cada mazorca se cosecha madura y se registra con su productor, finca y fecha. Es el primer eslabón de su historia.",
    badgeText: "RIVERA, HUILA · LOTE CAC001",
    actionButton: { label: "Ver trazabilidad", url: "/ficha/CAC001", actionType: "navigate" },
    visualAsset: {
      type: "canvas-sequence",
      imagePath: "/media/proceso/viaje/v000.webp",
      fallbackImage: "/media/proceso/cosecha.jpg",
      particleEffect: "sparks",
      sequenceRange: [0, 36],
    },
  },
  {
    id: "fermentacion",
    stepNumber: 2,
    label: "Fermentación",
    title: "Fermentación en cajón",
    description: "Los granos frescos pasan a cajones de madera. El operador registra entrada, salida e incidencias de la etapa.",
    badgeText: "BENEFICIO · 6 DÍAS",
    actionButton: { label: "Registrar una etapa", actionType: "modal" },
    visualAsset: {
      type: "canvas-sequence",
      imagePath: "/media/proceso/viaje/v036.webp",
      fallbackImage: "/media/proceso/fermentacion.jpg",
      particleEffect: "steam",
      sequenceRange: [36, 78],
    },
  },
  {
    id: "secado",
    stepNumber: 3,
    label: "Secado",
    title: "Del 55% al 7% de humedad",
    description: "Mientras el grano se seca, ORIVIA calcula la merma y alerta si supera el límite del 15%.",
    badgeText: "SECADO SOLAR",
    metrics: [{ label: "HUMEDAD", value: "Del 55% al 7%" }],
    actionButton: { label: "Ver alertas", actionType: "modal" },
    visualAsset: {
      type: "canvas-sequence",
      imagePath: "/media/proceso/viaje/v078.webp",
      fallbackImage: "/media/proceso/secado.jpg",
      particleEffect: "humidity-meter",
      sequenceRange: [78, 116],
    },
  },
  {
    id: "empaque",
    stepNumber: 4,
    label: "Empaque",
    title: "Empaque con huella SHA-256 por lote",
    description: "El lote se empaca y su historial queda encadenado; cualquier alteración posterior se detecta.",
    badgeText: "SELLADO DIGITAL",
    actionButton: { label: "Verificar un producto", actionType: "modal" },
    visualAsset: {
      type: "canvas-sequence",
      imagePath: "/media/proceso/viaje/v116.webp",
      fallbackImage: "/media/proceso/empaque.jpg",
      particleEffect: "sparks",
      sequenceRange: [116, 151],
    },
  },
  {
    id: "verificacion",
    stepNumber: 5,
    label: "QR Verificable",
    title: "Cada grano tiene una historia",
    description: "Verificación de la cadena SHA-256 con acceso directo a la ficha pública del lote CAC001.",
    badgeText: "VERIFICADO",
    actionButton: { label: "Abrir ficha CAC001", url: "/ficha/CAC001", actionType: "navigate" },
    visualAsset: {
      type: "layered-vector",
      imagePath: "/media/proceso/apertura.jpg",
      fallbackImage: "/media/proceso/apertura.jpg",
    },
  },
];

/** Rango de scroll (0→1) que ocupa cada etapa dentro de la sección. */
export const STAGE_RANGES: Array<[number, number]> = CACAO_STAGES.map((_, i, all) => [i / all.length, (i + 1) / all.length]);

/** Cuadro de la secuencia (fraccional) para un progreso de scroll dado. */
export function frameForProgress(p: number) {
  let last = 0;
  for (let i = 0; i < CACAO_STAGES.length; i++) {
    const r = CACAO_STAGES[i].visualAsset.sequenceRange;
    const [a, b] = STAGE_RANGES[i];
    if (!r) continue;
    last = r[1];
    if (p < b) {
      const t = Math.min(1, Math.max(0, (p - a) / (b - a)));
      return r[0] + (r[1] - r[0]) * t;
    }
  }
  return last;
}

/** Extrae los valores numéricos de una métrica como "Del 55% al 7%" → [55, 7]. */
export function metricRange(value: string): [number, number] | null {
  const n = value.match(/\d+(?:[.,]\d+)?/g);
  return n && n.length >= 2 ? [parseFloat(n[0].replace(",", ".")), parseFloat(n[1].replace(",", "."))] : null;
}
