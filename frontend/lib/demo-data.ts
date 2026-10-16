// Datos sintéticos de demostración (se reemplazan por la API del backend).

export type LotId = "CAC001" | "CAC002" | "CAC003";
export type LotState = "PENDIENTE" | "LIBERADO" | "BLOQUEADO";

export type TraceStep = {
  key: string;
  etapa: string;
  fecha: string;
  responsable: string;
  kg: number;
  nota: string;
};

export type DemoLot = {
  id: LotId;
  productor: string;
  origen: string;
  finca: string;
  recibidoKg: number;
  estado: LotState;
  pasos: TraceStep[];
};

export const MERMA_UMBRAL = 15;

export const LOTES: DemoLot[] = [
  {
    id: "CAC001",
    productor: "Productor A",
    origen: "Rivera",
    finca: "Finca La Esperanza",
    recibidoKg: 100,
    estado: "PENDIENTE",
    pasos: [
      { key: "recepcion", etapa: "Recepción", fecha: "12 oct 2026", responsable: "Operador de acopio", kg: 100, nota: "Cacao en baba, humedad 55%." },
      { key: "fermentacion", etapa: "Fermentación", fecha: "13 oct 2026", responsable: "Operador de beneficio", kg: 92, nota: "6 días en cajones de madera." },
      { key: "secado", etapa: "Secado", fecha: "19 oct 2026", responsable: "Operador de beneficio", kg: 80, nota: "Secado solar, humedad final 7%." },
      { key: "producto", etapa: "Cacao seco", fecha: "21 oct 2026", responsable: "Administración", kg: 80, nota: "Pendiente de liberación por merma." },
    ],
  },
  {
    id: "CAC002",
    productor: "Productor B",
    origen: "Campoalegre",
    finca: "Finca El Mirador",
    recibidoKg: 150,
    estado: "LIBERADO",
    pasos: [
      { key: "recepcion", etapa: "Recepción", fecha: "10 oct 2026", responsable: "Operador de acopio", kg: 150, nota: "Cacao en baba, humedad 52%." },
      { key: "fermentacion", etapa: "Fermentación", fecha: "11 oct 2026", responsable: "Operador de beneficio", kg: 141, nota: "5 días con volteo diario." },
      { key: "secado", etapa: "Secado", fecha: "16 oct 2026", responsable: "Operador de beneficio", kg: 132, nota: "Marquesina, humedad final 7%." },
      { key: "producto", etapa: "Cacao seco", fecha: "18 oct 2026", responsable: "Administración", kg: 132, nota: "Liberado para pedidos." },
    ],
  },
  {
    id: "CAC003",
    productor: "Productor C",
    origen: "Algeciras",
    finca: "Finca Alto Bonito",
    recibidoKg: 80,
    estado: "LIBERADO",
    pasos: [
      { key: "recepcion", etapa: "Recepción", fecha: "09 oct 2026", responsable: "Operador de acopio", kg: 80, nota: "Cacao en baba, humedad 54%." },
      { key: "fermentacion", etapa: "Fermentación", fecha: "10 oct 2026", responsable: "Operador de beneficio", kg: 76, nota: "6 días en cajones." },
      { key: "secado", etapa: "Secado", fecha: "15 oct 2026", responsable: "Operador de beneficio", kg: 70, nota: "Secado solar." },
      { key: "producto", etapa: "Cacao seco", fecha: "17 oct 2026", responsable: "Administración", kg: 70, nota: "Liberado para pedidos." },
    ],
  },
];

export function mermaPct(lot: DemoLot) {
  const salida = lot.pasos[lot.pasos.length - 1].kg;
  if (lot.recibidoKg <= 0) return 0;
  return Math.round(((lot.recibidoKg - salida) / lot.recibidoKg) * 1000) / 10;
}

/** Supuestos del balance económico mostrado en la landing (RF05, RF12). */
export const BALANCE = {
  costoTotalCop: 1_600_000,
  kgVendibles: 80,
  precioVentaKgCop: 25_000,
};

export function costoUnitario() {
  return BALANCE.kgVendibles > 0 ? BALANCE.costoTotalCop / BALANCE.kgVendibles : 0;
}

export function margenPct() {
  const cu = costoUnitario();
  return BALANCE.precioVentaKgCop > 0
    ? Math.round(((BALANCE.precioVentaKgCop - cu) / BALANCE.precioVentaKgCop) * 1000) / 10
    : 0;
}

export const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
