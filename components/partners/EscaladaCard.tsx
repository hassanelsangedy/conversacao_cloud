"use client";

import React from "react";
import Image from "next/image";
import {
  MessageCircle,
  MapPin,
  ArrowUpRight,
  Sparkles,
  Award,
  Users,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EscaladaCardProps {
  className?: string;
}

export function EscaladaCard({ className }: EscaladaCardProps) {
  return (
    <div
      className={cn(
        "w-full max-w-5xl mx-auto rounded-[32px] p-6 sm:p-10 border border-amber-200/70 shadow-sm relative overflow-hidden text-left font-sans",
        "bg-[#FFFDF9]",
        className
      )}
    >
      {/* ========================================================= */}
      {/* 1. TOPO: BADGES E SELOS DE RECONHECIMENTO                */}
      {/* ========================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/70 border border-amber-300/60 text-amber-900 text-xs font-bold tracking-wide shadow-2xs">
          <span>🧗</span>
          <span className="uppercase tracking-wider">Extensão Universitária</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200/90 text-slate-700 text-xs font-semibold shadow-2xs">
            <span>Projeto Cadastrado SIGAA (PJ748)</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold shadow-2xs">
            <span>🎉 8 Anos de História</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. CORPO PRINCIPAL DO CARD: GRID COM INFO + REDES         */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Coluna Esquerda / Principal (7.5 ou 8 Colunas) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Linha com as Duas Logos com o Mesmo Destaque e o Título Central */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-5 bg-amber-50/30 p-3 sm:p-4 rounded-3xl border border-amber-200/40">
            {/* Logo 1: Parede de Escalada da UFRN */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white border border-amber-200/80 p-2.5 flex items-center justify-center shrink-0 shadow-xs">
              <Image
                src="/images/parede-escalada-logo.png"
                alt="Parede de Escalada da UFRN"
                width={112}
                height={112}
                className="object-contain w-full h-full"
                priority
              />
            </div>

            {/* Texto Central: Categoria e Título */}
            <div className="flex-1 text-center sm:text-left space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                Esporte, Saúde & Desenvolvimento Humano
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-[25px] font-extrabold text-slate-900 leading-tight font-serif tracking-tight">
                Escalada na UFRN:{" "}
                <span className="text-[#963E1B] block sm:inline">
                  Saúde e Emoção em um Único Esporte
                </span>
              </h1>
            </div>

            {/* Logo 2: AERN com o Mesmo Destaque, Dimensões e Moldura */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white border border-amber-200/80 p-2.5 flex items-center justify-center shrink-0 shadow-xs">
              <Image
                src="/images/aern-logo.png"
                alt="AERN - Associação de Escaladores do RN"
                width={112}
                height={112}
                className="object-contain w-full h-full"
                priority
              />
            </div>
          </div>

          {/* Descrição Institucional */}
          <p className="text-sm text-slate-700 leading-relaxed font-normal">
            Iniciativa pioneira do Departamento de Educação Física (DEF/CCS) e do Complexo de Esportes e Eventos (COESPE/UFRN) que disponibiliza à comunidade um espaço público de prática indoor de bouldering, integrando formação esportiva, convivência e inclusão.
          </p>

          {/* Seção: Equipe do Projeto (Idealização, Coordenação e Colaboração) */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center gap-6">
              {/* Idealização & Coordenação */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Idealização & Coordenação:
                </div>
                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-2xs">
                  <div className="w-7 h-7 rounded-full overflow-hidden border border-amber-300 relative bg-amber-100 flex items-center justify-center shrink-0">
                    <Image
                      src="/images/hassan-avatar.png"
                      alt="Hassan Mohamed Elsangedy"
                      width={28}
                      height={28}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    Hassan Mohamed Elsangedy
                  </span>
                </div>
              </div>

              {/* Colaborador */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Colaborador:
                </div>
                <a
                  href="https://webpsicofisio.vercel.app/#equipe/cheng-chao"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white border border-amber-200/90 hover:border-amber-400 hover:bg-amber-50/50 shadow-2xs transition-all cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-full bg-[#4A2612] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    C
                  </div>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-[#963E1B] transition-colors">
                    Cheng Chao
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#963E1B] transition-colors" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Direita / Card de Canais Oficiais & Contatos (4 Colunas) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Canais Oficiais & Contatos
          </div>

          <div className="space-y-2.5">
            {/* Botão 1: Instagram Escalada */}
            <a
              href="https://instagram.com/escalada_ufrn"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-2xl text-white font-bold text-xs transition-all transform active:scale-98 shadow-md hover:opacity-95 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737]"
            >
              <div className="flex items-center gap-2.5">
                <svg
                  className="w-4 h-4 text-white shrink-0 fill-current"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <span>Instagram @escalada_ufrn</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-white/80" />
            </a>

            {/* Botão 2: Instagram AERN */}
            <a
              href="https://instagram.com/aernescalada"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-2xl text-white font-bold text-xs transition-all transform active:scale-98 shadow-md hover:opacity-95 bg-[#171717]"
            >
              <div className="flex items-center gap-2.5">
                <svg
                  className="w-4 h-4 text-white shrink-0 fill-current"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <span>Instagram @aernescalada</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-white/80" />
            </a>

            {/* Botão 3: Coordenação AERN (Debora) */}
            <a
              href="https://wa.me/5584999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-2xl text-white font-bold text-xs transition-all transform active:scale-98 shadow-md hover:opacity-95 bg-[#25D366]"
            >
              <div className="flex items-center gap-2.5">
                <MessageCircle className="w-4 h-4 text-white" />
                <span>Coordenação AERN (Debora)</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-white/80" />
            </a>

            {/* Botão 4: E-mail da AERN */}
            <a
              href="mailto:aern.escalada@gmail.com"
              className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-2xl bg-[#FFF8E7] border border-amber-300 text-amber-950 font-bold text-xs transition-all transform active:scale-98 shadow-2xs hover:bg-[#FFF3D6]"
            >
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-amber-800" />
                <span>aern.escalada@gmail.com</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-amber-800" />
            </a>
          </div>

          {/* Localização COESPE */}
          <div className="pt-2 flex items-start gap-2 text-[11px] text-slate-600">
            <MapPin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>COESPE — Ginásio Poliesportivo 1 da UFRN</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. RODAPÉ COM TEXTO DE PARCERIA & FONTE DESTACADA         */}
      {/* ========================================================= */}
      <div className="mt-8 pt-5 border-t border-amber-200/60">
        <p className="text-sm sm:text-base font-semibold italic text-[#8B3A1A] leading-snug">
          Parceria consolidada e assessoria técnica continuada da AERN (Associação de Escaladores do Rio Grande do Norte).
        </p>
      </div>
    </div>
  );
}
