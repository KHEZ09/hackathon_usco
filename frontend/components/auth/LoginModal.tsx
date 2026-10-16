"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Eye, EyeOff, Loader2, X } from "lucide-react";
import { AuthVisual } from "./AuthVisual";
import { ROLES, ROLE_ORDER, resolveRole, type Role, type Session } from "./roles";
import { cn } from "@/lib/cn";
import { clearAuthTokens, login as loginApi, OriviaApiError } from "@/lib/orivia-api";

type Props = {
  open: boolean;
  initialRole?: Role;
  /** Correo recién registrado para precargar el formulario. */
  initialEmail?: string;
  onRegister?: () => void;
  onClose: () => void;
  onSuccess: (session: Session) => void;
};


export function LoginModal({ open, initialEmail, onRegister, onClose, onSuccess }: Props) {
  return (
    <AnimatePresence>
      {open && <LoginDialog key={initialEmail ?? "login"} initialEmail={initialEmail} onRegister={onRegister} onClose={onClose} onSuccess={onSuccess} />}
    </AnimatePresence>
  );
}

/** Se monta en cada apertura, así el formulario siempre arranca limpio. */
function LoginDialog({ initialEmail, onRegister, onClose, onSuccess }: Omit<Props, "open">) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ok">("idle");
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => emailRef.current?.focus(), 250);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized || !password) return setError("Completa el correo y la contraseña.");
    if (password.length < 6) return setError("La contraseña debe tener al menos 6 caracteres.");

    setError(null);
    setStatus("loading");

    if (process.env.NEXT_PUBLIC_ORIVIA_DEMO_MODE !== "true") {
      try {
        const response = await loginApi(normalized, password);
        const resolvedRole = resolveRole(response.user.roles ?? []);

        setStatus("ok");
        setTimeout(() => onSuccess({
          role: resolvedRole,
          email: response.user.email,
          startedAt: new Date().toISOString(),
          userId: response.user.user_id,
          backendRole: (response.user.roles ?? [])[0] ?? "",
        }), 450);
      } catch (cause) {
        clearAuthTokens();
        setStatus("idle");
        if (cause instanceof OriviaApiError && cause.status === 429) {
          setError(`Demasiados intentos. Espera ${cause.retryAfterSeconds ?? 900} segundos.`);
        } else if (cause instanceof OriviaApiError && cause.status === 401) {
          setError("Credenciales inválidas. Verifica tu correo y contraseña. Si creaste una cuenta de Operador o Administrador, debe aprobarla un administrador antes de entrar.");
        } else {
          setError(cause instanceof Error ? cause.message : "No se pudo iniciar sesión.");
        }
      }
      return;
    }

    // Modo demostración: detecta el rol por correo
    const match = ROLE_ORDER.find((r) => ROLES[r].email === normalized);
    const demoRole: Role = match ?? (
      normalized.includes("admin")
        ? "administrador"
        : normalized.includes("operador") || normalized.includes("operator")
        ? "operador"
        : "comprador"
    );

    setTimeout(() => {
      setStatus("ok");
      setTimeout(() => onSuccess({ role: demoRole, email: normalized, startedAt: new Date().toISOString() }), 600);
    }, 500);
  };

  return (
    <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-bosque-950/70 backdrop-blur-md" />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-title"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="relative grid max-h-[94svh] w-full max-w-4xl overflow-hidden rounded-t-[2rem] bg-card shadow-2xl sm:rounded-[2rem] md:grid-cols-[0.9fr_1.1fr]"
          >
            {/* Panel visual */}
            <AuthVisual img="/media/mazorcas-arbol.jpg" frase="Cada grano tiene una historia" lugar="Mazorcas en el árbol · Huila" />

            {/* Formulario */}
            <div className="overflow-y-auto p-6 sm:p-9">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 text-center">
                  <p className="text-[0.6rem] font-semibold tracking-[0.35em] text-tierra uppercase dark:text-tierra-300">
                    Acceso ORIVIA
                  </p>
                  <h2 id="login-title" className="mt-2 text-3xl font-bold tracking-tight text-ink leading-none">
                    Inicia sesión
                  </h2>
                  <div className="mx-auto mt-3 h-px w-10 rounded-full bg-bosque/30" />
                </div>
                <button
                  onClick={onClose}
                  className="shrink-0 rounded-full p-2 text-ink-soft transition hover:bg-surface-2 hover:text-ink"
                  aria-label="Cerrar inicio de sesión"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
                <label className="block">
                  <span className="text-xs font-medium text-ink-soft">Correo electrónico</span>
                  <input
                    ref={emailRef}
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tucorreo@orivia.test"
                    className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none transition focus:border-bosque-500 focus:ring-4 focus:ring-bosque-500/15"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-ink-soft">Contraseña</span>
                  <span className="relative mt-1.5 block">
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tu contraseña"
                      className="w-full rounded-xl border border-line bg-surface px-4 py-3 pr-12 text-sm text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-bosque-500 focus:ring-4 focus:ring-bosque-500/15 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-2 text-ink-soft hover:text-ink"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </span>
                </label>

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      role="alert"
                      className="rounded-xl bg-cereza/10 px-4 py-2.5 text-xs font-medium text-cereza dark:text-[#f08a8c]"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={status !== "idle"}
                  className={cn(
                    "group flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold text-crema shadow-lg transition",
                    status === "ok" ? "bg-bosque-500" : "bg-bosque hover:bg-bosque-700",
                  )}
                >
                  {status === "idle" && (
                    <>
                      Iniciar sesión
                      <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                    </>
                  )}
                  {status === "loading" && <Loader2 className="size-4 animate-spin" />}
                  {status === "ok" && (
                    <>
                      <Check className="size-4" /> Sesión iniciada
                    </>
                  )}
                </button>

                {onRegister && (
                  <p className="text-center text-xs text-ink-soft">
                    ¿No tienes cuenta?{" "}
                    <button type="button" onClick={onRegister} className="font-semibold text-bosque underline-offset-2 hover:underline dark:text-bosque-300">
                      Crear cuenta
                    </button>
                  </p>
                )}

                <p className="text-center text-[0.7rem] leading-relaxed text-ink-soft">
                  Modo demostración: usuarios sintéticos y validación local. La autenticación real se conecta al
                  backend de ORIVIA.
                </p>
              </form>
            </div>
          </motion.div>
    </motion.div>
  );
}
