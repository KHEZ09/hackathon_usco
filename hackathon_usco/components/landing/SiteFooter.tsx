"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, Mail, MapPin } from "lucide-react";
import { OriviaLogo } from "@/components/brand/OriviaLogo";
import { CacaoBranch, CacaoLeaf, useWind } from "./Botanica";
import type { Role } from "@/components/auth/roles";

export function SiteFooter({ onLogin }: { onLogin: (role?: Role) => void }) {
  const footerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: footerRef, offset: ["start end", "end end"] });
  const branchY = useTransform(scrollYProgress, [0, 1], [30, -10]);
  const leftRotate = useTransform(scrollYProgress, [0, 1], [-4, 2]);
  const rightRotate = useTransform(scrollYProgress, [0, 1], [4, -2]);
  const wind = useWind(1.2);

  return (
    <footer ref={footerRef} id="contacto" className="relative isolate mt-12 overflow-hidden bg-bosque text-crema">
      {/* Rama y hojas animadas en la esquina superior izquierda (estilo fincas) */}
      <motion.div
        aria-hidden="true"
        style={{ y: branchY, rotate: leftRotate }}
        className="pointer-events-none absolute -top-12 -left-8 z-0 w-[min(70vw,420px)] drop-shadow-[0_20px_28px_rgba(0,0,0,0.45)] sm:-top-16 sm:-left-10 sm:w-[460px] lg:-top-20 lg:w-[500px]"
      >
        <CacaoBranch className="w-full" wind={wind} lado="izquierda" />
      </motion.div>

      {/* Rama y hojas animadas en la esquina superior derecha (estilo fincas) */}
      <motion.div
        aria-hidden="true"
        style={{ y: branchY, rotate: rightRotate }}
        className="pointer-events-none absolute -top-12 -right-8 z-0 w-[min(70vw,420px)] drop-shadow-[0_20px_28px_rgba(0,0,0,0.45)] sm:-top-16 sm:-right-10 sm:w-[460px] lg:-top-20 lg:w-[500px]"
      >
        <CacaoBranch className="w-full" wind={wind} lado="derecha" />
      </motion.div>

      <CacaoLeaf tone="brote" className="pointer-events-none absolute -bottom-16 -left-28 -z-10 w-[480px] rotate-[18deg] opacity-25 blur-[3px]" />

      <div className="relative z-10 mx-auto max-w-6xl px-5 pt-20 pb-10 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <OriviaLogo withTagline wordClassName="text-2xl" />
            <p className="mt-8 font-script text-4xl text-crema/90">Trazabilidad que se siente.</p>
            <button
              onClick={() => onLogin()}
              className="group mt-8 inline-flex items-center gap-2 rounded-full bg-crema px-6 py-3 text-sm font-semibold text-bosque transition hover:bg-white"
            >
              Ingresar a la plataforma <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>

          <nav aria-label="Pie de página">
            <p className="text-[0.65rem] font-semibold tracking-[0.3em] text-crema/55 uppercase">Plataforma</p>
            <ul className="mt-5 space-y-3 text-sm">
              {[
                ["#origen", "Fincas y origen"],
                ["#trazabilidad", "Trazabilidad"],
                ["#analitica", "Analítica asistida"],
                ["#productos", "Productos verificables"],
              ].map(([href, label]) => (
                <li key={href}>
                  <a href={href} className="text-crema/80 transition hover:text-crema">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="text-[0.65rem] font-semibold tracking-[0.3em] text-crema/55 uppercase">Contacto</p>
            <ul className="mt-5 space-y-3 text-sm text-crema/80">
              <li className="flex items-center gap-2">
                <MapPin className="size-4" /> Rivera · Campoalegre · Algeciras, Huila
              </li>
              <li>
                <a href="mailto:contacto@orivia.co" className="inline-flex items-center gap-2 transition hover:text-crema">
                  <Mail className="size-4" /> contacto@orivia.co
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-crema/15 pt-6 text-[0.7rem] text-crema/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 ORIVIA · Hackatón de agroindustria USCO</p>
          <p className="tracking-[0.3em]">DEL ORIGEN AL MUNDO</p>
        </div>
      </div>
    </footer>
  );
}
