"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Fingerprint, RefreshCw, ShieldCheck, Users, XCircle } from "lucide-react";
import {
  ApiBlockchainReceipt,
  ApiOrder,
  ApiOrderEvent,
  ApiUser,
  getBlockchainAnchor,
  getOrderAudit,
  getOrderTimeline,
  listOrders,
  listUsers,
  OriviaApiError,
} from "@/lib/orivia-api";
import { Button, Card, CardTitle, Kpi, Table, Td } from "../ui";
import { cn } from "@/lib/cn";

type OrderEvidence = {
  order: ApiOrder;
  events: ApiOrderEvent[];
  verified: boolean | null;
  anchor: ApiBlockchainReceipt | null;
  error?: string;
};

const orderIdOf = (order: ApiOrder) => String(order.id ?? order.order_id ?? "");
const shortHash = (value?: string) => (value ? `${value.slice(0, 12)}…${value.slice(-8)}` : "—");

async function loadOrderEvidence(order: ApiOrder): Promise<OrderEvidence> {
  const orderId = orderIdOf(order);
  if (!orderId) return { order, events: [], verified: false, anchor: null, error: "Pedido sin identificador." };

  try {
    const [timeline, audit] = await Promise.all([getOrderTimeline(orderId), getOrderAudit(orderId, true)]);
    const events = timeline.events ?? [];
    const lastHash = events.at(-1)?.event_hash;
    let anchor: ApiBlockchainReceipt | null = null;
    if (lastHash) {
      try {
        anchor = await getBlockchainAnchor(lastHash);
      } catch (cause) {
        // Un pedido puede tener cadena íntegra mientras el anclaje está pendiente.
        if (!(cause instanceof OriviaApiError && cause.status === 404)) throw cause;
      }
    }
    return { order, events, verified: audit.verified === true, anchor };
  } catch (cause) {
    return {
      order,
      events: [],
      verified: null,
      anchor: null,
      error: cause instanceof Error ? cause.message : "No se pudo verificar el pedido.",
    };
  }
}

function EvidenceStatus({ verified, anchor }: { verified: boolean | null; anchor: ApiBlockchainReceipt | null }) {
  if (verified === null) return <span className="text-ambar">No verificado</span>;
  if (!verified) return <span className="inline-flex items-center gap-1 text-cereza"><XCircle className="size-3.5" /> Cadena inválida</span>;
  return (
    <span className={cn("inline-flex items-center gap-1", anchor?.verified === false ? "text-ambar" : "text-bosque-500")}>
      <CheckCircle2 className="size-3.5" /> {anchor ? "Verificada + anclada" : "Verificada"}
    </span>
  );
}

export function OperationalAuditCard() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [evidence, setEvidence] = useState<OrderEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextUsers, orders] = await Promise.all([listUsers(), listOrders()]);
      const nextEvidence = await Promise.all(orders.map(loadOrderEvidence));
      setUsers(nextUsers);
      setEvidence(nextEvidence);
      setUpdatedAt(new Date().toLocaleTimeString("es-CO"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo leer la operación persistida.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const activeUsers = users.filter((user) => user.account_status === "ACTIVE").length;
  const verifiedChains = evidence.filter((row) => row.verified === true).length;
  const anchored = evidence.filter((row) => row.anchor?.status === "ANCHORED").length;

  return (
    <Card className="border-bosque-500/25 bg-bosque-500/[0.04]">
      <CardTitle
        icon={<Fingerprint className="size-4" />}
        title="Centro operativo · usuarios y trazabilidad"
        hint="Vista protegida para administración: usuarios registrados, cadenas de eventos y certificados de anclaje. No se expone en la landing pública."
        action={
          <Button variant="secundario" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            {loading ? "Actualizando" : "Actualizar"}
          </Button>
        }
      />

      {error && <p className="mb-4 rounded-2xl bg-cereza/10 px-4 py-3 text-xs text-cereza">No se pudo completar la auditoría: {error}</p>}

      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Usuarios registrados" value={String(users.length)} hint={`${activeUsers} activos`} />
        <Kpi label="Pedidos persistidos" value={String(evidence.length)} hint="PostgreSQL + API" />
        <Kpi label="Cadenas verificadas" value={String(verifiedChains)} hint="Hash encadenado íntegro" tone={evidence.length > 0 && verifiedChains < evidence.length ? "alerta" : "bien"} />
        <Kpi label="Anclajes blockchain" value={String(anchored)} hint="Certificados disponibles" tone="bien" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Users className="size-4 text-bosque-500" />
            <h3 className="text-sm font-semibold">Usuarios registrados</h3>
          </div>
          <Table head={["Nombre", "Correo", "Rol", "Estado"]} empty={users.length === 0}>
            {users.map((user) => (
              <tr key={user.user_id}>
                <Td className="font-medium">{user.full_name || "Sin nombre"}</Td>
                <Td>{user.email}</Td>
                <Td className="text-[0.68rem]">{user.roles?.join(", ") || "—"}</Td>
                <Td><span className={cn("font-semibold", user.account_status === "ACTIVE" ? "text-bosque-500" : "text-cereza")}>{user.account_status}</span></Td>
              </tr>
            ))}
          </Table>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="size-4 text-bosque-500" />
            <h3 className="text-sm font-semibold">Certificados y cadenas de pedidos</h3>
          </div>
          <Table head={["Pedido", "Estado", "Eventos", "Cadena", "Anclaje"]} empty={evidence.length === 0}>
            {evidence.map((row) => {
              const orderId = orderIdOf(row.order);
              const lastEvent = row.events.at(-1);
              return (
                <tr key={orderId}>
                  <Td className="font-mono font-semibold">{shortHash(orderId)}</Td>
                  <Td>{String(row.order.status ?? "—")}</Td>
                  <Td>{row.events.length}</Td>
                  <Td>
                    <EvidenceStatus verified={row.verified} anchor={row.anchor} />
                    <span className="mt-1 block font-mono text-[0.62rem] text-ink-soft" title={lastEvent?.event_hash}>{shortHash(lastEvent?.event_hash)}</span>
                  </Td>
                  <Td>
                    {row.anchor ? (
                      <span className="block text-[0.68rem]">
                        <span className="font-semibold text-bosque-500">{String(row.anchor.network ?? "local")}</span>
                        <span className="mt-1 block max-w-44 truncate text-ink-soft" title={String(row.anchor.reference ?? "")}>{String(row.anchor.reference ?? "certificado")}</span>
                      </span>
                    ) : row.error ? <span className="text-cereza">Error</span> : <span className="text-ambar">Pendiente</span>}
                  </Td>
                </tr>
              );
            })}
          </Table>
        </div>
      </div>

      <p className="mt-4 text-[0.68rem] text-ink-soft">
        {updatedAt ? `Última lectura: ${updatedAt}. ` : ""}La cadena se valida con el endpoint de auditoría y el certificado se consulta por el hash del último evento; la red se muestra tal como la informa el backend.
      </p>
    </Card>
  );
}
