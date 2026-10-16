/**
 * Definiciones SVG compartidas por las ilustraciones del proceso (se montan una sola vez):
 * texturas procedurales con luz (piel rugosa de la mazorca, vetas de madera, trama de fique),
 * degradados y los símbolos de grano fresco y grano seco que se reutilizan con <use>.
 */
export function ProcesoDefs() {
  return (
    <svg width="0" height="0" className="pointer-events-none absolute" aria-hidden="true" focusable="false">
      <defs>
        {/* Piel rugosa de la mazorca: relieve con luz difusa y brillo especular */}
        <filter id="orv-rugosa" x="-6%" y="-4%" width="112%" height="108%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.05 0.028" numOctaves="3" seed="11" result="ruido" />
          <feDiffuseLighting in="ruido" surfaceScale="3.4" lightingColor="#ffffff" result="luz">
            <feDistantLight azimuth="235" elevation="50" />
          </feDiffuseLighting>
          <feComposite in="luz" in2="SourceGraphic" operator="arithmetic" k1="1.32" k2="0" k3="0" k4="0" result="relieve" />
          <feSpecularLighting in="ruido" surfaceScale="3" specularConstant="0.7" specularExponent="24" lightingColor="#fff1d6" result="brillo">
            <feDistantLight azimuth="225" elevation="58" />
          </feSpecularLighting>
          <feComposite in="brillo" in2="SourceAlpha" operator="in" result="brilloPiel" />
          <feComposite in="relieve" in2="brilloPiel" operator="arithmetic" k1="0" k2="1" k3="0.32" k4="0" result="piel" />
          <feComposite in="piel" in2="SourceAlpha" operator="in" />
        </filter>

        {/* Vetas de madera */}
        <filter id="orv-madera" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.004 0.14" numOctaves="3" seed="4" result="vetas" />
          <feColorMatrix in="vetas" type="matrix" values="0.75 0 0 0 0.42  0.75 0 0 0 0.42  0.75 0 0 0 0.42  0 0 0 0 1" result="gris" />
          <feBlend in="SourceGraphic" in2="gris" mode="multiply" result="tinte" />
          <feComposite in="tinte" in2="SourceAlpha" operator="in" />
        </filter>

        {/* Trama de fique con relieve */}
        <pattern id="orv-tejido" width="7" height="7" patternUnits="userSpaceOnUse">
          <rect width="7" height="7" fill="#c5a272" />
          <rect x="0" y="0.6" width="7" height="2.4" rx="1.2" fill="#d8b98a" />
          <rect x="0.6" y="3.6" width="2.4" height="3.4" rx="1.2" fill="#ab8655" />
          <rect x="4" y="3.6" width="2.4" height="3.4" rx="1.2" fill="#b8925f" />
        </pattern>
        <filter id="orv-fique" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="9" result="fibras" />
          <feDiffuseLighting in="fibras" surfaceScale="1.6" lightingColor="#ffffff" result="luz">
            <feDistantLight azimuth="230" elevation="55" />
          </feDiffuseLighting>
          <feComposite in="luz" in2="SourceGraphic" operator="arithmetic" k1="1.18" k2="0" k3="0" k4="0" result="tela" />
          <feComposite in="tela" in2="SourceAlpha" operator="in" />
        </filter>

        {/* Desenfoque suave (vapor, sombras) */}
        <filter id="orv-difuso" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id="orv-sombra" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="14" />
        </filter>

        {/* Degradados */}
        <linearGradient id="orv-mazorca" x1="0.15" y1="0.05" x2="0.85" y2="1">
          <stop offset="0" stopColor="#c4282f" />
          <stop offset="0.38" stopColor="#d9452c" />
          <stop offset="0.7" stopColor="#e57b2d" />
          <stop offset="1" stopColor="#efab3c" />
        </linearGradient>
        <linearGradient id="orv-mazorca-sombra" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3a0708" stopOpacity="0.55" />
          <stop offset="0.35" stopColor="#3a0708" stopOpacity="0" />
          <stop offset="0.7" stopColor="#fff3d0" stopOpacity="0.1" />
          <stop offset="1" stopColor="#3a0708" stopOpacity="0.45" />
        </linearGradient>
        <radialGradient id="orv-pulpa" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#fbf3e2" />
          <stop offset="0.75" stopColor="#ecdcbc" />
          <stop offset="1" stopColor="#d4b98c" />
        </radialGradient>
        <linearGradient id="orv-corteza" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8d7a5c" />
          <stop offset="0.45" stopColor="#5e4a33" />
          <stop offset="1" stopColor="#2e2316" />
        </linearGradient>
        <linearGradient id="orv-hoja" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5f9a4b" />
          <stop offset="0.5" stopColor="#2f6b34" />
          <stop offset="1" stopColor="#173d1f" />
        </linearGradient>
        <linearGradient id="orv-madera-clara" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c8955e" />
          <stop offset="1" stopColor="#9a6a3c" />
        </linearGradient>
        <linearGradient id="orv-madera-oscura" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9a6a3e" />
          <stop offset="1" stopColor="#6a4424" />
        </linearGradient>
        <linearGradient id="orv-madera-interior" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a5230" />
          <stop offset="1" stopColor="#3e2814" />
        </linearGradient>
        <radialGradient id="orv-grano-fresco" cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#fffdf7" />
          <stop offset="0.55" stopColor="#f1e6d1" />
          <stop offset="1" stopColor="#c7b08c" />
        </radialGradient>
        <radialGradient id="orv-grano-seco" cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#c98a5a" />
          <stop offset="0.55" stopColor="#80492a" />
          <stop offset="1" stopColor="#3f1f0f" />
        </radialGradient>
        <linearGradient id="orv-saco" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5c4223" stopOpacity="0.55" />
          <stop offset="0.3" stopColor="#5c4223" stopOpacity="0" />
          <stop offset="0.75" stopColor="#fff2d6" stopOpacity="0.08" />
          <stop offset="1" stopColor="#3d2a14" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="orv-anillo" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f6e3b0" stopOpacity="0" />
          <stop offset="0.35" stopColor="#f6e3b0" stopOpacity="0.95" />
          <stop offset="0.7" stopColor="#c98a2b" stopOpacity="0.6" />
          <stop offset="1" stopColor="#c98a2b" stopOpacity="0" />
        </linearGradient>

        {/* Granos reutilizables (centrados en el origen, 20 × 34) */}
        <g id="orv-g-fresco">
          <ellipse cx="0" cy="0" rx="10" ry="17" fill="url(#orv-grano-fresco)" />
          <ellipse cx="-3.5" cy="-6" rx="2.6" ry="5.5" fill="#ffffff" opacity="0.7" />
          <path d="M-7 8 C -3 13, 3 13, 7 8" fill="none" stroke="#b9a07a" strokeOpacity="0.5" strokeWidth="1" />
        </g>
        <g id="orv-g-seco">
          <ellipse cx="0" cy="0" rx="10" ry="17" fill="url(#orv-grano-seco)" />
          <path d="M0 -15 C -3 -5, 3 5, 0 15" fill="none" stroke="#2a1208" strokeOpacity="0.55" strokeWidth="1.2" />
          <ellipse cx="-3.5" cy="-6" rx="2.2" ry="5" fill="#ffffff" opacity="0.2" />
        </g>
      </defs>
    </svg>
  );
}
