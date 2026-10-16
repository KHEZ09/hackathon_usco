import type { Metadata, Viewport } from "next";
import { Allura, Geist_Mono, Montserrat } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const allura = Allura({
  variable: "--font-allura",
  subsets: ["latin"],
  weight: "400",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      className={`${montserrat.variable} ${allura.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
