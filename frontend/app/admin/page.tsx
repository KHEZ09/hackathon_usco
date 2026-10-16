import type { Metadata } from "next";
import { PanelShell } from "@/components/panels/PanelShell";
import { AdminPanel } from "@/components/panels/admin/AdminPanel";

export const metadata: Metadata = { title: "Panel del administrador | ORIVIA" };

export default function AdminPage() {
  return (
    <PanelShell rol="administrador" tema="oscuro" titulo="Panel del administrador" subtitulo="Riesgos, costos, procedencia y auditoría">
      <AdminPanel />
    </PanelShell>
  );
}
