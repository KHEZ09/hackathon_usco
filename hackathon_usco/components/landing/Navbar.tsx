"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LayoutDashboard, LogOut, Menu, QrCode, Search, UserPlus, UserRound, X } from "lucide-react";
import { OriviaLogo } from "@/components/brand/OriviaLogo";
import { ROLES, ROLE_HOME, type Role, type Session } from "@/components/auth/roles";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "#origen", label: "Fincas" },
  { href: "#proceso", label: "Proceso" },
  { href: "#trazabilidad", label: "Trazabilidad" },
  { href: "#productos", label: "Productos" },
  { href: "#contacto", label: "Contacto" },
];

const ROLE_ORDER: Role[] = ["operador", "administrador", "comprador"];

type Props = {
  session: Session | null;
  onLogin: () => void;
  onRegister: (role?: Role) => void;
  onLogout: () => void;
};

export function Navbar({ session, onLogin, onRegister, onLogout }: Props) {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [codigo, setCodigo] = useState("");
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > window.innerHeight * 1.35);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const buscar = (e: FormEvent) => {
    e.preventDefault();
    const c = codigo.trim().toUpperCase();
    if (c) router.push(`/ficha/${encodeURIComponent(c)}`);
  };

  const role = session ? ROLES[session.role] : null;
  const ghost = solid ? "hover:bg-surface-2" : "hover:bg-crema/10";

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,color] duration-500",
        solid ? "bg-surface/85 text-ink shadow-[0_1px_0_var(--line)] backdrop-blur-xl" : "bg-transparent text-crema",
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-8" aria-label="Principal">
        <a href="#" aria-label="ORIVIA, ir al inicio" className="shrink-0">
          <OriviaLogo tone={solid ? "oscuro" : "claro"} wordClassName="text-base sm:text-lg" />
        </a>

        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className={cn("rounded-full px-4 py-2 text-[0.8rem] font-medium tracking-wide transition", ghost)}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          {session && role ? (
            <div className="hidden items-center gap-2 sm:flex">
              <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium", solid ? "border-line bg-card" : "border-crema/30 bg-crema/10 backdrop-blur")}>
                <role.icon className="size-3.5" />
                {role.label}
              </span>
              <Link
                href={ROLE_HOME[session.role]}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold shadow-lg transition",
                  solid ? "bg-bosque text-crema hover:bg-bosque-700" : "bg-crema text-bosque hover:bg-white",
                )}
              >
                <LayoutDashboard className="size-3.5" /> Mi panel
              </Link>
              <button onClick={onLogout} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition", ghost)}>
                <LogOut className="size-3.5" /> Salir
              </button>
            </div>
          ) : (
            <>
            <div ref={menuRef} className="relative hidden sm:inline-flex items-center">
              <div
                className={cn(
                  "inline-flex items-stretch rounded-full border text-xs font-semibold shadow-sm transition overflow-hidden",
                  solid
                    ? "border-bosque/40 text-bosque dark:text-bosque-300"
                    : "border-crema/40 text-crema backdrop-blur",
                )}
              >
                {/* Clic al botón principal: abre el modal sin seleccionar ningún rol */}
                <button
                  type="button"
                  onClick={() => onRegister()}
                  className={cn(
                    "inline-flex items-center gap-1.5 pl-4 pr-3 py-2 transition sm:pl-5 sm:pr-3 sm:py-2.5",
                    solid ? "hover:bg-bosque/10" : "hover:bg-crema/10",
                  )}
                >
                  <UserPlus className="size-3.5" /> Crear cuenta
                </button>

                {/* Divisor sutil */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "w-px my-1.5",
                    solid ? "bg-bosque/25 dark:bg-bosque-400/20" : "bg-crema/30",
                  )}
                />

                {/* Clic solo a la flechita: despliega la checklist de los 3 tipos de usuario */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenu((v) => !v);
                  }}
                  aria-expanded={menu}
                  aria-haspopup="menu"
                  aria-label="Desplegar opciones de tipo de cuenta"
                  className={cn(
                    "inline-flex items-center px-2.5 py-2 transition sm:px-3 sm:py-2.5",
                    solid ? "hover:bg-bosque/10" : "hover:bg-crema/10",
                    menu && (solid ? "bg-bosque/15" : "bg-crema/15"),
                  )}
                >
                  <ChevronDown className={cn("size-3.5 transition-transform duration-200", menu && "rotate-180")} />
                </button>
              </div>

              <AnimatePresence>
                {menu && (
                  <motion.div
                    role="menu"
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 top-full mt-2 w-64 origin-top-right rounded-2xl border border-crema/15 bg-bosque-950/95 p-2 text-crema shadow-2xl backdrop-blur-xl z-50"
                  >
                    <p className="px-3 pt-1.5 pb-1 text-[0.6rem] font-semibold tracking-wider text-crema/60 uppercase">
                      Elige tipo de cuenta
                    </p>
                    {ROLE_ORDER.map((r) => {
                      const info = ROLES[r];
                      return (
                        <button
                          key={r}
                          role="menuitem"
                          onClick={() => {
                            setMenu(false);
                            onRegister(r);
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-arena hover:text-bosque"
                        >
                          <info.icon className="size-4 shrink-0" />
                          <span>
                            <span className="block text-xs font-semibold">{info.label}</span>
                            <span className="block text-[0.65rem] opacity-70">{info.tema}</span>
                          </span>
                        </button>
                      );
                    })}
                    <form onSubmit={buscar} className="mt-1 flex items-center gap-2 rounded-xl border border-crema/15 px-3 py-2">
                      <Search className="size-3.5 shrink-0 opacity-70" />
                      <input
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value)}
                        placeholder="Código de lote o QR (CAC002)"
                        aria-label="Código de lote para abrir la ficha pública"
                        className="min-w-0 flex-1 bg-transparent text-xs text-crema outline-none placeholder:text-crema/50"
                      />
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button
              onClick={() => onLogin()}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold shadow-lg transition sm:px-5 sm:py-2.5",
                solid ? "bg-bosque text-crema shadow-bosque/20 hover:bg-bosque-700" : "bg-arena text-bosque shadow-black/20 hover:bg-crema",
              )}
            >
              <UserRound className="size-3.5" /> Iniciar sesión
            </button>
            </>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className={cn("rounded-full p-2 lg:hidden", ghost)}
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
            className="mx-4 mb-3 rounded-3xl border border-line bg-card p-3 text-ink shadow-2xl lg:hidden"
          >
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-2xl px-4 py-3 text-sm font-medium hover:bg-surface-2">
                {l.label}
              </a>
            ))}
            <div className="mt-2 border-t border-line pt-2">
              {session ? (
                <>
                  <Link href={ROLE_HOME[session.role]} onClick={() => setOpen(false)} className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold hover:bg-surface-2">
                    <LayoutDashboard className="size-4" /> Ir a mi panel
                  </Link>
                  <button
                    onClick={() => {
                      setOpen(false);
                      onLogout();
                    }}
                    className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold hover:bg-surface-2"
                  >
                    <LogOut className="size-4" /> Cerrar sesión ({role?.label})
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setOpen(false);
                      onLogin();
                    }}
                    className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold hover:bg-surface-2"
                  >
                    <UserRound className="size-4" /> Iniciar sesión
                  </button>
                  <button
                    onClick={() => {
                      setOpen(false);
                      onRegister();
                    }}
                    className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold hover:bg-surface-2"
                  >
                    <UserPlus className="size-4" /> Crear cuenta
                  </button>
                  <Link href="/ficha/CAC002" onClick={() => setOpen(false)} className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold hover:bg-surface-2">
                    <QrCode className="size-4" /> Ver una ficha QR
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
