"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileText,
  X,
  Printer,
  Edit3,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Tag,
  CheckCircle2,
  Calendar,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportTemplateItem } from "@/lib/templates-data";

interface TemplatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: ReportTemplateItem | null;
}

export function TemplatePreviewModal({
  isOpen,
  onClose,
  template,
}: TemplatePreviewModalProps) {
  const [currentPageFilter, setCurrentPageFilter] = useState<number | "all">("all");

  if (!isOpen || !template) return null;

  const sections: any[] = template.sections || [];

  // Agrupa seções por número de página
  const pageNumbers = Array.from(
    new Set(sections.map((s: any) => s.pageNumber || 1))
  ).sort((a: any, b: any) => a - b);

  const filteredSections = sections.filter((s: any) => {
    if (currentPageFilter === "all") return true;
    return (s.pageNumber || 1) === currentPageFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-slate-100 border border-slate-200 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-left">
        {/* Barra Superior do Modal */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: "rgba(0, 106, 85, 0.08)", color: "#006A55" }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0"
            >
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 line-clamp-1">
                  {template.title}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 capitalize">
                  Tom {template.tone_style}
                </span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-1">
                Visualização do Layout e Estrutura do Relatório
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/workspace/modelos/${template.id}`}
              style={{ backgroundColor: "rgba(0, 106, 85, 0.08)", color: "#006A55" }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-[#006A55]/20 hover:bg-[#006A55] hover:text-white transition-all shadow-2xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Editar Template</span>
            </Link>

            <button
              type="button"
              onClick={() => window.print()}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              title="Imprimir visualização"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filtro por Páginas (se houver mais de 1) */}
        {pageNumbers.length > 1 && (
          <div className="bg-white/80 border-b border-slate-200/80 px-6 py-2 flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0 text-xs">
            <span className="font-bold text-slate-600 mr-1">Exibir:</span>
            <button
              type="button"
              onClick={() => setCurrentPageFilter("all")}
              className={cn(
                "px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer",
                currentPageFilter === "all"
                  ? "bg-[#006A55] text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Todas as Páginas ({pageNumbers.length})
            </button>

            {pageNumbers.map((pNum: any) => (
              <button
                key={pNum}
                type="button"
                onClick={() => setCurrentPageFilter(pNum)}
                className={cn(
                  "px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer",
                  currentPageFilter === pNum
                    ? "bg-[#006A55] text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                Página {pNum}
              </button>
            ))}
          </div>
        )}

        {/* Área de Visualização do Documento (A4 Canvas) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 custom-scrollbar">
          {pageNumbers.map((pNum: any) => {
            if (currentPageFilter !== "all" && currentPageFilter !== pNum) {
              return null;
            }

            const pageSections = sections.filter(
              (s: any) => (s.pageNumber || 1) === pNum
            );

            return (
              <div
                key={pNum}
                className="bg-white border border-slate-300 rounded-3xl p-6 sm:p-12 shadow-md max-w-3xl mx-auto space-y-6 text-slate-900 relative"
              >
                {/* Cabeçalho Institucional do Relatório */}
                <div className="border-b-2 border-slate-200 pb-5 text-center space-y-2">
                  <div className="flex items-center justify-center gap-3">
                    <div className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-mono text-slate-600 flex items-center gap-2">
                      <ImageIcon className="w-3.5 h-3.5 text-[#006A55]" />
                      <span>[ Brasão / Logotipo Institucional ]</span>
                    </div>
                  </div>

                  <h1 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-slate-900 mt-2">
                    {template.title}
                  </h1>

                  <p className="text-xs text-slate-500 font-medium max-w-lg mx-auto">
                    {template.description}
                  </p>
                </div>

                {/* Seções e Campos da Página */}
                <div className="space-y-6">
                  {pageSections.map((sec: any, idx: number) => (
                    <div
                      key={idx}
                      className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                        <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <span
                            style={{ backgroundColor: "rgba(0, 106, 85, 0.1)", color: "#006A55" }}
                            className="w-5 h-5 rounded-md flex items-center justify-center text-[10px]"
                          >
                            {idx + 1}
                          </span>
                          {sec.title}
                        </h2>
                        {sec.format && (
                          <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">
                            {sec.format}
                          </span>
                        )}
                      </div>

                      {sec.fixedText && (
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 italic">
                          {sec.fixedText}
                        </div>
                      )}

                      {/* Renderização de Campos com Tags Dinâmicas */}
                      {sec.fields && sec.fields.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {sec.fields.map((fld: any, fIdx: number) => (
                            <div
                              key={fIdx}
                              className={cn(
                                "p-3 rounded-xl bg-white border border-slate-200 space-y-1",
                                fld.type === "textarea" ? "sm:col-span-2" : ""
                              )}
                            >
                              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                                <span>{fld.label}:</span>
                                {fld.required && (
                                  <span className="text-[10px] text-emerald-700 font-semibold">
                                    Obrigatório
                                  </span>
                                )}
                              </div>
                              <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg border border-dashed border-slate-300 text-xs font-mono text-[#006A55] font-semibold flex items-center justify-between">
                                <span>{fld.variableTag || `<<${fld.label.toUpperCase()}>>`}</span>
                                <span className="text-[10px] text-slate-400 uppercase font-sans">
                                  {fld.type || "texto"}
                                </span>
                              </div>
                              {fld.helpText && (
                                <p className="text-[10px] text-slate-400 italic">
                                  {fld.helpText}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 leading-relaxed">
                          {sec.description || "Conteúdo formatado conforme diretrizes clínicas."}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Rodapé e Assinatura na última página */}
                {pNum === pageNumbers[pageNumbers.length - 1] && (
                  <div className="pt-10 border-t border-slate-200 text-center space-y-1">
                    <div className="w-56 h-px bg-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-900">
                      Assinatura do Profissional / Orientador Responsável
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Registro Profissional / Protocolo CEP UFRN
                    </p>
                  </div>
                )}

                <div className="text-right text-[10px] font-mono text-slate-400 pt-4">
                  Página {pNum} de {pageNumbers.length}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé do Modal */}
        <div className="bg-white px-6 py-3 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Fechar Visualização
          </button>
        </div>
      </div>
    </div>
  );
}
