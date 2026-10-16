"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import type { Estado } from "@/lib/store";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("min-w-0 rounded-[1.5rem] border border-line bg-card p-5 shadow-sm sm:p-6", className)}>{children}</section>;
}

export function CardTitle({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon && <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-bosque-500/12 text-bosque-500">{icon}</span>}
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function Field({ label, error, children, className }: { label: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="text-xs font-medium text-ink-soft">{label}</span>
      <span className="mt-1.5 block">{children}</span>
      {error && <span className="mt-1 block text-[0.7rem] font-medium text-cereza">{error}</span>}
    </label>
  );
}

const control =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-bosque-500 focus:ring-4 focus:ring-bosque-500/15";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(control, props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(control, "pr-8", props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(control, "min-h-20 resize-y", props.className)} />;
}

export function Button({
  variant = "primario",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primario" | "secundario" | "peligro" | "fantasma" }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primario" && "bg-bosque text-crema shadow-sm hover:bg-bosque-700",
        variant === "secundario" && "border border-line bg-card text-ink hover:border-bosque-300",
        variant === "peligro" && "bg-cereza text-crema hover:bg-[#8a1f23]",
        variant === "fantasma" && "text-ink-soft hover:bg-surface-2 hover:text-ink",
        className,
      )}
    />
  );
}

const ESTADO_STYLES: Record<Estado, string> = {
  PENDIENTE: "bg-ambar/15 text-ambar",
  LIBERADO: "bg-bosque-500/15 text-bosque-500",
  BLOQUEADO: "bg-cereza/15 text-cereza",
};

export function EstadoBadge({ estado, className }: { estado: Estado; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[0.62rem] font-bold tracking-wider", ESTADO_STYLES[estado], className)}>
      {estado}
    </span>
  );
}

export function Kpi({ label, value, unit, hint, tone = "normal" }: { label: string; value: string; unit?: string; hint?: string; tone?: "normal" | "alerta" | "bien" }) {
  return (
    <div className="rounded-[1.25rem] border border-line bg-card p-4 sm:p-5">
      <p className="text-[0.7rem] font-medium text-ink-soft">{label}</p>
      <p
        className={cn(
          "mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl",
          tone === "alerta" && "text-ambar",
          tone === "bien" && "text-bosque-500",
          tone === "normal" && "text-ink",
        )}
      >
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-ink-soft">{unit}</span>}
      </p>
      {hint && <p className="mt-1 text-[0.68rem] text-ink-soft">{hint}</p>}
    </div>
  );
}

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="-mx-5 overflow-x-auto sm:-mx-6">
      <table className="w-full min-w-[640px] text-left text-xs">
        <thead>
          <tr className="border-b border-line text-[0.65rem] tracking-wider text-ink-soft uppercase">
            {head.map((h) => (
              <th key={h} className="px-5 py-2.5 font-semibold first:pl-5 sm:first:pl-6">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
      {empty && <p className="px-6 py-8 text-center text-xs text-ink-soft">No hay registros con estos filtros.</p>}
    </div>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-5 py-3 align-middle text-ink first:pl-5 sm:first:pl-6", className)}>{children}</td>;
}
