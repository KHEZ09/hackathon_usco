import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ORIVIA | Del origen al mundo",
  description:
    "Plataforma de trazabilidad agroindustrial, pedidos verificables y analítica asistida por IA para una asociación cacaotera del Huila.",
};

export const viewport: Viewport = {
  themeColor: "#1b3d2e",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="es"
      className="h-full antialiased"
    >
      <script src="/reveal.js" defer />
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
