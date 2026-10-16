"use client";

import { useMemo } from "react";
import { encodeQr } from "@/lib/qr";

/** Código QR en SVG generado localmente (sin servicios externos). */
export function QrCode({ value, className, label }: { value: string; className?: string; label: string }) {
  const { path, size } = useMemo(() => {
    const m = encodeQr(value);
    let d = "";
    m.forEach((row, y) => row.forEach((on, x) => on && (d += `M${x + 4} ${y + 4}h1v1h-1z`)));
    return { path: d, size: m.length + 8 };
  }, [value]);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={className} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#fffcf7" />
      <path d={path} fill="#1b3d2e" />
    </svg>
  );
}
