"use client";

import React from "react";
import Image from "next/image";
import { GraduationCap, Quote, Film, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface EixoAcademicoCardProps {
  className?: string;
}

export function EixoAcademicoCard({ className }: EixoAcademicoCardProps) {
  return (
    <div
      className={cn(
        "w-full max-w-5xl mx-auto rounded-[32px] p-6 sm:p-10 border border-amber-200/70 shadow-sm relative overflow-hidden text-left font-sans",
        "bg-[#FFFDF9]",
        className
      )}
    >
      {/* Topo / Categoria */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-amber-100/70 border border-amber-300/60 flex items-center justify-center text-amber-900 shadow-2xs">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
            Eixo Acadêmico
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-serif tracking-tight">
            Universidade, Ensino & Extensão
          </h2>
        </div>
      </div>

      {/* Grid Principal: Texto e Citação à Esquerda, Slide à Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Coluna Esquerda: Texto Geral e Box de Depoimento (7 Colunas) */}
        <div className="lg:col-span-7 space-y-6">
          <p className="text-sm text-slate-700 leading-relaxed font-normal">
            Como projeto de extensão, o muro aproxima a UFRN da sociedade e contribui para a difusão da cultura da escalada e da educação ambiental. Iniciativas como o <strong className="text-slate-900 font-bold">Cine Aventura</strong>, com exibição de filmes relacionados à escalada, aventura e meio ambiente, além da orientação de interessados da comunidade em geral, ampliam o alcance do projeto para além dos praticantes habituais.
          </p>

          {/* Box de Citação / Depoimento */}
          <div className="bg-[#FFF8E7]/90 border border-amber-200 rounded-3xl p-5 sm:p-6 space-y-4 relative shadow-xs">
            <p className="text-xs sm:text-[13px] text-slate-700 italic leading-relaxed font-serif">
              &ldquo;No âmbito do ensino, a parede de escalada funciona como um rico campo de estágio e vivência prática para os alunos de licenciatura e bacharelado, permitindo que os futuros profissionais enxerguem as amplas potencialidades da modalidade e integrem diferentes saberes pedagógicos e motores. No contexto da extensão, o espaço se consolida como um ambiente acolhedor, enriquecedor e promotor de autonomia. Sendo o único espaço público com essa infraestrutura no estado, o muro atua como a principal porta de entrada para a comunidade, proporcionando benefícios diretos à saúde física e mental, fortalecendo vínculos sociais e servindo de ponte direta para a escalada em rocha. Ao longo dos anos, vimos inúmeros praticantes se desenvolverem no projeto e adotarem a escalada como uma verdadeira paixão e um esporte para toda a vida.&rdquo;
            </p>

            <div className="pt-2 border-t border-amber-200/60">
              <div className="font-bold text-xs text-slate-900">
                Prof. Dr. Hassan Mohamed Elsangedy
              </div>
              <div className="text-[11px] text-slate-600">
                Departamento de Educação Física – DEF/UFRN · Coordenador do Projeto
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Slide Fotográfico com Legenda (5 Colunas) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-2 shadow-xs overflow-hidden">
            <div className="rounded-2xl overflow-hidden relative aspect-4/3 w-full bg-slate-100">
              <Image
                src="/images/muito-alem-do-esporte-slide.png"
                alt="Muito além do esporte - Parede de Escalada UFRN"
                fill
                className="object-cover"
              />
            </div>
          </div>

          <p className="text-center text-[11px] text-slate-500 font-medium leading-tight px-2">
            Alunos e praticantes reunidos em aula prática e instrução técnica no Ginásio do COESPE.
          </p>
        </div>
      </div>
    </div>
  );
}
