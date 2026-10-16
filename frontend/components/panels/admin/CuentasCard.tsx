"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, Loader2, Lock, UserPlus, Users } from "lucide-react";
import { useToast } from "@/components/ui/Toaster";
import { createAccount, listAccounts, setAccountStatus, type ApiAccount } from "@/lib/orivia-api";
import { mensajeError } from "@/lib/errores-api";
import { limpiarTexto, validarRegistro, type RegistroErrores } from "@/lib/registro";
import { Button, Card, CardTitle, Field, Input, Select, Table, Td } from "../ui";
import { cn } from "@/lib/cn";

const ROLES = [
  { role: "OPERATOR", label: "Operador" },
  { role: "ADMIN", label: "Administrador" },
  { role: "BUYER", label: "Comprador" },
  { role: "ACCOUNTING", label: "Contabilidad" },
  { role: "VIEWER", label: "Consulta" },
];
const etiqueta = (role: string) => ROLES.find((r) => r.role === role)?.label ?? role;
const ESTADOS: Record<string, { texto: string; clase: string }> = {
  ACTIVE: { texto: "Activa", clase: "bg-bosque-500/15 text-bosque-500 dark:text-bosque-300" },
  SUSPENDED: { texto: "Pendiente", clase: "bg-ambar/15 text-ambar" },
  BLOCKED: { texto: "Bloqueada", clase: "bg-cereza/15 text-cereza" },
};
const VACIO = { nombre: "", correo: "", password: "", confirmacion: "", rol: "OPERATOR" };

/** Gestión de cuentas en PostgreSQL: aprobar solicitudes y crear usuarios de cualquier rol. */
export function CuentasCard() {
  const { notify } = useToast();
  const [cuentas, setCuentas] = useState<ApiAccount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState<RegistroErrores>({});
  const [ocupado, setOcupado] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setCuentas(await listAccounts());
      setError(null);
    } catch (e) {
      setError(mensajeError(e, "No se pudieron cargar las cuentas."));
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void cargar(), 0);
    return () => clearTimeout(t);
  }, [cargar]);

  const cambiarEstado = async (cuenta: ApiAccount, status: "ACTIVE" | "BLOCKED") => {
    setOcupado(cuenta.user_id);
    try {
      await setAccountStatus(cuenta.user_id, status);
      notify("exito", status === "ACTIVE" ? "Cuenta aprobada" : "Cuenta bloqueada", `${cuenta.full_name} · ${etiqueta(cuenta.roles[0] ?? "")}`);
      await cargar();
    } catch (e) {
      notify("error", "No se cambió la cuenta", mensajeError(e));
    } finally {
      setOcupado(null);
    }
  };

  const crear = async (e: FormEvent) => {
    e.preventDefault();
    const encontrados = validarRegistro(form, ROLES.map((r) => r.role));
    setErrores(encontrados);
    if (Object.keys(encontrados).length) return;
    setOcupado("crear");
    try {
      const cuenta = await createAccount({
        full_name: limpiarTexto(form.nombre),
        email: limpiarTexto(form.correo).toLowerCase(),
        password: form.password,
        password_confirmation: form.confirmacion,
        role: form.rol,
      });
      notify("exito", "Cuenta creada", `${cuenta.full_name} ya puede iniciar sesión como ${etiqueta(form.rol)}.`);
      setForm({ ...VACIO, rol: form.rol });
      await cargar();
    } catch (err) {
      const msg = mensajeError(err);
      setErrores(/correo/i.test(msg) ? { correo: msg } : /contraseña/i.test(msg) ? { password: msg } : {});
      notify("error", "No se creó la cuenta", msg);
    } finally {
      setOcupado(null);
    }
  };

  const pendientes = cuentas?.filter((c) => c.pending_approval) ?? [];

  return (
    <Card>
      <CardTitle icon={<Users className="size-4" />} title="Cuentas de usuario" hint="Operadores, administradores y compradores guardados en la base de datos." />

      {error && <p className="mb-4 rounded-2xl bg-cereza/10 px-4 py-3 text-xs text-ink">{error}</p>}

      {pendientes.length > 0 && (
        <div className="mb-5 rounded-2xl border border-ambar/40 bg-ambar/8 p-4">
          <p className="text-sm font-semibold">
            {pendientes.length} solicitud{pendientes.length > 1 ? "es" : ""} pendiente{pendientes.length > 1 ? "s" : ""} de aprobación
          </p>
          <ul className="mt-3 space-y-2">
            {pendientes.map((c) => (
              <li key={c.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-card px-3.5 py-2.5 text-xs">
                <span>
                  <span className="font-semibold">{c.full_name}</span> · {c.email} · solicita <span className="font-semibold">{etiqueta(c.roles[0] ?? "")}</span>
                </span>
                <span className="flex gap-2">
                  <Button variant="secundario" disabled={ocupado === c.user_id} onClick={() => void cambiarEstado(c, "ACTIVE")}>
                    <Check className="size-3.5" /> Aprobar
                  </Button>
                  <Button variant="fantasma" disabled={ocupado === c.user_id} onClick={() => void cambiarEstado(c, "BLOCKED")}>
                    <Lock className="size-3.5" /> Rechazar
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="min-w-0">
          {cuentas === null && !error ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-xl bg-surface-2" />
              ))}
            </div>
          ) : (
            <Table head={["Nombre", "Correo", "Rol", "Estado", ""]} empty={!cuentas?.length}>
              {(cuentas ?? []).map((c) => {
                const estado = ESTADOS[c.account_status] ?? { texto: c.account_status, clase: "bg-surface-2 text-ink-soft" };
                return (
                  <tr key={c.user_id}>
                    <Td className="font-semibold">{c.full_name}</Td>
                    <Td className="text-ink-soft">{c.email}</Td>
                    <Td>{c.roles.map(etiqueta).join(", ") || "—"}</Td>
                    <Td>
                      <span className={cn("rounded-full px-2.5 py-1 text-[0.65rem] font-bold", estado.clase)}>{estado.texto}</span>
                    </Td>
                    <Td>
                      {c.account_status === "ACTIVE" ? (
                        <button className="text-xs text-ink-soft hover:text-cereza" disabled={ocupado === c.user_id} onClick={() => void cambiarEstado(c, "BLOCKED")}>
                          Bloquear
                        </button>
                      ) : (
                        <button className="text-xs text-ink-soft hover:text-bosque-500" disabled={ocupado === c.user_id} onClick={() => void cambiarEstado(c, "ACTIVE")}>
                          Activar
                        </button>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </Table>
          )}
        </div>

        <form onSubmit={crear} noValidate className="min-w-0 space-y-3 rounded-2xl bg-surface-2 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <UserPlus className="size-4" /> Crear cuenta
          </p>
          <Field label="Nombre completo" error={errores.nombre}>
            <Input value={form.nombre} maxLength={120} autoComplete="off" onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </Field>
          <Field label="Correo" error={errores.correo}>
            <Input type="email" value={form.correo} maxLength={254} autoComplete="off" onChange={(e) => setForm({ ...form, correo: e.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Contraseña" error={errores.password}>
              <Input type="password" value={form.password} autoComplete="new-password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <Field label="Confirmar contraseña" error={errores.confirmacion}>
              <Input type="password" value={form.confirmacion} autoComplete="new-password" onChange={(e) => setForm({ ...form, confirmacion: e.target.value })} />
            </Field>
          </div>
          <Field label="Rol" error={errores.rol}>
            <Select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
              {ROLES.map((r) => (
                <option key={r.role} value={r.role}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
          <p className="text-[0.68rem] text-ink-soft">Mínimo 10 caracteres con mayúscula, minúscula, número y símbolo. La contraseña se guarda cifrada (bcrypt).</p>
          <Button type="submit" className="w-full justify-center py-3" disabled={ocupado === "crear"}>
            {ocupado === "crear" ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />} Crear cuenta
          </Button>
        </form>
      </div>
    </Card>
  );
}
