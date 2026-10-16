import { useSyncExternalStore } from "react";
import { ClipboardList, QrCode, ShieldCheck, type LucideIcon } from "lucide-react";

export type Role = "operador" | "administrador" | "comprador";

/** Orden canónico para mostrar los roles en listas y selects. */
export const ROLE_ORDER: Role[] = ["operador", "administrador", "comprador"];

export type Session = {
  role: Role;
  email: string;
  startedAt: string;
  userId?: string;
  backendRole?: string;
  permissions?: string[];
};

export const ROLES: Record<Role, { label: string; email: string; description: string; tema: string; icon: LucideIcon }> = {
  operador: {
    label: "Operador",
    email: "operador@orivia.test",
    description: "Recepción de lotes, transformaciones e incidencias.",
    tema: "Panel claro · crema",
    icon: ClipboardList,
  },
  administrador: {
    label: "Administrador",
    email: "admin@orivia.test",
    description: "Inventario, costos, alertas, bloqueos y auditoría.",
    tema: "Panel oscuro · carbón",
    icon: ShieldCheck,
  },
  comprador: {
    label: "Comprador",
    email: "comprador@orivia.test",
    description: "Ficha pública del producto, origen y verificación.",
    tema: "Ficha móvil · QR",
    icon: QrCode,
  },
};

export const SESSION_KEY = "orivia.session";

// Sesión de demostración en localStorage, expuesta como store externo para useSyncExternalStore.
const listeners = new Set<() => void>();
let memoryRaw: string | null = null;
let cachedRaw: string | null | undefined;
let cached: Session | null = null;

function readRaw() {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return memoryRaw;
  }
}

export function getSessionSnapshot(): Session | null {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cached = raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      cached = null;
    }
  }
  return cached;
}

export function subscribeSession(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

export function writeSession(session: Session | null) {
  memoryRaw = session ? JSON.stringify(session) : null;
  try {
    if (memoryRaw) localStorage.setItem(SESSION_KEY, memoryRaw);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // almacenamiento no disponible: la sesión vive solo en memoria
  }
  listeners.forEach((l) => l());
}

export function useSession() {
  return useSyncExternalStore(subscribeSession, getSessionSnapshot, () => null);
}

const noop = () => () => {};
/** true solo en el cliente después de hidratar (evita parpadeos de contenido dependiente de localStorage). */
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}

/** Ruta de inicio de cada rol después de iniciar sesión. */
export const ROLE_HOME: Record<Role, string> = {
  operador: "/operador",
  administrador: "/admin",
  comprador: "/",
};

/**
 * Mapea los roles devueltos por el backend (strings en mayúscula) al rol canónico
 * del frontend. Centraliza la lógica para no duplicarla en LoginModal y LandingPage.
 */
export function resolveRole(backendRoles: string[]): Role {
  const upper = backendRoles.map((r) => r.toUpperCase());
  if (upper.includes("ADMIN") || upper.includes("ACCOUNTING")) return "administrador";
  if (upper.includes("OPERATOR")) return "operador";
  return "comprador";
}
