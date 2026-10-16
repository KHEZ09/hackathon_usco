"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastKind = "exito" | "error" | "info";
type Toast = { id: string; kind: ToastKind; title: string; body?: string };
type ToastApi = { notify: (kind: ToastKind, title: string, body?: string) => void };

const ToastContext = createContext<ToastApi | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <Toaster>");
  return ctx;
}

const ICONS = { exito: CheckCircle2, error: AlertTriangle, info: Info } as const;

export function Toaster({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const notify = useCallback<ToastApi["notify"]>(
    (kind, title, body) => {
      const id = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
      setToasts((t) => [...t.slice(-2), { id, kind, title, body }]);
      const duration = kind === "error" ? 6000 : 4200;
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[80] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = ICONS[t.kind];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line bg-card/95 p-4 shadow-xl shadow-black/10 backdrop-blur"
              >
                <Icon
                  className={cn(
                    "mt-0.5 size-5 shrink-0",
                    t.kind === "exito" && "text-bosque-500",
                    t.kind === "error" && "text-cereza",
                    t.kind === "info" && "text-tierra-300",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{t.title}</p>
                  {t.body && <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{t.body}</p>}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  className="rounded-full p-1 text-ink-soft transition hover:bg-surface-2 hover:text-ink"
                  aria-label="Cerrar aviso"
                >
                  <X className="size-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
