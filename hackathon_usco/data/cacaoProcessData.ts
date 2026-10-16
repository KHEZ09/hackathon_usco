// Contenido editable de la sección "Del grano al producto".
// Textos, insignias, botones, métricas y efectos de cada etapa viven aquí. Las ilustraciones se
// dibujan en código (components/landing/proceso/arte); imagePath/fallbackImage son la referencia
// fotográfica de cada etapa para documentación y tarjetas.

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
  };
}

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
      type: "layered-vector",
      imagePath: "/media/proceso/cosecha.jpg",
      fallbackImage: "/media/proceso/cosecha.jpg",
      particleEffect: "sparks",
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
      type: "layered-vector",
      imagePath: "/media/proceso/fermentacion.jpg",
      fallbackImage: "/media/proceso/fermentacion.jpg",
      particleEffect: "steam",
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
      type: "layered-vector",
      imagePath: "/media/proceso/secado.jpg",
      fallbackImage: "/media/proceso/secado.jpg",
      particleEffect: "humidity-meter",
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
      type: "layered-vector",
      imagePath: "/media/proceso/empaque.jpg",
      fallbackImage: "/media/proceso/empaque.jpg",
      particleEffect: "sparks",
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
