"use client";

import { useSyncExternalStore } from "react";
import { motion, useSpring, useTransform, type MotionValue } from "framer-motion";
import { BadgeCheck } from "lucide-react";
import { QrCode } from "@/components/ficha/QrCode";
import { useLocal } from "./utils";

/* ── 5. QR verificable: la tarjeta gira y aparece el sello ── */
const noop = () => () => {};

export function EscenaQr({ p }: { p: MotionValue<number> }) {
  const local = useLocal(p, 4);
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const opacity = useTransform(p, [0.79, 0.85], [0, 1]);
  const rotateY = useSpring(useTransform(local, [0, 0.35], [75, -4]), { stiffness: 120, damping: 18 });
  const y = useTransform(local, [0, 0.35], [60, 0]);
  const sello = useSpring(useTransform(local, [0.3, 0.45], [0, 1]), { stiffness: 260, damping: 14 });
  return (
    <motion.div style={{ opacity }} className="absolute inset-0 grid place-items-center [perspective:1200px]">
      <motion.div style={{ rotateY, y, rotateZ: -4 }} className="relative w-[min(58vw,300px)] max-lg:mt-16 lg:w-[min(72vw,300px)]">
        <motion.div
          style={{ scale: sello }}
          className="absolute -top-7 -left-6 z-10 grid size-16 place-items-center rounded-full bg-[#3fae6a] text-white shadow-[0_10px_30px_rgba(63,174,106,0.5)] [clip-path:polygon(50%_0%,61%_10%,75%_7%,80%_20%,93%_25%,90%_39%,100%_50%,90%_61%,93%_75%,80%_80%,75%_93%,61%_90%,50%_100%,39%_90%,25%_93%,20%_80%,7%_75%,10%_61%,0%_50%,10%_39%,7%_25%,20%_20%,25%_7%,39%_10%)]"
        >
          <BadgeCheck className="size-8" />
        </motion.div>
        <div className="overflow-hidden rounded-[1.5rem] bg-[#d9c9a8] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)]">
          <div className="bg-[#3fae6a] py-3 pl-14 text-sm font-bold tracking-[0.18em] text-white">VERIFICADO</div>
          <div className="p-6 text-center text-bosque">
            <div className="mx-auto w-fit rounded-2xl bg-[#fffcf7] p-3 shadow-inner">
              {origin ? <QrCode value={`${origin}/ficha/CAC001`} label="QR de la ficha del lote CAC001" className="size-28 lg:size-40" /> : <div className="size-28 lg:size-40" />}
            </div>
            <p className="mt-4 text-sm font-semibold">Hash verificado en la cadena</p>
            <p className="mt-1 font-mono text-[0.7rem] text-bosque/70 underline">{origin ? `${origin.replace(/^https?:\/\//, "")}/ficha/CAC001` : "/ficha/CAC001"}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
