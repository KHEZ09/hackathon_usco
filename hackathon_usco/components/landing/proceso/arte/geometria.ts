// Utilidades geométricas para las ilustraciones del proceso.

/** Generador pseudoaleatorio determinístico (mulberry32): mismas posiciones en servidor y cliente. */
export function azar(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Curva suave (Catmull-Rom → Bézier) que pasa por todos los puntos. */
export function curva(pts: Array<[number, number]>, cerrar = false) {
  if (pts.length < 2) return "";
  const p = cerrar ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < p.length - 2; i++) {
    const [x0, y0] = p[i - 1];
    const [x1, y1] = p[i];
    const [x2, y2] = p[i + 1];
    const [x3, y3] = p[i + 2];
    d += ` C${(x1 + (x2 - x0) / 6).toFixed(1)} ${(y1 + (y2 - y0) / 6).toFixed(1)}, ${(x2 - (x3 - x1) / 6).toFixed(1)} ${(y2 - (y3 - y1) / 6).toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }
  return cerrar ? `${d} Z` : d;
}

/** Interpolación bilineal dentro de un cuadrilátero (u, v en 0→1). */
export function bilineal(q: { tl: [number, number]; tr: [number, number]; br: [number, number]; bl: [number, number] }, u: number, v: number): [number, number] {
  const top: [number, number] = [q.tl[0] + (q.tr[0] - q.tl[0]) * u, q.tl[1] + (q.tr[1] - q.tl[1]) * u];
  const bot: [number, number] = [q.bl[0] + (q.br[0] - q.bl[0]) * u, q.bl[1] + (q.br[1] - q.bl[1]) * u];
  return [top[0] + (bot[0] - top[0]) * v, top[1] + (bot[1] - top[1]) * v];
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const seg = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));
export const suave = (t: number) => t * t * (3 - 2 * t);
