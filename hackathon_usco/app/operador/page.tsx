import type { Metadata } from "next";
import { PanelShell } from "@/components/panels/PanelShell";
import { OperatorPanel } from "@/components/panels/operador/OperatorPanel";

export const metadata: Metadata = { title: "Panel del operador | ORIVIA" };

export default function OperadorPage() {
  return (
    <PanelShell rol="operador" tema="claro" titulo="Panel del operador" subtitulo="Recepción, transformación e inventario">
      <OperatorPanel />
    </PanelShell>
  );
}
