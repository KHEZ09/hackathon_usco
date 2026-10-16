"use client";

import { useCallback, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut } from "lucide-react";
import { OriviaLogo } from "@/components/brand/OriviaLogo";
import { LoginModal } from "@/components/auth/LoginModal";
import { ROLES, useHydrated, useSession, writeSession, type Role } from "@/components/auth/roles";
import { Toaster, useToast } from "@/components/ui/Toaster";
import { clearAuthTokens } from "@/lib/orivia-api";

type Props = { rol: Role; tema: "claro" | "oscuro"; titulo: string; subtitulo: string; children: ReactNode };

export function PanelShell(props: Props) {
  return (
    <div data-tema={props.tema} className="min-h-svh bg-surface text-ink">
      <Toaster>
        <Shell {...props} />
      </Toaster>
    </div>
  );
}

function Shell({ rol, tema, titulo, subtitulo, children }: Props) {
  const hydrated = useHydrated();
  const session = useSession();
  const router = useRouter();
  const { notify } = useToast();

  const salir = () => {
    clearAuthTokens();
    writeSession(null);
    notify("info", "Sesión cerrada");
    router.push("/");
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" aria-label="Volver al inicio" className="shrink-0">
              <OriviaLogo tone={tema === "oscuro" ? "claro" : "oscuro"} wordClassName="hidden text-base sm:inline" />
            </Link>
            <span className="hidden h-6 w-px bg-line sm:block" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{titulo}</p>
              <p className="hidden truncate text-[0.68rem] text-ink-soft sm:block">{subtitulo}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hydrated && session && (
              <button
                onClick={salir}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-ink-soft transition hover:bg-surface-2 hover:text-ink"
              >
                <LogOut className="size-3.5" /> <span className="hidden sm:inline">Salir</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {!hydrated ? (
          <div className="grid gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-[1.25rem] bg-surface-2" />
            ))}
          </div>
        ) : session?.role === rol ? (
          children
        ) : (
          <RoleGate rol={rol} actual={session?.role} />
        )}
      </main>
    </>
  );
}


function RoleGate({ rol, actual }: { rol: Role; actual?: Role }) {
  const [open, setOpen] = useState(false);
  const { notify } = useToast();
  const info = ROLES[rol];
  const close = useCallback(() => setOpen(false), []);

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-bosque-500/12 text-bosque-500">
        <info.icon className="size-7" />
      </span>
      <h1 className="mt-6 text-2xl font-semibold">Acceso para {info.label.toLowerCase()}</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        {actual
          ? `Tu sesión actual es de ${ROLES[actual].label}. Este panel requiere el rol ${info.label}; los permisos se validan por rol.`
          : `Inicia sesión como ${info.label} para continuar. ${info.description}`}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-bosque px-6 py-3 text-sm font-semibold text-crema transition hover:bg-bosque-700"
        >
          <info.icon className="size-4" /> Ingresar como {info.label}
        </button>
        <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 text-sm font-semibold transition hover:bg-surface-2">
          <ArrowLeft className="size-4" /> Volver al inicio
        </Link>
      </div>
      <LoginModal
        open={open}
        initialRole={rol}
        onClose={close}
        onSuccess={(s) => {
          writeSession(s);
          close();
          notify("exito", `Bienvenido, ${ROLES[s.role].label}`);
        }}
      />
    </div>
  );
}
