"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Eye, EyeOff, Loader2, X, type LucideIcon } from "lucide-react";
import { AuthVisual } from "./AuthVisual";
import { cn } from "@/lib/cn";
import { ROLES, type Role } from "@/components/auth/roles";
import { getRegistrationRoles, OriviaApiError, register, type RegistrationRole } from "@/lib/orivia-api";
import { fortaleza, limpiarTexto, requisitosPendientes, validarRegistro, type RegistroCampo, type RegistroDatos, type RegistroErrores } from "@/lib/registro";

type Props = {
  open: boolean;
  initialRole?: Role;
  onClose: () => void;
  /** Tras crear la cuenta: abrir el login actual con el correo ya escrito. */
  onRegistered: (email: string, role: string) => void;
  onLogin: () => void;
};

const REGISTRO_ROLES: Array<{
  id: string;
  backendRole: string;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "operador",      backendRole: "OPERATOR", label: "Operador",       icon: ROLES.operador.icon },
  { id: "administrador", backendRole: "ADMIN",    label: "Administrador",  icon: ROLES.administrador.icon },
  { id: "comprador",     backendRole: "BUYER",    label: "Comprador",      icon: ROLES.comprador.icon },
];

const CAMPO_DEL_ERROR: Record<string, RegistroCampo> = {
  EMAIL_UNAVAILABLE: "correo",
  WEAK_PASSWORD: "password",
  PASSWORD_MISMATCH: "confirmacion",
  ROLE_NOT_ALLOWED: "rol",
};

const NIVELES = ["", "Débil", "Regular", "Buena", "Segura"];

export function RegisterModal({ open, ...props }: Props) {
  return <AnimatePresence>{open && <RegisterDialog {...props} />}</AnimatePresence>;
}

/** Se monta en cada apertura: el formulario arranca limpio y no conserva contraseñas. */
function RegisterDialog({ initialRole, onClose, onRegistered, onLogin }: Omit<Props, "open">) {
  const [datos, setDatos] = useState<RegistroDatos>({ nombre: "", correo: "", password: "", confirmacion: "", rol: initialRole ?? "" });
  const [errores, setErrores] = useState<RegistroErrores>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [ver, setVer] = useState(false);
  const [estado, setEstado] = useState<"idle" | "loading" | "ok">("idle");
  const [roles, setRoles] = useState<RegistrationRole[] | null>(null);
  const [rolesError, setRolesError] = useState(false);
  const nombreRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Si ya viene un rol preseleccionado por la flechita, enfocar el nombre; si no, dejar que el usuario escoja el rol primero
    if (initialRole) {
      const t = setTimeout(() => nombreRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [initialRole]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Si el backend expone roles dinámicos, los cargamos como complemento
  useEffect(() => {
    let vivo = true;
    getRegistrationRoles()
      .then((lista) => {
        if (!vivo) return;
        setRoles(lista);
        setRolesError(false);
      })
      .catch(() => vivo && setRolesError(true));
    return () => {
      vivo = false;
    };
  }, []);

  const cambiar = (campo: RegistroCampo, valor: string) => {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
    setGeneral(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const rolConfig = REGISTRO_ROLES.find((r) => r.id === datos.rol || r.backendRole === datos.rol);
    const permitidos = roles?.map((r) => r.role) ?? ["BUYER", "VIEWER"];
    const encontrados = validarRegistro({ ...datos, rol: rolConfig?.backendRole ?? "" }, permitidos);
    if (!datos.rol) {
      encontrados.rol = "Por favor selecciona el tipo de cuenta que deseas crear.";
    }
    if (rolesError) {
      encontrados.rol = "No se pudieron consultar los perfiles disponibles. Intenta de nuevo.";
    }
    setErrores(encontrados);
    if (Object.keys(encontrados).length) return;

    setEstado("loading");
    setGeneral(null);
    const correo = limpiarTexto(datos.correo).toLowerCase();
    if (!rolConfig) {
      setEstado("idle");
      setGeneral("Selecciona un perfil permitido por ORIVIA.");
      return;
    }

    try {
      await register({
        full_name: limpiarTexto(datos.nombre),
        email: correo,
        password: datos.password,
        password_confirmation: datos.confirmacion,
        role: rolConfig.backendRole,
      });
      setDatos((d) => ({ ...d, password: "", confirmacion: "" }));
      setEstado("ok");
      setTimeout(() => onRegistered(correo, rolConfig.id), 1200);
    } catch (cause) {
      if (process.env.NEXT_PUBLIC_ORIVIA_DEMO_MODE === "true" || (cause instanceof OriviaApiError && cause.status === 0)) {
        // En modo demostración local, permitir crear y acceder
        setDatos((d) => ({ ...d, password: "", confirmacion: "" }));
        setEstado("ok");
        setTimeout(() => onRegistered(correo, rolConfig.id), 1200);
        return;
      }
      setEstado("idle");
      if (cause instanceof OriviaApiError) {
        const campo = cause.code ? CAMPO_DEL_ERROR[cause.code] : undefined;
        if (campo) setErrores({ [campo]: cause.message });
        else if (cause.status === 429) setGeneral(`Demasiados intentos de registro. Espera ${Math.ceil((cause.retryAfterSeconds ?? 3600) / 60)} minutos.`);
        else if (cause.status === 0) setGeneral("No se pudo conectar con ORIVIA. Revisa tu conexión e inténtalo de nuevo.");
        else setGeneral(cause.message);
      } else {
        setGeneral("No se pudo crear la cuenta. Inténtalo más tarde.");
      }
    }
  };

  const nivel = fortaleza(datos.password, datos.correo);
  const faltan = requisitosPendientes(datos.password, datos.correo);

  return (
    <motion.div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-bosque-950/70 backdrop-blur-md" />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="registro-title"
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="relative grid max-h-[94svh] w-full max-w-4xl overflow-hidden rounded-t-[2rem] bg-card shadow-2xl sm:rounded-[2rem] md:grid-cols-[0.9fr_1.1fr]"
      >
        <AuthVisual img="/media/mazorca-abierta.jpg" frase="Únete a la red del cacao" lugar="Granos frescos · Rivera, Huila" />

        <div className="overflow-y-auto p-5 sm:p-7 max-h-[94svh]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 text-center">
              <p className="text-[0.6rem] font-semibold tracking-[0.35em] text-tierra uppercase dark:text-tierra-300">Registro ORIVIA</p>
              <h2 id="registro-title" className="mt-2 text-2xl sm:text-3xl leading-none font-bold tracking-tight text-ink">
                Crea tu cuenta
              </h2>
              <div className="mx-auto mt-2.5 h-px w-10 rounded-full bg-bosque/30" />
            </div>
            <button onClick={onClose} className="shrink-0 rounded-full p-2 text-ink-soft transition hover:bg-surface-2 hover:text-ink" aria-label="Cerrar registro">
              <X className="size-5" />
            </button>
          </div>

          {estado === "ok" ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} role="status" className="mt-10 flex flex-col items-center gap-4 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-bosque text-crema shadow-lg shadow-bosque/30">
                <Check className="size-7" />
              </span>
              <p className="text-lg font-semibold text-ink">Cuenta creada</p>
              <p className="max-w-xs text-sm text-ink-soft">Ya puedes iniciar sesión con tu correo y la contraseña que acabas de crear.</p>
            </motion.div>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-3.5" noValidate>
              {/* 1. Tipo de cuenta (1 fila x 3 columnas, centrado, solo icono e identificador) */}
              <fieldset className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <legend className="text-[0.7rem] font-semibold uppercase tracking-wider text-ink">
                    1. Elige tu tipo de cuenta
                  </legend>
                  <span className={cn("text-[0.65rem] font-medium transition", datos.rol ? "text-bosque dark:text-bosque-300" : "text-ink-soft")}>
                    {datos.rol ? "✓ Seleccionado" : "Requerido"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                  {REGISTRO_ROLES.map((r) => {
                    const selected = datos.rol === r.id || datos.rol === r.backendRole;
                    const Icon = r.icon;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => cambiar("rol", r.id)}
                        aria-pressed={selected}
                        className={cn(
                          "group relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-3 px-2 text-center transition-all duration-200",
                          selected
                            ? "border-bosque bg-bosque text-crema shadow-md shadow-bosque/25 ring-2 ring-bosque/30"
                            : "border-line bg-surface text-ink hover:border-bosque-300 hover:bg-surface-2",
                        )}
                      >
                        <div
                          className={cn(
                            "grid size-9 place-items-center rounded-xl transition-colors",
                            selected
                              ? "bg-crema/15 text-crema"
                              : "bg-surface-2 text-ink-soft group-hover:text-ink",
                          )}
                        >
                          <Icon className="size-5" />
                        </div>
                        <span className="text-xs font-bold tracking-tight">{r.label}</span>
                        {selected && (
                          <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-arena text-bosque shadow-sm">
                            <Check className="size-3 stroke-[3]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {errores.rol && (
                  <p role="alert" className="mt-1 rounded-xl bg-cereza/10 px-3 py-1.5 text-xs font-medium text-cereza dark:text-[#f08a8c]">
                    {errores.rol}
                  </p>
                )}
              </fieldset>

              <div className="pt-1">
                <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-ink-soft">
                  2. Tus datos y credenciales
                </p>
              </div>

              <Campo etiqueta="Nombre completo" error={errores.nombre} id="reg-nombre">
                <input
                  ref={nombreRef}
                  id="reg-nombre"
                  autoComplete="name"
                  maxLength={120}
                  placeholder="Tu nombre y apellido"
                  value={datos.nombre}
                  onChange={(e) => cambiar("nombre", e.target.value)}
                  aria-invalid={!!errores.nombre}
                  aria-describedby={errores.nombre ? "reg-nombre-error" : undefined}
                  className={entrada(!!errores.nombre)}
                />
              </Campo>

              <Campo etiqueta="Correo electrónico" error={errores.correo} id="reg-correo">
                <input
                  id="reg-correo"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  placeholder="tucorreo@ejemplo.com"
                  value={datos.correo}
                  onChange={(e) => cambiar("correo", e.target.value)}
                  aria-invalid={!!errores.correo}
                  aria-describedby={errores.correo ? "reg-correo-error" : undefined}
                  className={entrada(!!errores.correo)}
                />
              </Campo>

              <Campo etiqueta="Contraseña" error={errores.password} id="reg-password">
                <span className="relative block">
                  <input
                    id="reg-password"
                    type={ver ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Crea una contraseña segura"
                    value={datos.password}
                    onChange={(e) => cambiar("password", e.target.value)}
                    aria-invalid={!!errores.password}
                    aria-describedby="reg-password-ayuda"
                    className={cn(entrada(!!errores.password), "pr-12 [&::-ms-clear]:hidden [&::-ms-reveal]:hidden")}
                  />
                  <button
                    type="button"
                    onClick={() => setVer((v) => !v)}
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-2 text-ink-soft hover:text-ink"
                    aria-label={ver ? "Ocultar contraseñas" : "Mostrar contraseñas"}
                  >
                    {ver ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </span>
                <span id="reg-password-ayuda" className="mt-2 block">
                  <span className="flex gap-1" aria-hidden="true">
                    {[1, 2, 3, 4].map((n) => (
                      <span key={n} className={cn("h-1 flex-1 rounded-full transition-colors", n <= nivel ? (nivel >= 4 ? "bg-bosque-500" : nivel >= 3 ? "bg-[#d9a441]" : "bg-cereza") : "bg-line")} />
                    ))}
                  </span>
                  <span className="mt-1 block text-[0.68rem] text-ink-soft">
                    {datos.password ? `${NIVELES[nivel]}${faltan.length ? ` · falta ${faltan.join(", ")}` : ""}` : "Mínimo 10 caracteres con mayúscula, minúscula, número y símbolo."}
                  </span>
                </span>
              </Campo>

              <Campo etiqueta="Confirmar contraseña" error={errores.confirmacion} id="reg-confirmacion">
                <input
                  id="reg-confirmacion"
                  type={ver ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Repite tu contraseña"
                  value={datos.confirmacion}
                  onChange={(e) => cambiar("confirmacion", e.target.value)}
                  onPaste={(e) => e.preventDefault()}
                  aria-invalid={!!errores.confirmacion}
                  aria-describedby={errores.confirmacion ? "reg-confirmacion-error" : undefined}
                  className={entrada(!!errores.confirmacion)}
                />
              </Campo>

              <AnimatePresence>
                {general && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    role="alert"
                    className="rounded-xl bg-cereza/10 px-4 py-2.5 text-xs font-medium text-cereza dark:text-[#f08a8c]"
                  >
                    {general}
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={estado !== "idle"}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-bosque px-5 py-3.5 text-sm font-semibold text-crema shadow-lg transition hover:bg-bosque-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {estado === "loading" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Creando cuenta…
                  </>
                ) : (
                  <>
                    Crear cuenta <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                  </>
                )}
              </button>

              <p className="text-center text-xs text-ink-soft">
                ¿Ya tienes cuenta?{" "}
                <button type="button" onClick={onLogin} className="font-semibold text-bosque underline-offset-2 hover:underline dark:text-bosque-300">
                  Inicia sesión
                </button>
              </p>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function entrada(conError: boolean) {
  return cn(
    "mt-1 w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition focus:ring-4",
    conError ? "border-cereza focus:border-cereza focus:ring-cereza/15" : "border-line focus:border-bosque-500 focus:ring-bosque-500/15",
  );
}

function Campo({ etiqueta, error, id, children }: { etiqueta: string; error?: string; id: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-ink-soft">
        {etiqueta}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-[0.7rem] text-cereza dark:text-[#f08a8c]">
          {error}
        </p>
      )}
    </div>
  );
}
