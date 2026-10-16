"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Menu, QrCode, UserRound, X } from "lucide-react";
import { OriviaLogo } from "@/components/brand/OriviaLogo";
import { ROLES, type Role, type Session } from "@/components/auth/roles";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "#origen", label: "Fincas" },
  { href: "#trazabilidad", label: "Trazabilidad" },
  { href: "#productos", label: "Productos" },
  { href: "#contacto", label: "Contacto" },
];

type Props = {
  session: Session | null;
  onLogin: (role?: Role) => void;
  onLogout: () => void;
};

export function Navbar({ session, onLogin, onLogout }: Props) {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > window.innerHeight * 1.35);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const role = session ? ROLES[session.role] : null;

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,color] duration-500",
        solid
          ? "bg-surface/85 text-ink shadow-[0_1px_0_var(--line)] backdrop-blur-xl"
          : "bg-transparent text-crema",
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-8" aria-label="Principal">
        <a href="#" aria-label="ORIVIA, ir al inicio" className="shrink-0">
          <OriviaLogo tone={solid ? "oscuro" : "claro"} wordClassName="text-base sm:text-lg" />
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className={cn(
                  "rounded-full px-4 py-2 text-[0.8rem] font-medium tracking-wide transition",
                  solid ? "hover:bg-surface-2" : "hover:bg-crema/10",
                )}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          {session && role ? (
            <div className="hidden items-center gap-2 sm:flex">
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
                  solid ? "border-line bg-card" : "border-crema/30 bg-crema/10 backdrop-blur",
                )}
              >
                <role.icon className="size-3.5" />
                {role.label}
              </span>
              <button
                onClick={onLogout}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition",
                  solid ? "hover:bg-surface-2" : "hover:bg-crema/10",
                )}
              >
                <LogOut className="size-3.5" /> Salir
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => onLogin("comprador")}
                className={cn(
                  "hidden items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition sm:inline-flex",
                  solid ? "hover:bg-surface-2" : "hover:bg-crema/10",
                )}
              >
                <QrCode className="size-3.5" /> Ficha QR
              </button>
              <button
                onClick={() => onLogin()}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold shadow-lg transition sm:px-5 sm:py-2.5",
                  solid
                    ? "bg-bosque text-crema shadow-bosque/20 hover:bg-bosque-700"
                    : "bg-crema text-bosque shadow-black/20 hover:bg-white",
                )}
              >
                <UserRound className="size-3.5" /> Ingresar
              </button>
            </>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className={cn("rounded-full p-2 md:hidden", solid ? "hover:bg-surface-2" : "hover:bg-crema/10")}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-4 mb-3 rounded-3xl border border-line bg-card p-3 text-ink shadow-2xl md:hidden"
          >
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-2xl px-4 py-3 text-sm font-medium hover:bg-surface-2"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 border-t border-line pt-2">
              {session ? (
                <button
                  onClick={() => {
                    setOpen(false);
                    onLogout();
                  }}
                  className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold hover:bg-surface-2"
                >
                  <LogOut className="size-4" /> Cerrar sesión ({role?.label})
                </button>
              ) : (
                <button
                  onClick={() => {
                    setOpen(false);
                    onLogin("comprador");
                  }}
                  className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold hover:bg-surface-2"
                >
                  <QrCode className="size-4" /> Consultar ficha QR
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
