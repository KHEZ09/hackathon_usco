// Cadena interna de evidencia: hash_n = SHA256(evento_n + hash_n-1).

export type EvidenceStep = {
  key: string;
  etapa: string;
  fecha: string;
  kg: number;
  responsable: string;
};

export const GENESIS = "0".repeat(64);

/** JSON canónico: claves ordenadas para que el hash no dependa del orden. */
export function canonical(value: Record<string, string | number>) {
  return JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))));
}

export async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashChain(entityId: string, steps: EvidenceStep[]) {
  const out: string[] = [];
  let prev = GENESIS;
  for (const s of steps) {
    prev = await sha256(
      canonical({ entidad: entityId, etapa: s.etapa, fecha: s.fecha, kg: s.kg, responsable: s.responsable }) + prev,
    );
    out.push(prev);
  }
  return out;
}

/** Número de bloque simulado y estable a partir del ancla. */
export function bloqueSimulado(anchor: string) {
  return 1_840_000 + (parseInt(anchor.slice(0, 4), 16) % 1000);
}
