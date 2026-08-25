"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  Sparkles,
  Sliders,
  Layers,
  ArrowRight,
  Edit3,
  Copy,
  Trash2,
  CheckCircle2,
  FileSpreadsheet,
  Activity,
  UploadCloud,
  X,
  AlertCircle,
} from "lucide-react";
import { WorkspaceHeader } from "@/components/workspace-header";
import { DEFAULT_TEMPLATES, ReportTemplateItem } from "@/lib/templates-data";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ImportTemplateModal } from "@/components/templates/ImportTemplateModal";
import { TemplateReviewEditor } from "@/components/templates/TemplateReviewEditor";
import { ImportedReportTemplate } from "@/lib/report-template-schema";

export default function ModelosPage() {
  const supabase = createClient();
  const [templates, setTemplates] = useState<ReportTemplateItem[]>(DEFAULT_TEMPLATES);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Estados de Importação e Editor de Revisão
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [reviewingTemplate, setReviewingTemplate] = useState<ImportedReportTemplate | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("report_templates").select("*").order("created_at", { ascending: true });
      if (data && data.length > 0) {
        const formatted: ReportTemplateItem[] = data.map((d: any) => ({
          id: d.id,
          title: d.title,
          description: d.description,
          detail_level: d.detail_level || "equilibrio",
          tone_style: d.tone_style || "clinico",
          sections: Array.isArray(d.sections)
            ? d.sections.map((s: any) =>
                typeof s === "string"
                  ? { title: s, description: `Instruções para ${s}`, format: "automatico" }
                  : s
              )
            : d.sections?.items
            ? d.sections.items
            : [],
        }));
        setTemplates(formatted);
      }
    } catch (err) {
      console.warn("Supabase fetch templates fallback:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleTemplateImported = (imported: ImportedReportTemplate) => {
    setReviewingTemplate(imported);
  };

  const handleSaveImportedTemplate = async (saved: ImportedReportTemplate) => {
    try {
      const res = await fetch("/api/templates/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saved),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.details || data.error || "Erro ao salvar modelo no banco.");
      }

      setFeedbackToast({
        type: "success",
        message: `Modelo "${saved.title}" salvo e disponibilizado com sucesso na biblioteca!`,
      });

      setReviewingTemplate(null);
      await loadTemplates();
    } catch (err: any) {
      throw err;
    }
  };

  const handleDeleteTemplate = async (id: string, title: string) => {
    if (!confirm(`Deseja realmente remover o modelo "${title}"?`)) return;

    try {
      const { error } = await supabase.from("report_templates").delete().eq("id", id);
      if (error) throw error;

      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setFeedbackToast({
        type: "success",
        message: `Modelo "${title}" removido com sucesso.`,
      });
    } catch (err: any) {
      setFeedbackToast({
        type: "error",
        message: `Erro ao excluir modelo: ${err?.message || String(err)}`,
      });
    }
  };

  const filteredTemplates = templates.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      style={{ backgroundColor: "#F8F9FA" }}
      className="min-h-screen flex flex-col font-sans text-slate-800 antialiased selection:bg-[#006A55] selection:text-white"
    >
      <WorkspaceHeader
        currentTitle="Editor de Relatórios Clínicos"
        badgeText="Engenharia Reversa & Prompt Engine"
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Toast Feedback */}
        {feedbackToast && (
          <div
            className={cn(
              "p-4 rounded-2xl border backdrop-blur-xl shadow-lg flex items-center justify-between gap-3 animate-in fade-in duration-200",
              feedbackToast.type === "success"
                ? "bg-emerald-50/95 border-emerald-300 text-emerald-950"
                : "bg-rose-50/95 border-rose-300 text-rose-950"
            )}
          >
            <div className="flex items-center gap-2.5">
              {feedbackToast.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-[#006A55] shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span className="text-xs font-semibold">{feedbackToast.message}</span>
            </div>
            <button
              onClick={() => setFeedbackToast(null)}
              className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Se o usuário estiver revisando um modelo recém-importado */}
        {reviewingTemplate ? (
          <TemplateReviewEditor
            initialTemplate={reviewingTemplate}
            onSave={handleSaveImportedTemplate}
            onCancel={() => setReviewingTemplate(null)}
          />
        ) : (
          <>
            {/* Banner Superior com Botões de Ação */}
            <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    style={{ backgroundColor: "rgba(0, 106, 85, 0.1)", color: "#006A55" }}
                    className="w-9 h-9 rounded-2xl flex items-center justify-center font-bold shadow-xs"
                  >
                    <FileText className="w-5 h-5" />
                  </span>
                  <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                    Modelos de Relatórios Clínicos & Estruturados
                  </h1>
                </div>
                <p className="text-xs text-slate-500 max-w-2xl">
                  Importe modelos existentes em Word, PDF ou Imagens para engenharia reversa via IA, ou crie novos templates do zero com o motor Gemini.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                {/* Botão de Importar Modelo via Upload de Arquivo */}
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  style={{ backgroundColor: "rgba(0, 106, 85, 0.08)", color: "#006A55" }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold border border-[#006A55]/30 hover:bg-[#006A55] hover:text-white transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Importar Modelo</span>
                </button>

                {/* Botão Criar Novo Modelo */}
                <Link
                  href="/workspace/modelos/novo"
                  style={{ backgroundColor: "#006A55" }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-xs font-bold shadow-md shadow-[#006A55]/20 hover:opacity-90 active:scale-98 transition-all cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Criar Novo Modelo</span>
                </Link>
              </div>
            </div>

            {/* Busca */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar modelos de relatório..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#006A55] shadow-2xs"
                />
              </div>
            </div>

            {/* Grid de Modelos Disponíveis */}
            {loading ? (
              <div className="text-center py-16 bg-white/60 border border-slate-200 rounded-3xl">
                <Activity className="w-8 h-8 text-[#006A55] animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">Carregando biblioteca de modelos...</p>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-16 bg-white/80 border border-slate-200 rounded-3xl space-y-3">
                <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900">Nenhum modelo de relatório encontrado</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Importe um arquivo Word/PDF ou crie um novo template para começar.
                </p>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  style={{ backgroundColor: "#006A55" }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md hover:opacity-90"
                >
                  <UploadCloud className="w-4 h-4" />
                  Importar Modelo de Arquivo
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 hover:border-[#006A55]/40 group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div
                            style={{ backgroundColor: "rgba(0, 106, 85, 0.08)", color: "#006A55" }}
                            className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm border border-[#006A55]/20 shrink-0"
                          >
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#006A55] transition-colors line-clamp-1">
                              {template.title}
                            </h3>
                            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                              {template.sections?.length || 0} SEÇÕES ESTRUTURADAS
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                        {template.description}
                      </p>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 capitalize">
                          {template.detail_level}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-[#006A55] border border-emerald-200 capitalize">
                          Tom {template.tone_style}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <Link
                        href={`/workspace/modelos/${template.id}`}
                        style={{ backgroundColor: "rgba(0, 106, 85, 0.08)", color: "#006A55" }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border border-[#006A55]/20 hover:bg-[#006A55] hover:text-white transition-all cursor-pointer shadow-2xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar Template</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(template.id, template.title)}
                        title="Excluir Modelo"
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal de Importação de Modelo */}
      <ImportTemplateModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onTemplateImported={handleTemplateImported}
      />
    </div>
  );
}
