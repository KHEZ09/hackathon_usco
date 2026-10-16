import { useId } from "react";
import { cn } from "@/lib/cn";

type IsotipoProps = {
  className?: string;
  /** "claro" sobre fondos oscuros, "oscuro" sobre crema. */
  tone?: "claro" | "oscuro";
  title?: string;
  /** Aura dorada pulsante detrás del isotipo (activa por defecto). */
  glow?: boolean;
};

const BEANS: Array<[number, number, number]> = [
  [68, 70, -28], [74.5, 80, 24], [67.5, 90, -24], [75, 100, 22], [68, 110, -22], [74.5, 120, 20], [68.5, 130, -18], [73, 139, 14],
];

/** Isotipo ORIVIA: montaña sobre un fruto de cacao abierto que muestra sus granos. */
export function OriviaIsotipo({ className, tone = "claro", title = "ORIVIA", glow = true }: IsotipoProps) {
  const id = useId();
  const crema = tone === "claro" ? "#EFE3CF" : "#E9D8BC";
  const linea = tone === "claro" ? "#EFE3CF" : "#1B3D2E";
  const surco = tone === "claro" ? "#B88A6C" : "#8A5A3C";
  const borde = tone === "claro" ? "none" : "#6B3F2A";

  return (
    <span className={cn("relative inline-grid h-10 shrink-0 place-items-center", className)}>
      {glow && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-[-45%] animate-logo-glow rounded-full"
          style={{
            background:
              tone === "claro"
                ? "radial-gradient(closest-side, rgba(226,184,110,0.55), rgba(201,138,43,0.18) 55%, transparent 75%)"
                : "radial-gradient(closest-side, rgba(201,138,43,0.32), rgba(201,138,43,0.1) 55%, transparent 75%)",
          }}
        />
      )}
      <svg
        viewBox="0 0 120 158"
        className={cn("relative h-full w-auto", glow && "drop-shadow-[0_0_6px_rgba(226,184,110,0.55)]")}
        role="img"
        aria-label={title}
      >
        <defs>
          <linearGradient id={`${id}-grano`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#A8714A" />
            <stop offset="1" stopColor="#5A321D" />
          </linearGradient>
          <clipPath id={`${id}-pod`}>
            <path d="M60 52 C 79 54, 89 80, 87 104 C 85 127, 71 145, 60 154 C 49 145, 35 127, 33 104 C 31 80, 41 54, 60 52 Z" />
          </clipPath>
        </defs>

        {/* Montaña */}
        <path d="M16 60 C 30 40, 44 16, 58 13 C 70 11, 86 32, 104 58" fill="none" stroke={linea} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M41 43 L49 34 L54 39 L61 29 L72 43" fill="none" stroke={linea} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        {/* Pedúnculo */}
        <path d="M60 53 C 59 47, 61 43, 65 40" fill="none" stroke={crema} strokeWidth="4" strokeLinecap="round" />

        {/* Mazorca */}
        <path
          d="M60 52 C 79 54, 89 80, 87 104 C 85 127, 71 145, 60 154 C 49 145, 35 127, 33 104 C 31 80, 41 54, 60 52 Z"
          fill={crema}
          stroke={borde}
          strokeWidth={tone === "claro" ? 0 : 1.6}
        />
        <g clipPath={`url(#${id}-pod)`}>
          {/* Mitad cerrada con surcos */}
          {[
            "M58 54 C 51 68, 48 86, 48 104 C 48 122, 52 138, 58 152",
            "M53 56 C 44 70, 40 86, 40.5 104 C 41 121, 46 136, 54 148",
            "M46 61 C 38 74, 35.5 90, 36 104 C 36.5 118, 40 130, 47 141",
          ].map((d) => (
            <path key={d} d={d} fill="none" stroke={surco} strokeWidth="2.4" strokeLinecap="round" />
          ))}
          {/* Mitad abierta: pulpa y granos */}
          <path d="M61 56 C 76 60, 83 82, 82 104 C 81 125, 71 141, 61 149 Z" fill="#F7EEDF" />
          {BEANS.map(([cx, cy, r], i) => (
            <ellipse key={i} cx={cx} cy={cy} rx="4.6" ry="7" transform={`rotate(${r} ${cx} ${cy})`} fill={`url(#${id}-grano)`} stroke="#F7EEDF" strokeWidth="0.8" />
          ))}
        </g>
        <path d="M60.5 53 L 60.5 153" stroke={tone === "claro" ? "#D9C9B1" : "#6B3F2A"} strokeWidth="1.6" />
      </svg>
    </span>
  );
}

type LogoProps = IsotipoProps & { withTagline?: boolean; wordClassName?: string };

export function OriviaLogo({ className, tone = "claro", glow = true, withTagline = false, wordClassName }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <OriviaIsotipo tone={tone} glow={glow} className="h-9" />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "text-lg font-normal tracking-[0.3em]",
            tone === "claro" ? "text-crema [text-shadow:0_0_14px_rgba(226,184,110,0.45)]" : "text-bosque",
            wordClassName,
          )}
        >
          ORIVIA
        </span>
        {withTagline && (
          <span className={cn("mt-1.5 text-[0.5rem] font-light tracking-[0.34em]", tone === "claro" ? "text-crema/75" : "text-ink-soft")}>
            DEL ORIGEN AL MUNDO
          </span>
        )}
      </span>
    </span>
  );
}

/** Logotipo completo centrado (isotipo + palabra + lema), como en el manual. */
export function OriviaEmblema({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex flex-col items-center text-center", className)}>
      <OriviaIsotipo className="h-28 sm:h-36" />
      <span className="mt-4 text-4xl font-light tracking-[0.32em] text-crema [text-shadow:0_0_24px_rgba(226,184,110,0.55)] sm:text-6xl">
        ORIVIA
      </span>
      <span className="mt-3 text-[0.62rem] font-light tracking-[0.42em] text-crema/85 sm:text-xs">DEL ORIGEN AL MUNDO</span>
    </span>
  );
}
