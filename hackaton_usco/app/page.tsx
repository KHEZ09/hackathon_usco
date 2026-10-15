import Link from "next/link";
import { Sparkles, Layers, ShieldCheck, Cpu } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black text-zinc-900 dark:text-zinc-100 min-h-screen px-6 py-16">
      <main className="w-full max-w-4xl flex flex-col items-center text-center gap-10">
        
        {/* Badge de Proyecto */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Plataforma de Cacao Huila</span>
        </div>

        {/* Título y descripción */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            ORIVIA
          </h1>
          <p className="max-w-2xl text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 font-normal leading-relaxed mx-auto">
            Trazabilidad agroindustrial, pedidos verificables y analítica asistida por IA para una asociación cacaotera del Huila.
          </p>
        </div>

        {/* Pilares clave */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left mt-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-2">
            <Layers className="w-6 h-6 text-amber-500" />
            <h3 className="font-semibold text-base">Trazabilidad Total</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Control de lotes, fermentación, secado y balance de masa.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
            <h3 className="font-semibold text-base">Verificación Inmutable</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Sellado criptográfico en blockchain para pedidos y auditoría.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-2">
            <Cpu className="w-6 h-6 text-blue-500" />
            <h3 className="font-semibold text-base">Analítica con IA</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Asistente de datos y resúmenes ejecutivos impulsados por Ollama.
            </p>
          </div>
        </div>

        {/* Acciones de Navegación Inicial */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
          <Link
            href="/trazabilidad"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-200 text-sm shadow-md"
          >
            Explorar Trazabilidad
          </Link>
          <Link
            href="/pedidos"
            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-sm"
          >
            Gestión de Pedidos
          </Link>
        </div>

      </main>
    </div>
  );
}
