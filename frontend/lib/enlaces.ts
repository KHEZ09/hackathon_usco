// Direcciones públicas de ORIVIA para enlaces y códigos QR.
// Un QR se escanea con otro dispositivo: nunca debe codificar localhost.

const SITIO_POR_DEFECTO = "https://orivia.tobaru.xyz";

const esLocal = (origen: string) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(origen);

/** Origen público del sitio: variable de entorno, el origen actual si es público, o el sitio oficial. */
export function sitioPublico() {
  const configurado = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (configurado) return configurado;
  if (typeof window !== "undefined" && !esLocal(window.location.origin)) return window.location.origin;
  return SITIO_POR_DEFECTO;
}

/**
 * Ficha pública de un lote. Usa `/ficha/?lote=ID` porque el sitio se publica como archivos
 * estáticos: esa página existe para cualquier lote, incluso los creados después del despliegue.
 */
export function urlFicha(loteId: string) {
  return `${sitioPublico()}/ficha/?lote=${encodeURIComponent(loteId.trim().toUpperCase())}`;
}

/** Ruta interna (sin dominio) de la ficha, para enlaces dentro de la página. */
export function rutaFicha(loteId: string) {
  return `/ficha/?lote=${encodeURIComponent(loteId.trim().toUpperCase())}`;
}
