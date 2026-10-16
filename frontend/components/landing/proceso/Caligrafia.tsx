"use client";

import Link from "next/link";
import { motion, useTransform, type MotionValue } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { ProcessStage } from "@/data/cacaoProcessData";
import { useLocal } from "./utils";

/** "Cada grano tiene una historia" escrito a mano: se revela con el scroll y se traza el subrayado. */
export function Caligrafia({ p, stage }: { p: MotionValue<number>; stage: ProcessStage }) {
  const local = useLocal(p, 4);
  const revela = useTransform(local, [0.15, 0.6], [100, 0]);
  const clip = useTransform(revela, (v) => `inset(0 ${v}% 0 0)`);
  const trazo = useTransform(local, [0.5, 0.8], [0, 1]);
  const cta = useTransform(local, [0.7, 0.85], [0, 1]);
  return (
    <div>
      <motion.p style={{ clipPath: clip }} className="font-script text-5xl leading-[1.05] text-crema sm:text-6xl lg:text-[3.1rem] xl:text-[3.6rem]">
        {stage.title}
      </motion.p>
      <svg viewBox="0 0 300 50" className="mt-1 w-56" aria-hidden="true">
        <motion.path
          d="M4 30 C 60 46, 120 10, 170 26 C 205 37, 225 40, 250 22 C 262 13, 276 14, 268 26 C 262 35, 280 34, 296 20"
          fill="none"
          stroke="#efe3cf"
          strokeWidth="1.6"
          strokeLinecap="round"
          style={{ pathLength: trazo }}
        />
      </svg>
      <motion.div style={{ opacity: cta }} className="mt-4">
        <Link href={stage.actionButton.url ?? "/ficha/CAC001"} className="inline-flex items-center gap-1.5 rounded-full bg-crema px-4 py-2 text-xs font-semibold text-bosque transition hover:bg-white">
          {stage.actionButton.label} <ArrowUpRight className="size-3.5" />
        </Link>
      </motion.div>
    </div>
  );
}
