"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = { open: boolean; onClose: () => void; titulo: string; subtitulo?: string; children: ReactNode; ancho?: "md" | "lg" };

/** Diálogo modal de los paneles: hoja inferior en móvil, centrado en escritorio. */
export function Modal({ open, onClose, titulo, subtitulo, children, ancho = "md" }: Props) {
  return <AnimatePresence>{open && <ModalBody onClose={onClose} titulo={titulo} subtitulo={subtitulo} ancho={ancho}>{children}</ModalBody>}</AnimatePresence>;
}

function ModalBody({ onClose, titulo, subtitulo, children, ancho }: Omit<Props, "open">) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <motion.div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        className={cn(
          "relative max-h-[92svh] w-full overflow-y-auto rounded-t-[1.75rem] border border-line bg-card p-6 text-ink shadow-2xl sm:rounded-[1.75rem]",
          ancho === "lg" ? "max-w-3xl" : "max-w-lg",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{titulo}</h2>
            {subtitulo && <p className="mt-0.5 text-xs text-ink-soft">{subtitulo}</p>}
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-full p-1.5 text-ink-soft hover:bg-surface-2 hover:text-ink">
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </motion.div>
    </motion.div>
  );
}
