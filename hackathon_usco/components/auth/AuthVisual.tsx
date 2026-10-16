"use client";

import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { OriviaIsotipo } from "@/components/brand/OriviaLogo";

const MOTAS = Array.from({ length: 14 }, (_, i) => ({
  left: (i * 41) % 100,
  top: 20 + ((i * 29) % 70),
  size: 1.5 + (i % 3),
  delay: (i * 1.3) % 9,
  duration: 9 + (i % 4) * 2,
}));

/** Panel fotográfico de las ventanas de acceso: foto con zoom lento, luz dorada y frase animada. */
export function AuthVisual({ img, frase, lugar }: { img: string; frase: string; lugar: string }) {
  return (
    <div className="relative hidden overflow-hidden md:block">
      <motion.div
        initial={{ scale: 1.18, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0"
      >
        <div className="absolute inset-0 animate-ken-burns bg-cover bg-center" style={{ backgroundImage: `url(${img})` }} />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-t from-bosque-950 via-bosque-950/45 to-bosque-950/5" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_8%,rgba(226,184,110,0.32),transparent_45%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {MOTAS.map((m, i) => (
          <span
            key={i}
            className="absolute animate-mote rounded-full bg-[#f6e7b8] shadow-[0_0_8px_2px_rgba(246,231,184,0.5)]"
            style={{ left: `${m.left}%`, top: `${m.top}%`, width: m.size, height: m.size, animationDelay: `${-m.delay}s`, animationDuration: `${m.duration}s` }}
          />
        ))}
      </div>

      <div className="relative flex h-full flex-col justify-between p-8 text-crema">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.7 }}>
          <OriviaIsotipo className="h-14" />
        </motion.div>
        <div>
          <motion.p
            initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.45, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="font-script text-5xl leading-tight"
          >
            {frase}
          </motion.p>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.8, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 h-px w-16 origin-left bg-[#e2b86e]"
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="mt-4 text-[0.65rem] font-light tracking-[0.4em]"
          >
            DEL ORIGEN AL MUNDO
          </motion.p>
          <motion.p
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.15, duration: 0.6 }}
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-crema/12 px-3 py-1 text-[0.65rem] backdrop-blur"
          >
            <MapPin className="size-3" /> {lugar}
          </motion.p>
        </div>
      </div>
    </div>
  );
}
