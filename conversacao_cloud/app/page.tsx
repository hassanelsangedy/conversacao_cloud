import Link from "next/link";
import { Radio, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-slate-950 text-slate-100 p-6">
      <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/20">
          <Radio className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">Conversação Cloud</h1>
          <p className="text-xs text-slate-400">
            Sistema Serverless Pure-Batch para conversão de sessões clínicas em notas estruturadas SOAP e relatórios com IA.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 py-1.5 px-3 rounded-full">
          <ShieldCheck className="w-4 h-4" />
          <span>Em conformidade LGPD & CEP/UFRN/SigSaúde</span>
        </div>

        <Link
          href="/workspace/captura"
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          Acessar Captura Central
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
