import type { Metadata } from "next";
import { FichaPorConsulta } from "@/components/ficha/FichaPorConsulta";

export const metadata: Metadata = { title: "Ficha pública | ORIVIA" };

/** Ficha de cualquier lote: /ficha/?lote=CAC004 (destino de los códigos QR). */
export default function FichaConsultaPage() {
  return <FichaPorConsulta />;
}
