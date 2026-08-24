"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Activity } from "lucide-react";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6 text-slate-700 font-sans">
      <div className="bg-white/80 backdrop-blur-md border border-slate-200 p-8 rounded-3xl shadow-sm text-center flex flex-col items-center gap-3">
        <Activity className="w-8 h-8 text-[#006A55] animate-spin" />
        <h2 className="text-sm font-bold text-slate-900">Conversação Cloud</h2>
        <p className="text-xs text-slate-500">Redirecionando para o ambiente seguro...</p>
        <a
          href="/login"
          className="mt-2 text-xs font-semibold text-[#006A55] hover:underline"
        >
          Clique aqui se não for redirecionado automaticamente
        </a>
      </div>
    </div>
  );
}
