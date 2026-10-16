"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Eye, EyeOff, Loader2, X } from "lucide-react";
import { OriviaIsotipo } from "@/components/brand/OriviaLogo";
import { ROLES, type Role, type Session } from "./roles";
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

const ROLE_ORDER: Role[] = ["operador", "administrador", "comprador"];

export function LoginModal({ open, initialRole = "operador", initialEmail, onRegister, onClose, onSuccess }: Props) {
  return (
    <AnimatePresence>
      {open && <LoginDialog key={initialEmail ?? "login"} initialRole={initialRole} initialEmail={initialEmail} onRegister={onRegister} onClose={onClose} onSuccess={onSuccess} />}
    </AnimatePresence>
  );
}

/** Se monta en cada apertura, así el formulario siempre arranca limpio. */
function LoginDialog({ initialRole = "operador", initialEmail, onRegister, onClose, onSuccess }: Omit<Props, "open">) {
  const [role, setRole] = useState<Role>(initialRole);
  const [email, setEmail] = useState(initialEmail ?? ROLES[initialRole].email);
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

  const pickRole = (r: Role) => {
    setRole(r);
    setEmail(ROLES[r].email);
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (process.env.NEXT_PUBLIC_ORIVIA_DEMO_MODE !== "true") {
      if (!normalized || !password) return setError("Completa el correo y la contraseña.");
      if (password.length < 6) return setError("La contraseña debe tener al menos 6 caracteres.");
      setError(null);
      setStatus("loading");
      try {
        const response = await loginApi(normalized, password);
        const backendRoles = (response.user.roles ?? []).map((value) => value.toUpperCase());
        const backendRole = backendRoles[0] ?? "";
        const expected = role === "administrador" ? ["ADMIN", "ACCOUNTING"] : role === "operador" ? ["OPERATOR"] : ["BUYER", "VIEWER"];
        if (!expected.some((candidate) => backendRoles.includes(candidate))) {
          clearAuthTokens();
          throw new OriviaApiError(`La cuenta no tiene el rol ${ROLES[role].label}.`, 403, "ROLE_MISMATCH");
        }
        setStatus("ok");
        setTimeout(() => onSuccess({
          role,
          email: response.user.email,
          startedAt: new Date().toISOString(),
          userId: response.user.user_id,
          backendRole,
        }), 450);
      } catch (cause) {
        clearAuthTokens();
        setStatus("idle");
        if (cause instanceof OriviaApiError && cause.status === 429) {
          setError(`Demasiados intentos. Espera ${cause.retryAfterSeconds ?? 900} segundos.`);
        } else if (cause instanceof OriviaApiError && cause.status === 401) {
          setError("Credenciales inválidas. Verifica el usuario persistido.");
        } else {
          setError(cause instanceof Error ? cause.message : "No se pudo iniciar sesión.");
        }
      }
      return;
    }
    if (!normalized || !password) return setError("Completa el correo y la contraseña.");
    const match = ROLE_ORDER.find((r) => ROLES[r].email === normalized);
    if (!match) return setError("Ese correo no pertenece a un usuario de demostración.");
    if (match !== role) return setError(`Ese correo corresponde al rol ${ROLES[match].label}. Selecciónalo arriba.`);
    if (password.length < 6) return setError("La contraseña debe tener al menos 6 caracteres.");

    setError(null);
    setStatus("loading");
    setTimeout(() => {
      setStatus("ok");
      setTimeout(() => onSuccess({ role, email: normalized, startedAt: new Date().toISOString() }), 900);
    }, 850);
  };

  const active = ROLES[role];

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
            <div className="relative hidden overflow-hidden md:block">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: "url(/media/cosecha-mano.jpg)" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bosque-950 via-bosque-950/55 to-bosque-950/10" />
              <div className="relative flex h-full flex-col justify-between p-8 text-crema">
                <OriviaIsotipo className="h-14" />
                <div>
                  <p className="font-script text-5xl leading-tight">Cada grano tiene una historia</p>
                  <p className="mt-4 text-[0.65rem] font-light tracking-[0.4em]">DEL ORIGEN AL MUNDO</p>
                </div>
              </div>
            </div>

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

              <fieldset className="mt-6">
                <legend className="mb-3 text-xs font-medium text-ink-soft">Elige tu rol</legend>
                <div className="grid grid-cols-3 gap-2">
                  {ROLE_ORDER.map((r) => {
                    const info = ROLES[r];
                    const selected = r === role;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => pickRole(r)}
                        aria-pressed={selected}
                        className={cn(
                          "relative flex flex-col items-center gap-2 rounded-2xl border px-2 py-3.5 text-center transition",
                          selected
                            ? "border-bosque bg-bosque text-crema shadow-lg shadow-bosque/25"
                            : "border-line bg-surface text-ink hover:border-bosque-300",
                        )}
                      >
                        <info.icon className="size-5" />
                        <span className="text-xs font-semibold">{info.label}</span>
                      </button>
                    );
                  })}
                </div>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={role}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mt-3 text-xs leading-relaxed text-ink-soft"
                  >
                    {active.description} <span className="text-ink">{active.tema}</span>
                  </motion.p>
                </AnimatePresence>
              </fieldset>

              <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
                <label className="block">
                  <span className="text-xs font-medium text-ink-soft">Correo</span>
                  <input
                    ref={emailRef}
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                      placeholder="Mínimo 6 caracteres"
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
                      Entrar como {active.label}
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
