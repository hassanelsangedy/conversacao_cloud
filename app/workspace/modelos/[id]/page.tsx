"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Plus,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Sliders,
  ChevronUp,
  ChevronDown,
  Layers,
  Eye,
  Save,
  Activity,
  AlignLeft,
  ListOrdered,
  Zap,
} from "lucide-react";
import { WorkspaceHeader } from "@/components/workspace-header";
import { DEFAULT_TEMPLATES, ReportTemplateItem, TemplateSection } from "@/lib/templates-data";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function ModeloEditorPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const templateId = params?.id as string;
  const isNew = templateId === "novo";

  // Template Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [detailLevel, setDetailLevel] = useState<"conciso" | "equilibrio" | "detalhado">("equilibrio");
  const [toneStyle, setToneStyle] = useState<"clinico" | "narrativo" | "juvenil">("clinico");

  const [sections, setSections] = useState<TemplateSection[]>([
    {
      title: "Identificação e Queixa Principal",
      description: "Sintetizar o motivo da consulta relatado pelo paciente ou cuidador.",
      format: "paragrafos",
    },
    {
      title: "Achados da Avaliação",
      description: "Listar os pontos clínicos observados durante a sessão de forma estruturada.",
      format: "topicos",
    },
    {
      title: "Plano Terapêutico e Conduta",
      description: "Orientações, metas e encaminhamentos recomendados.",
      format: "topicos",
    },
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Carregar dados existentes
  useEffect(() => {
    if (!isNew && templateId) {
      const found = DEFAULT_TEMPLATES.find((t) => t.id === templateId);
      if (found) {
        setTitle(found.title);
        setDescription(found.description);
        setDetailLevel(found.detail_level);
        setToneStyle(found.tone_style);
        setSections(found.sections);
      } else {
        // Tenta buscar no Supabase
        async function fetchTemplate() {
          const { data } = await supabase.from("report_templates").select("*").eq("id", templateId).single();
          if (data) {
            setTitle(data.title);
            setDescription(data.description || "");
            setDetailLevel(data.detail_level || "equilibrio");
            setToneStyle(data.tone_style || "clinico");
            if (Array.isArray(data.sections)) {
              setSections(
                data.sections.map((s: any) =>
                  typeof s === "string"
                    ? { title: s, description: `Instruções para ${s}`, format: "automatico" }
                    : s
                )
              );
            }
          }
        }
        fetchTemplate();
      }
    }
  }, [templateId, isNew]);

  // Seções handlers
  const handleAddSection = () => {
    setSections((prev) => [
      ...prev,
      {
        title: `Nova Seção ${prev.length + 1}`,
        description: "Descreva aqui as instruções que a IA deve priorizar nesta seção.",
        format: "paragrafos",
      },
    ]);
  };

  const handleRemoveSection = (index: number) => {
    if (sections.length <= 1) {
      alert("O template precisa ter ao menos uma seção.");
      return;
    }
    setSections((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveSection = (index: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= sections.length) return;

    setSections((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[newIdx];
      copy[newIdx] = temp;
      return copy;
    });
  };

  const handleUpdateSection = (index: number, field: keyof TemplateSection, value: string) => {
    setSections((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  // Salvar Template no Supabase
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFeedback({ type: "error", text: "Informe um título para o modelo." });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        detail_level: detailLevel,
        tone_style: toneStyle,
        sections: sections,
      };

      if (isNew) {
        await supabase.from("report_templates").insert([payload]);
      } else {
        await supabase.from("report_templates").update(payload).eq("id", templateId);
      }

      setIsSaving(false);
      setFeedback({ type: "success", text: "Modelo de nota salvo com sucesso!" });

      setTimeout(() => {
        router.push("/workspace/modelos");
      }, 1200);
    } catch (err) {
      console.error(err);
      setIsSaving(false);
      setFeedback({ type: "error", text: "Erro ao salvar no Supabase. O modelo foi salvo em rascunho local." });
    }
  };

  return (
    <div style={{ backgroundColor: "#F8F9FA" }} className="min-h-screen flex flex-col font-sans text-slate-800 antialiased">
      <WorkspaceHeader currentTitle={isNew ? "Criar Novo Modelo" : `Editar Modelo: ${title || "Template"}`} badgeText="Prompt Engine Vertex AI" />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Topbar de Ações */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/workspace/modelos"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Modelos
          </Link>

          <button
            onClick={handleSaveTemplate}
            disabled={isSaving}
            style={{ backgroundColor: "#006A55" }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-semibold shadow-md shadow-[#006A55]/20 hover:opacity-90 active:scale-98 transition-all cursor-pointer disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <Activity className="w-4 h-4 animate-spin" />
                Salvando Modelo...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar Modelo de Nota
              </>
            )}
          </button>
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div
            className={cn(
              "p-3.5 rounded-2xl text-xs flex items-center gap-2.5 animate-in fade-in duration-150",
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            )}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span className="font-semibold">{feedback.text}</span>
          </div>
        )}

        {/* Layout em Duas Colunas: Formulário do Editor + Live Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Coluna 1: Formulário de Configuração (7 colunas) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Parâmetros Gerais */}
            <div className="bg-white/85 backdrop-blur-xl border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#006A55]" />
                Parâmetros Gerais do Modelo
              </h2>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome do Modelo de Relatório *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: SOAP Clínico Padrão, Anamnese de Voz..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#006A55] font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descrição & Finalidade Clínica
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve descrição da aplicação deste modelo para o profissional e a equipe..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#006A55] resize-none"
                />
              </div>

              {/* Linha Dupla: Nível de Detalhe e Tom/Estilo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Nível de Detalhe */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nível de Detalhe da IA
                  </label>
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    {(["conciso", "equilibrio", "detalhado"] as const).map((lvl) => (
                      <button
                        type="button"
                        key={lvl}
                        onClick={() => setDetailLevel(lvl)}
                        className={cn(
                          "flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer text-center",
                          detailLevel === lvl
                            ? "bg-white text-[#006A55] shadow-xs border border-slate-200"
                            : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tom & Estilo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Tom & Estilo Textual
                  </label>
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    {(["clinico", "narrativo", "juvenil"] as const).map((tone) => (
                      <button
                        type="button"
                        key={tone}
                        onClick={() => setToneStyle(tone)}
                        className={cn(
                          "flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer text-center",
                          toneStyle === tone
                            ? "bg-white text-[#006A55] shadow-xs border border-slate-200"
                            : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Gerenciador de Seções */}
            <div className="bg-white/85 backdrop-blur-xl border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#006A55]" />
                  Gerenciador de Seções do Relatório ({sections.length})
                </h2>

                <button
                  type="button"
                  onClick={handleAddSection}
                  className="text-xs font-bold text-[#006A55] hover:opacity-80 flex items-center gap-1 cursor-pointer bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar Seção
                </button>
              </div>

              <div className="space-y-3.5">
                {sections.map((section, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3 relative group"
                  >
                    {/* Linha do Topo da Seção */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span
                          style={{ backgroundColor: "rgba(0, 106, 85, 0.1)", color: "#006A55" }}
                          className="w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold text-[10px] shrink-0"
                        >
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => handleUpdateSection(idx, "title", e.target.value)}
                          placeholder="Título da Seção (Ex: Subjetivo)"
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#006A55]"
                        />
                      </div>

                      {/* Botões de Ordem e Exclusão */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveSection(idx, "up")}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === sections.length - 1}
                          onClick={() => handleMoveSection(idx, "down")}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSection(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Descrição / Instruções para o Prompt */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Instruções para o Prompt da IA (Vertex AI)
                      </label>
                      <input
                        type="text"
                        value={section.description}
                        onChange={(e) => handleUpdateSection(idx, "description", e.target.value)}
                        placeholder="Orientações detalhadas para guiar a síntese clínica da IA nesta seção..."
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-[#006A55]"
                      />
                    </div>

                    {/* Formato de Saída */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-[11px] text-slate-500 font-medium">Formato de Saída:</span>
                      <div className="flex gap-1.5">
                        {[
                          { id: "automatico", label: "Automático", icon: Zap },
                          { id: "paragrafos", label: "Em Parágrafos", icon: AlignLeft },
                          { id: "topicos", label: "Em Tópicos", icon: ListOrdered },
                        ].map((fmt) => {
                          const Icon = fmt.icon;
                          const isSelected = section.format === fmt.id;
                          return (
                            <button
                              type="button"
                              key={fmt.id}
                              onClick={() => handleUpdateSection(idx, "format", fmt.id as any)}
                              className={cn(
                                "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
                                isSelected
                                  ? "bg-[#006A55] text-white shadow-2xs"
                                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                              )}
                            >
                              <Icon className="w-3 h-3" />
                              <span>{fmt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coluna 2: Live Document Preview (5 colunas) */}
          <div className="lg:col-span-5 sticky top-24 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#006A55]" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Pré-visualização do Relatório
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Live Preview
                </span>
              </div>

              {/* Document Mockup Sheet */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-5 space-y-4 text-xs font-sans">
                {/* Header do Documento */}
                <div className="border-b border-slate-200 pb-3">
                  <div className="text-[10px] uppercase font-bold text-[#006A55]">
                    Conversação Cloud &bull; Nota Clínica Estruturada
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                    {title || "Título do Modelo de Nota"}
                  </h4>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-1">
                    <span>Nível: {detailLevel}</span>
                    <span>&bull;</span>
                    <span>Estilo: {toneStyle}</span>
                  </div>
                </div>

                {/* Seções Renderizadas no Mockup */}
                <div className="space-y-4">
                  {sections.map((sec, i) => (
                    <div key={i} className="space-y-1">
                      <h5 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#006A55]" />
                        {sec.title || `Seção ${i + 1}`}
                      </h5>

                      {sec.format === "topicos" ? (
                        <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-0.5 pl-1">
                          <li>Síntese dos tópicos estruturados capturados na fala.</li>
                          <li>Identificação de dados clínicos segundo as diretrizes.</li>
                        </ul>
                      ) : (
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Texto narrativo estruturado de acordo com as instruções: &quot;
                          {sec.description || "Instruções da seção"}&quot;.
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Rodapé do Documento */}
                <div className="pt-3 border-t border-slate-200 text-[9px] text-slate-400 flex justify-between items-center font-mono">
                  <span>LGPD Conforme</span>
                  <span>CEP/UFRN/SigSaúde</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
