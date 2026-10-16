"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ClipboardList, Network } from "lucide-react";
import { cn } from "@/lib/cn";

type Tab = "operacion" | "cluster";

/** Pestañas internas de los paneles: operación del lote y red del clúster. */
export function PanelTabs({ operacion, cluster, badge }: { operacion: ReactNode; cluster: ReactNode; badge?: number }) {
  const [tab, setTab] = useState<Tab>("operacion");
  const tabs: Array<{ id: Tab; label: string; icon: typeof Network }> = [
    { id: "operacion", label: "Operación", icon: ClipboardList },
    { id: "cluster", label: "Red del clúster", icon: Network },
  ];
  return (
    <div>
      <div role="tablist" aria-label="Secciones del panel" className="mb-6 inline-flex rounded-full border border-line bg-card p-1 shadow-sm">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn("relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition", tab === t.id ? "text-crema" : "text-ink-soft hover:text-ink")}
          >
            {tab === t.id && <motion.span layoutId="panel-tab" className="absolute inset-0 rounded-full bg-bosque" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
            <t.icon className="relative size-3.5" />
            <span className="relative">{t.label}</span>
            {t.id === "cluster" && !!badge && (
              <span className="relative grid size-4 place-items-center rounded-full bg-ambar text-[0.58rem] text-carbon">{badge}</span>
            )}
          </button>
        ))}
      </div>
      <motion.div key={tab} role="tabpanel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        {tab === "operacion" ? operacion : cluster}
      </motion.div>
    </div>
  );
}
