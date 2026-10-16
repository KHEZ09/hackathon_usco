import type { Metadata } from "next";
import { PanelShell } from "@/components/panels/PanelShell";
import { BuyerPanel } from "@/components/panels/comprador/BuyerPanel";

export const metadata: Metadata = { title: "Panel del comprador | ORIVIA" };

export default function CompradorPage() {
  return (
    <PanelShell rol="comprador" tema="claro" titulo="Panel del comprador" subtitulo="Catálogo verificable, QR y pedidos">
      <BuyerPanel />
    </PanelShell>
  );
}
