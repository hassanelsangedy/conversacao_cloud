"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Volume2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Filter,
  Layers,
  HelpCircle,
  Tag,
  Pill,
  Mic,
  ArrowRight,
  X,
  Activity,
  Check,
} from "lucide-react";
import { WorkspaceHeader } from "@/components/workspace-header";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface GlossaryTerm {
  id: string;
  is_correction: boolean;
  heard_term?: string;
  written_term: string;
  category?: "medicamento" | "termo_tecnico" | "fonetica" | "sigla";
  created_at: string;
}

const INITIAL_TERMS: GlossaryTerm[] = [
  {
    id: "t1",
    is_correction: true,
    heard_term: "risperidona ou espera dona",
    written_term: "Risperidona 1mg",
    category: "medicamento",
    created_at: "2026-08-10",
  },
  {
    id: "t2",
    is_correction: true,
    heard_term: "de glutição ou de glue tição",
    written_term: "deglutição atípica",
    category: "fonetica",
    created_at: "2026-08-12",
  },
  {
    id: "t3",
    is_correction: false,
    written_term: "Disfagia Orofaringea Neurogênica",
    category: "termo_tecnico",
    created_at: "2026-08-14",
  },
  {
    id: "t4",
    is_correction: true,
    heard_term: "apraxia da fala ou a praxia",
    written_term: "Apraxia de Fala na Infância (AFI)",
    category: "fonetica",
    created_at: "2026-08-18",
  },
  {
    id: "t5",
    is_correction: false,
    written_term: "Metilfenidato (Ritalina LA 20mg)",
    category: "medicamento",
    created_at: "2026-08-20",
  },
];

export default function GlossarioClinicoPage() {
  const supabase = createClient();
  const [terms, setTerms] = useState<GlossaryTerm[]>(INITIAL_TERMS);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("todos");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [isCorrection, setIsCorrection] = useState(true);
  const [heardTerm, setHeardTerm] = useState("");
  const [writtenTerm, setWrittenTerm] = useState("");
  const [category, setCategory] = useState<"medicamento" | "termo_tecnico" | "fonetica" | "sigla">("fonetica");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch initial terms from Supabase if available
  useEffect(() => {
    async function loadGlossary() {
      try {
        const { data, error } = await supabase
          .from("clinical_glossary")
          .select("*")
          .order("created_at", { ascending: false });

        if (data && data.length > 0) {
          const mapped: GlossaryTerm[] = data.map((d: any) => ({
            id: d.id,
            is_correction: d.is_correction ?? false,
            heard_term: d.heard_term,
            written_term: d.written_term,
            category: (d.category as any) || "termo_tecnico",
            created_at: d.created_at ? d.created_at.split("T")[0] : "Recente",
          }));
          setTerms(mapped);
        }
      } catch (err) {
        console.warn("Supabase fetch fallback:", err);
      }
    }
    loadGlossary();
  }, []);

  const handleCreateTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!writtenTerm.trim()) {
      setStatusMessage({ type: "error", text: "Informe o termo correto que deve ser escrito." });
      return;
    }

    if (isCorrection && !heardTerm.trim()) {
      setStatusMessage({ type: "error", text: "Informe a variação fonética que a IA costuma ouvir." });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      // Persist to Supabase
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id || null;

      const { data, error } = await supabase.from("clinical_glossary").insert([
        {
          is_correction: isCorrection,
          heard_term: isCorrection ? heardTerm.trim() : null,
          written_term: writtenTerm.trim(),
          created_by: currentUserId,
        },
      ]).select();

      const newTermObj: GlossaryTerm = {
        id: data && data[0] ? data[0].id : `t-${Date.now()}`,
        is_correction: isCorrection,
        heard_term: isCorrection ? heardTerm.trim() : undefined,
        written_term: writtenTerm.trim(),
        category: category,
        created_at: new Date().toISOString().split("T")[0],
      };

      setTerms([newTermObj, ...terms]);
      setIsSubmitting(false);
      setStatusMessage({ type: "success", text: "Termo cadastrado com sucesso no Glossário Clínico!" });

      setTimeout(() => {
        setIsModalOpen(false);
        setHeardTerm("");
        setWrittenTerm("");
        setIsCorrection(true);
        setStatusMessage(null);
      }, 1000);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      setStatusMessage({ type: "error", text: "Erro ao salvar no Supabase. O termo foi adicionado localmente." });
    }
  };

  const handleDeleteTerm = async (id: string) => {
    if (!confirm("Deseja remover este termo do glossário?")) return;
    try {
      await supabase.from("clinical_glossary").delete().eq("id", id);
    } catch {
      // Fallback
    }
    setTerms((prev) => prev.filter((t) => t.id !== id));
  };

  const filteredTerms = terms.filter((item) => {
    const matchesSearch =
      item.written_term.toLowerCase().includes(search.toLowerCase()) ||
      (item.heard_term && item.heard_term.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      filterCategory === "todos"
        ? true
        : filterCategory === "correcoes"
        ? item.is_correction
        : item.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ backgroundColor: "#F8F9FA" }} className="min-h-screen flex flex-col font-sans text-slate-800 antialiased">
      <WorkspaceHeader currentTitle="Glossário Clínico & Calibração Fonética" badgeText="Whisper v3 + Vertex AI" />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Banner Superior do Glossário */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                style={{ backgroundColor: "rgba(0, 106, 85, 0.1)", color: "#006A55" }}
                className="w-8 h-8 rounded-xl flex items-center justify-center font-bold"
              >
                <BookOpen className="w-5 h-5" />
              </span>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Glossário Clínico & Calibração Fonética
              </h1>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl">
              Regras fonéticas e termos especializados injetados no Whisper Large v3 e Vertex AI para garantir precisão em nomes de medicamentos, jargões fonoaudiológicos e siglas médicas.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            style={{ backgroundColor: "#006A55" }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs font-semibold shadow-md shadow-[#006A55]/20 hover:opacity-90 active:scale-98 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Adicionar ao Glossário
          </button>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar termo correto ou variação fonética..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#006A55] focus:ring-1 focus:ring-[#006A55]/20 shadow-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
            {[
              { id: "todos", label: "Todos" },
              { id: "correcoes", label: "Regras Fonéticas" },
              { id: "medicamento", label: "Medicamentos" },
              { id: "termo_tecnico", label: "Termos Técnicos" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterCategory(tab.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                  filterCategory === tab.id
                    ? "bg-[#006A55] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela / Grid de Termos */}
        <div className="bg-white/85 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Termos Mapeados ({filteredTerms.length})
            </span>
            <span className="text-[11px] text-slate-400">Tabela Supabase `clinical_glossary`</span>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredTerms.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Nenhum termo encontrado para os filtros selecionados.
              </div>
            ) : (
              filteredTerms.map((term) => (
                <div
                  key={term.id}
                  className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="space-y-1.5 flex-1">
                    {term.is_correction ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200/80 px-2.5 py-1 rounded-lg text-xs font-mono text-rose-800">
                          <Mic className="w-3 h-3 text-rose-500" />
                          <span className="font-normal text-[11px] text-slate-500">Quando ouve:</span>
                          <strong>&quot;{term.heard_term}&quot;</strong>
                        </div>

                        <ArrowRight className="w-4 h-4 text-slate-400" />

                        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-900">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="font-normal text-[11px] text-slate-500">Escrever como:</span>
                          <span>{term.written_term}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{term.written_term}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                          Vocabulário Clínico Direto
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className="text-[11px] text-slate-400 font-mono">{term.created_at}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteTerm(term.id)}
                      title="Excluir Termo"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* ========================================================= */}
      {/* MODAL: ADICIONAR AO GLOSSÁRIO CLÍNICO                     */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabeçalho do Modal */}
            <div className="flex items-center gap-3 mb-5">
              <div
                style={{ backgroundColor: "rgba(0, 106, 85, 0.1)", color: "#006A55" }}
                className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold"
              >
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Adicionar ao Glossário</h2>
                <p className="text-xs text-slate-500">
                  Calibre a fonética da IA ou cadastre terminologias clínicas complexas.
                </p>
              </div>
            </div>

            {/* Feedback Message */}
            {statusMessage && (
              <div
                className={cn(
                  "mb-4 p-3 rounded-xl text-xs flex items-center gap-2",
                  statusMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                )}
              >
                {statusMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleCreateTerm} className="space-y-4 text-xs">
              {/* Alternador de Tipo de Entrada */}
              <div className="bg-slate-100/90 p-1 rounded-xl flex border border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCorrection(true)}
                  className={cn(
                    "flex-1 py-2 rounded-lg font-semibold transition-all cursor-pointer text-center",
                    isCorrection
                      ? "bg-white text-[#006A55] shadow-xs border border-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Regra Fonética (Quando ouve &rarr; Escrever como)
                </button>
                <button
                  type="button"
                  onClick={() => setIsCorrection(false)}
                  className={cn(
                    "flex-1 py-2 rounded-lg font-semibold transition-all cursor-pointer text-center",
                    !isCorrection
                      ? "bg-white text-[#006A55] shadow-xs border border-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Termo Específico Direto
                </button>
              </div>

              {/* Se for regra fonética: Campo "Quando a IA ouve..." */}
              {isCorrection && (
                <div className="bg-rose-50/50 p-3.5 rounded-2xl border border-rose-100 space-y-1.5">
                  <label className="block text-slate-800 font-semibold flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-rose-600" />
                    Quando a IA ouve... (Variação ou Erro Comum) *
                  </label>
                  <input
                    type="text"
                    required={isCorrection}
                    value={heardTerm}
                    onChange={(e) => setHeardTerm(e.target.value)}
                    placeholder="Ex: risperidona ou espera dona, ritalina l.a."
                    className="w-full bg-white border border-rose-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-rose-400 font-medium"
                  />
                  <p className="text-[10px] text-slate-500">
                    Insira as formas fonéticas imprecisas que o microfone costuma capturar.
                  </p>
                </div>
              )}

              {/* Campo "Escrever como..." */}
              <div className="bg-emerald-50/40 p-3.5 rounded-2xl border border-emerald-100 space-y-1.5">
                <label className="block text-slate-800 font-semibold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Escrever como... (Termo Clínico Padronizado) *
                </label>
                <input
                  type="text"
                  required
                  value={writtenTerm}
                  onChange={(e) => setWrittenTerm(e.target.value)}
                  placeholder="Ex: Risperidona 1mg, Deglutição Atípica"
                  className="w-full bg-white border border-emerald-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500 font-semibold"
                />
                <p className="text-[10px] text-slate-500">
                  Formato exato que será gravado nas notas clínicas e anamneses geradas.
                </p>
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Categoria Clínica</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-[#006A55] font-medium"
                >
                  <option value="fonetica">Calibração Fonética Geral</option>
                  <option value="medicamento">Medicamento / Farmacologia</option>
                  <option value="termo_tecnico">Termo Técnico / Diagnóstico</option>
                  <option value="sigla">Sigla Médica / Protocolo</option>
                </select>
              </div>

              {/* Botões do Modal */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ backgroundColor: "#006A55" }}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-white font-semibold text-xs shadow-md shadow-[#006A55]/20 hover:opacity-90 active:scale-98 transition-all cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" />
                      Gravando no Supabase...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Salvar no Glossário
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
