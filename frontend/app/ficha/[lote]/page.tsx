import type { Metadata } from "next";
import { FichaPublica } from "@/components/ficha/FichaPublica";

export const metadata: Metadata = { title: "Ficha pública | ORIVIA" };

export async function generateStaticParams() {
  return [{ lote: "CAC001" }, { lote: "CAC002" }, { lote: "CAC003" }];
}

type FichaParams = { params: Promise<{ lote: string }> };

export default async function FichaPage({ params }: FichaParams) {
  const { lote } = await params;
  return <FichaPublica loteId={decodeURIComponent(lote).toUpperCase()} />;
}
