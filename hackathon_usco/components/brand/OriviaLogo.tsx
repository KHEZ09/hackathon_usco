import { cn } from "@/lib/cn";

type IsotipoProps = {
  className?: string;
  /** "claro" sobre fondos oscuros, "oscuro" sobre crema. */
  tone?: "claro" | "oscuro";
  title?: string;
};

/** Isotipo ORIVIA: montaña sobre grano con hendidura en S. */
export function OriviaIsotipo({ className, tone = "claro", title = "ORIVIA" }: IsotipoProps) {
  const mountain = tone === "claro" ? "#F5EFE6" : "#1B3D2E";
  const bean = tone === "claro" ? "#EFE3CF" : "#1B3D2E";
  const crease = tone === "claro" ? "#1B3D2E" : "#F5EFE6";

  return (
    <svg viewBox="0 0 100 112" className={cn("h-10 w-auto", className)} role="img" aria-label={title}>
      <path
        d="M9 47 C 26 24, 39 9, 50 9 C 61 9, 74 24, 91 47"
        fill="none"
        stroke={mountain}
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      <path
        d="M29 40 L39 30.5 L45 35.5 L53 26.5 L67 40"
        fill="none"
        stroke={mountain}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="78" r="28" fill={bean} />
      <path
        d="M55.5 50.5 C 42 63, 40.5 76, 47 85 C 51 91, 49.5 99, 45.5 105.5 C 60 95, 62 84, 55 75 C 50.5 68.5, 51.5 58, 55.5 50.5 Z"
        fill="#6B3F2A"
      />
      <path
        d="M55.5 50.5 C 42 63, 40.5 76, 47 85 C 51 91, 49.5 99, 45.5 105.5"
        fill="none"
        stroke={crease}
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      <path
        d="M55.5 50.5 C 51.5 58, 50.5 68.5, 55 75 C 62 84, 60 95, 45.5 105.5"
        fill="none"
        stroke={crease}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

type LogoProps = IsotipoProps & { withTagline?: boolean; wordClassName?: string };

export function OriviaLogo({ className, tone = "claro", withTagline = false, wordClassName }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <OriviaIsotipo tone={tone} className="h-8" />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-light tracking-[0.32em] text-lg",
            tone === "claro" ? "text-crema" : "text-bosque dark:text-crema",
            wordClassName,
          )}
        >
          ORIVIA
        </span>
        {withTagline && (
          <span
            className={cn(
              "mt-1 text-[0.5rem] font-light tracking-[0.34em]",
              tone === "claro" ? "text-crema/70" : "text-ink-soft",
            )}
          >
            DEL ORIGEN AL MUNDO
          </span>
        )}
      </span>
    </span>
  );
}
