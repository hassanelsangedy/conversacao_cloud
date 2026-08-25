"use client";

import React from "react";
import { WorkspaceHeader } from "@/components/workspace-header";
import { EscaladaCard } from "@/components/partners/EscaladaCard";
import { ShieldCheck, Award, ExternalLink } from "lucide-react";

export default function ParceirosPage() {
  return (
    <div
      style={{ backgroundColor: "#F8F9FA" }}
      className="min-h-screen flex flex-col font-sans text-slate-800 antialiased selection:bg-[#006A55] selection:text-white"
    >
      <WorkspaceHeader
        currentTitle="Projetos & Parcerias Institucionais"
        badgeText="Extensão & Pesquisa UFRN"
      />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Banner de Contexto */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                style={{ backgroundColor: "rgba(0, 106, 85, 0.1)", color: "#006A55" }}
                className="w-9 h-9 rounded-2xl flex items-center justify-center font-bold shadow-xs"
              >
                <Award className="w-5 h-5" />
              </span>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Extensão Universitária & Parcerias Estratégicas
              </h1>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl">
              Projetos de extensão comunitária, parcerias técnico-científicas e iniciativas de esporte e saúde vinculadas à UFRN.
            </p>
          </div>
        </div>

        {/* Card do Projeto de Escalada na UFRN */}
        <section className="space-y-4">
          <EscaladaCard />
        </section>
      </main>
    </div>
  );
}
