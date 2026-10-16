"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * La fotografía del hero dibujada en WebGL con una deformación local: solo la mazorca y las
 * manos del agricultor se mueven (la mazorca pende del tallo, gira entre sus manos y la luz
 * recorre su corteza), como si la estuviera manipulando. El resto de la foto queda quieto.
 * Si WebGL no está disponible, el canvas queda transparente y se ve la imagen de fondo.
 */

const IMG = { src: "/media/hero-clean.jpg", w: 1376, h: 768 };
// Puntos en píxeles de la foto original.
const PIVOTE = [967, 200]; // donde el tallo se une a la rama
const ZONA = { c: [978, 330], exterior: [175, 210] }; // mazorca + manos (peso pleno hasta el 55 %)
const MAZORCA = { c: [981, 306], r: [62, 100] };

const VERT = `
attribute vec2 a;
varying vec2 v;
void main() { v = a * 0.5 + 0.5; gl_Position = vec4(a, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
varying vec2 v;
uniform sampler2D img;
uniform vec2 recorte;   // escala de 'cover' por eje
uniform float t;
uniform vec2 tam;       // tamaño de la foto en px
uniform vec2 pivote;
uniform vec2 zc; uniform vec2 ze;
uniform vec2 mc; uniform vec2 mr;

float elipse(vec2 p, vec2 c, vec2 r) { vec2 d = (p - c) / r; return length(d); }

void main() {
  vec2 uv = vec2(0.5) + (vec2(v.x, 1.0 - v.y) - 0.5) * recorte;
  vec2 p = uv * tam;

  // Peso de la deformación: 1 en mazorca y manos, 0 fuera, con transición suave.
  float w = 1.0 - smoothstep(0.55, 1.0, elipse(p, zc, ze));

  // Movimiento de manipulación: vaivén desde el tallo, pequeño alzado y temblor de manos.
  float fase = t * 0.85;
  float ang = radians(3.2 * sin(fase) + 1.1 * sin(t * 2.1 + 0.6));
  vec2 alza = vec2(1.5 * sin(t * 1.3), -3.0 * (0.5 + 0.5 * sin(fase + 1.2)));
  float a = -ang * w;
  vec2 q = p - pivote;
  q = mat2(cos(a), -sin(a), sin(a), cos(a)) * q + pivote;
  q -= alza * w;

  // Giro de la mazorca sobre su eje: se comprime y estira en horizontal.
  float dm = elipse(q, mc, mr);
  float wm = 1.0 - smoothstep(0.75, 1.15, dm);
  float giro = sin(fase * 1.3 + 0.4);
  q.x = mix(q.x, mc.x + (q.x - mc.x) * (1.0 - 0.035 * giro), wm);

  vec3 col = texture2D(img, q / tam).rgb;

  // La luz recorre la corteza a medida que gira.
  float banda = exp(-pow(((q.x - mc.x) / mr.x) - giro * 0.55 + 0.15, 2.0) * 6.0);
  col += col * vec3(0.30, 0.20, 0.14) * banda * wm * (0.55 + 0.45 * sin(fase * 1.3 + 2.0));
  gl_FragColor = vec4(col, 1.0);
}`;

export function HeroManipulacion({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    const gl = canvas?.getContext("webgl", { premultipliedAlpha: false, antialias: false });
    if (!canvas || !gl || gl.isContextLost()) return;
    let vivo = true;
    // El canvas solo se muestra cuando ya dibujó la foto; mientras tanto se ve el fondo.
    const mostrar = (si: boolean) => (canvas.style.opacity = si ? "1" : "0");
    const perdido = () => mostrar(false);
    canvas.addEventListener("webglcontextlost", perdido);

    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (n: string) => gl.getUniformLocation(prog, n);
    gl.uniform2f(u("tam"), IMG.w, IMG.h);
    gl.uniform2f(u("pivote"), PIVOTE[0], PIVOTE[1]);
    gl.uniform2f(u("zc"), ZONA.c[0], ZONA.c[1]);
    gl.uniform2f(u("ze"), ZONA.exterior[0], ZONA.exterior[1]);
    gl.uniform2f(u("mc"), MAZORCA.c[0], MAZORCA.c[1]);
    gl.uniform2f(u("mr"), MAZORCA.r[0], MAZORCA.r[1]);
    const uT = u("t");
    const uRecorte = u("recorte");

    let listo = false;
    let visible = true;
    let raf = 0;
    const inicio = performance.now();

    const ajustar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      // Igual que background-size: cover centrado.
      const ac = canvas.width / canvas.height;
      const ai = IMG.w / IMG.h;
      gl.uniform2f(uRecorte, ac < ai ? ac / ai : 1, ac < ai ? 1 : ai / ac);
    };

    const dibujar = () => {
      if (!listo || gl.isContextLost()) return;
      gl.uniform1f(uT, reduce ? 0 : (performance.now() - inicio) / 1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (canvas.style.opacity !== "1") mostrar(true);
    };

    const bucle = () => {
      dibujar();
      if (visible && !reduce) raf = requestAnimationFrame(bucle);
    };

    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (!vivo || gl.isContextLost()) return;
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      listo = true;
      ajustar();
      cancelAnimationFrame(raf);
      bucle();
    };
    img.src = IMG.src;

    const ro = new ResizeObserver(() => {
      ajustar();
      dibujar();
    });
    ro.observe(canvas);
    // Solo anima mientras el hero está en pantalla.
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) bucle();
    });
    io.observe(canvas);

    return () => {
      // No se pierde el contexto a mano: React puede volver a montar el mismo canvas.
      vivo = false;
      listo = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("webglcontextlost", perdido);
    };
  }, [reduce]);

  return <canvas ref={ref} aria-hidden="true" className={className} style={{ opacity: 0 }} />;
}
