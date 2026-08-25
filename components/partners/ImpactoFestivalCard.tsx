"use client";

import React from "react";
import { Sparkles, Trophy, Users, MapPin, Share2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImpactoFestivalCardProps {
  className?: string;
}

export function ImpactoFestivalCard({ className }: ImpactoFestivalCardProps) {
  const metrics = [
    {
      highlight: "5",
      title: "Festivais Realizados",
      subtitle: "Desde 2019",
    },
    {
      highlight: "Dezenas",
      title: "De Atletas",
      subtitle: "Nas 5 edições",
    },
    {
      highlight: "Centenas",
      title: "De Espectadores",
      subtitle: "Ao longo da história",
    },
    {
      highlight: "4",
      title: "Estados",
      subtitle: "Representados",
    },
    {
      highlight: "Milhares",
      title: "De Pessoas",
      subtitle: "Alcançadas nas redes",
    },
  ];

  return (
    <div
      className={cn(
        "w-full max-w-5xl mx-auto rounded-[32px] p-6 sm:p-10 border border-amber-200/80 shadow-sm relative overflow-hidden text-center font-sans space-y-8",
        "bg-[#FFFDF9]",
        className
      )}
    >
      {/* ========================================================= */}
      {/* 1. TOPO: BADGE, TÍTULO E SUBTÍTULO COM ALTO CONTRASTE     */}
      {/* ========================================================= */}
      <div className="space-y-3 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#4A1E0D] text-[#FDE68A] text-[11px] font-bold uppercase tracking-wider shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-[#FDE68A]" />
          <span>Impacto Comprovado</span>
        </div>

        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 font-serif tracking-tight">
          Alcance: O Festival em números
        </h2>

        <p className="text-xs sm:text-sm font-medium text-slate-600">
          Métricas consolidadas ao longo de cinco edições consecutivas de sucesso.
        </p>
      </div>

      {/* ========================================================= */}
      {/* 2. GRID DE MÉTRICAS EM NÚMEROS (ALTA LEGIBILIDADE)        */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {metrics.map((item, idx) => (
          <div
            key={idx}
            className="p-4 sm:p-5 rounded-2xl bg-white border border-amber-200/70 shadow-2xs flex flex-col items-center justify-center text-center space-y-1.5 hover:border-amber-400/80 transition-all"
          >
            <div className="text-2xl sm:text-3xl font-black text-[#D97706] tracking-tight font-serif">
              {item.highlight}
            </div>

            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-900 leading-tight">
              {item.title}
            </div>

            <div className="text-[11px] text-slate-500 font-medium">
              {item.subtitle}
            </div>
          </div>
        ))}
      </div>

      {/* ========================================================= */}
      {/* 3. ALCANCE NAS REDES SOCIAIS (CARDS DE SEGUIDORES)       */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto pt-2">
        {/* Card Instagram 1: Escalada UFRN */}
        <a
          href="https://instagram.com/escalada_ufrn"
          target="_blank"
          rel="noopener noreferrer"
          className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3 text-left hover:border-amber-300 hover:shadow-xs transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FD1D1D] to-[#833AB4] text-white flex items-center justify-center shrink-0 shadow-2xs">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 group-hover:text-[#963E1B] transition-colors">
                @escalada_ufrn
              </div>
              <div className="text-[10px] font-medium text-slate-500">
                Seguidores no Instagram
              </div>
            </div>
          </div>

          <div className="text-lg font-black text-slate-900 font-mono">
            2.440+
          </div>
        </a>

        {/* Card Instagram 2: AERN Escalada */}
        <a
          href="https://instagram.com/aernescalada"
          target="_blank"
          rel="noopener noreferrer"
          className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3 text-left hover:border-emerald-300 hover:shadow-xs transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#006A55] text-white flex items-center justify-center shrink-0 shadow-2xs">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 group-hover:text-[#006A55] transition-colors">
                @aernescalada
              </div>
              <div className="text-[10px] font-medium text-slate-500">
                Seguidores no Instagram
              </div>
            </div>
          </div>

          <div className="text-lg font-black text-slate-900 font-mono">
            1.198+
          </div>
        </a>
      </div>

      {/* ========================================================= */}
      {/* 4. FRASE DE FECHAMENTO COM CONTRASTE APURADO             */}
      {/* ========================================================= */}
      <div className="pt-4 border-t border-amber-200/60 max-w-2xl mx-auto">
        <p className="text-xs sm:text-sm font-medium italic text-slate-700 leading-relaxed">
          &ldquo;Os números contam uma parte da história. A outra está nas pessoas que voltam, trazem amigos e ajudam o projeto a crescer.&rdquo;
        </p>
      </div>
    </div>
  );
}
