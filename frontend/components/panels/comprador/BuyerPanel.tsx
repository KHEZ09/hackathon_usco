"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ExternalLink, MapPin, PackageCheck, QrCode, Search, ShoppingBag, Truck } from "lucide-react";
import { Button, Card, CardTitle, Field, Input, Kpi, Table, Td } from "../ui";
import { QrDescargable } from "@/components/ficha/QrDescargable";
import { useToast } from "@/components/ui/Toaster";
import { createOrder, getPublicLot, hasApiSession, listLots, listOrders, OriviaApiError, type ApiLot, type ApiOrder, type ApiPublicLot } from "@/lib/orivia-api";
import { rutaFicha } from "@/lib/enlaces";
import { inventario, useDatos } from "@/lib/store";
import { cn } from "@/lib/cn";

type LoteVista = { id: string; producto: string; origen: string; productor: string; disponibleKg: number; estado: "PENDING" | "LIBERATED" | "BLOCKED" };

const ESTADO = {
  LIBERATED: { texto: "Disponible", clase: "bg-bosque-500/12 text-bosque-500 dark:text-bosque-300" },
  PENDING: { texto: "En revisión", clase: "bg-ambar/15 text-ambar" },
  BLOCKED: { texto: "No disponible", clase: "bg-cereza/12 text-cereza" },
} as const;

const DE_LOCAL = { LIBERADO: "LIBERATED", PENDIENTE: "PENDING", BLOQUEADO: "BLOCKED" } as const;

/**
 * Panel del comprador: catálogo verificable (sin costos internos), QR de cada lote,
 * consulta por código y pedidos propios. Un lote bloqueado nunca se ofrece (RF09).
 */
export function BuyerPanel() {
  const datos = useDatos();
  const [remotos, setRemotos] = useState<ApiLot[] | null>(null);
  const [pedidos, setPedidos] = useState<ApiOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);
  const datosRef = useRef(datos);
  useEffect(() => {
    datosRef.current = datos;
  }, [datos]);

  useEffect(() => {
    if (!hasApiSession()) return;
    let vivo = true;
    // GET /lots (catálogo completo); si el servidor aún no lo tiene, se arma con las fichas públicas.
    const catalogo = listLots().catch(async (e) => {
      if (!(e instanceof OriviaApiError) || (e.status !== 404 && e.status !== 405)) throw e;
      const ids = datosRef.current.lotes.map((l) => l.id);
      const fichas = await Promise.all(ids.map((id) => getPublicLot(id).catch(() => null)));
      return fichas.filter((f): f is ApiPublicLot => f !== null).map(
        (f) => ({ id: f.id, product: f.product, origin: f.origin, producer: f.producer, available_kg: f.available_kg, status: f.status }) as ApiLot,
      );
    });
    Promise.all([catalogo, listOrders().catch(() => [] as ApiOrder[])])
      .then(([lots, orders]) => {
        if (!vivo) return;
        setRemotos(lots.length ? lots : null);
        setPedidos(orders);
        setError(null);
      })
      .catch((e) => vivo && setError(e instanceof OriviaApiError ? e.message : "No se pudo consultar el catálogo."));
    return () => {
      vivo = false;
    };
  }, [recarga]);

  const lotes: LoteVista[] = useMemo(
    () =>
      remotos
        ? remotos.map((l) => ({ id: l.id, producto: l.product, origen: l.origin, productor: l.producer, disponibleKg: l.available_kg, estado: l.status }))
        : datos.lotes.map((l) => ({ id: l.id, producto: l.producto, origen: `${l.origen}, Huila`, productor: l.productor, disponibleKg: inventario(datos, l.id).disponible, estado: DE_LOCAL[l.estado] })),
    [remotos, datos],
  );
  const disponibles = lotes.filter((l) => l.estado === "LIBERATED" && l.disponibleKg > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Lotes en el catálogo" value={String(lotes.length)} hint={remotos ? "Datos del servidor" : "Datos de demostración"} />
        <Kpi label="Disponibles para pedido" value={String(disponibles.length)} tone="bien" hint="Liberados y con existencia" />
        <Kpi label="Mis pedidos" value={String(pedidos.length)} hint={hasApiSession() ? "Registrados en la API" : "Inicia sesión para pedir"} />
      </div>

      {error && <p role="alert" className="rounded-xl bg-cereza/10 px-4 py-3 text-xs font-medium text-cereza">{error}</p>}

      <ConsultaLote />

      <Card>
        <CardTitle icon={<QrCode className="size-4" />} title="Catálogo verificable" hint="Cada lote tiene su propio QR: abre su ficha con origen, proceso y estado. Nunca muestra costos internos." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lotes.map((l, i) => (
            <motion.article
              key={l.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex gap-4 rounded-2xl border border-line bg-surface p-4"
            >
              <QrDescargable loteId={l.id} compacto />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[0.7rem] text-ink-soft">{l.id}</p>
                  <span className={cn("rounded-full px-2 py-0.5 text-[0.6rem] font-bold", ESTADO[l.estado].clase)}>{ESTADO[l.estado].texto}</span>
                </div>
                <h3 className="mt-1 truncate text-sm font-semibold">{l.producto}</h3>
                <p className="mt-1 flex items-center gap-1 truncate text-[0.7rem] text-ink-soft">
                  <MapPin className="size-3 shrink-0" /> {l.origen} · {l.productor}
                </p>
                <p className="mt-1 font-mono text-[0.7rem] text-ink-soft">{l.disponibleKg} kg disponibles</p>
                <Link href={rutaFicha(l.id)} className="mt-3 inline-flex items-center gap-1 text-[0.7rem] font-semibold text-bosque-500 hover:underline">
                  <ExternalLink className="size-3" /> Ver ficha
                </Link>
              </div>
            </motion.article>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <NuevoPedido disponibles={disponibles} onCreado={() => setRecarga((n) => n + 1)} />
        <Card>
          <CardTitle icon={<Truck className="size-4" />} title="Mis pedidos" hint="Pedidos registrados con tu cuenta." />
          <Table head={["Pedido", "Producto", "Cantidad", "Destino", "Estado"]} empty={!pedidos.length}>
            {pedidos.map((p) => (
              <tr key={String(p.order_id ?? p.id)}>
                <Td className="font-mono text-[0.7rem]">{String(p.order_id ?? p.id ?? "").slice(0, 8)}</Td>
                <Td>{p.product}</Td>
                <Td>{p.quantity} kg</Td>
                <Td>{p.destination}</Td>
                <Td>{p.status}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </div>
  );
}

function ConsultaLote() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const buscar = (e: FormEvent) => {
    e.preventDefault();
    const id = codigo.trim().toUpperCase();
    if (!/^[A-Z0-9-]{2,80}$/.test(id)) return setError("Escribe el código impreso en el empaque, por ejemplo CAC001.");
    router.push(rutaFicha(id));
  };
  return (
    <Card>
      <CardTitle icon={<Search className="size-4" />} title="Consultar un lote" hint="Escribe el código del empaque o escanea su QR con la cámara del celular." />
      <form onSubmit={buscar} className="flex flex-col gap-3 sm:flex-row sm:items-end" noValidate>
        <Field label="Código del lote" error={error ?? undefined} className="flex-1">
          <Input value={codigo} onChange={(e) => { setCodigo(e.target.value); setError(null); }} placeholder="CAC001" autoCapitalize="characters" />
        </Field>
        <Button type="submit">
          <Search className="size-4" /> Ver ficha
        </Button>
      </form>
    </Card>
  );
}

function NuevoPedido({ disponibles, onCreado }: { disponibles: LoteVista[]; onCreado: () => void }) {
  const { notify } = useToast();
  const [form, setForm] = useState({ lote: "", kg: "", destino: "" });
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const lote = disponibles.find((l) => l.id === (form.lote || disponibles[0]?.id));

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const kg = Number(form.kg);
    if (!hasApiSession()) return setError("Inicia sesión con tu cuenta de comprador para registrar pedidos.");
    if (!lote) return setError("No hay lotes disponibles para pedido en este momento.");
    if (!Number.isFinite(kg) || kg <= 0) return setError("La cantidad debe ser mayor que 0 kg.");
    if (kg > lote.disponibleKg) return setError(`${lote.id} tiene ${lote.disponibleKg} kg disponibles.`);
    if (form.destino.trim().length < 3) return setError("Indica la ciudad o dirección de entrega.");
    setError(null);
    setEnviando(true);
    try {
      await createOrder({ product: `${lote.producto} · ${lote.id}`, quantity: kg, origin: lote.origen, destination: form.destino.trim() });
      notify("exito", "Pedido registrado", `${kg} kg de ${lote.id} hacia ${form.destino.trim()}.`);
      setForm({ lote: lote.id, kg: "", destino: "" });
      onCreado();
    } catch (cause) {
      setError(cause instanceof OriviaApiError ? cause.message : "No se pudo registrar el pedido.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Card>
      <CardTitle icon={<ShoppingBag className="size-4" />} title="Solicitar un pedido" hint="Solo lotes liberados y con existencia; los bloqueados no se ofrecen." />
      {disponibles.length === 0 ? (
        <p className="flex items-center gap-2 text-xs text-ink-soft">
          <PackageCheck className="size-4" /> No hay lotes disponibles para pedido ahora.
        </p>
      ) : (
        <form onSubmit={enviar} className="grid gap-3" noValidate>
          <Field label="Lote">
            <select
              value={lote?.id ?? ""}
              onChange={(e) => setForm({ ...form, lote: e.target.value })}
              className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-bosque-500"
            >
              {disponibles.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.id} · {l.producto} ({l.disponibleKg} kg)
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Cantidad (kg)">
              <Input type="number" min="0" step="0.1" inputMode="decimal" value={form.kg} onChange={(e) => setForm({ ...form, kg: e.target.value })} />
            </Field>
            <Field label="Destino">
              <Input value={form.destino} onChange={(e) => setForm({ ...form, destino: e.target.value })} placeholder="Neiva, Huila" />
            </Field>
          </div>
          {error && <p role="alert" className="rounded-xl bg-cereza/10 px-3 py-2 text-xs font-medium text-cereza">{error}</p>}
          <Button type="submit" disabled={enviando}>
            <ShoppingBag className="size-4" /> {enviando ? "Registrando…" : "Registrar pedido"}
          </Button>
        </form>
      )}
    </Card>
  );
}
