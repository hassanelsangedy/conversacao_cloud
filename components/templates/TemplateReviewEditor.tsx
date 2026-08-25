"use client";

import React, { useState } from "react";
import {
  FileText,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Layers,
  Image as ImageIcon,
  Save,
  Eye,
  Sliders,
  Maximize2,
  AlignCenter,
  AlignLeft,
  AlignRight,
  CheckCircle2,
  AlertCircle,
  Activity,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Tag,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ImportedReportTemplate,
  TemplateSection,
  TemplateField,
  TemplateVisualAsset,
} from "@/lib/report-template-schema";

interface TemplateReviewEditorProps {
  initialTemplate: ImportedReportTemplate;
  onSave: (savedTemplate: ImportedReportTemplate) => Promise<void>;
  onCancel: () => void;
}

export function TemplateReviewEditor({
  initialTemplate,
  onSave,
  onCancel,
}: TemplateReviewEditorProps) {
  const [template, setTemplate] = useState<ImportedReportTemplate>(initialTemplate);
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
  const [selectedPageFilter, setSelectedPageFilter] = useState<number | "all">("all");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Estados de Edição de Seção
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  // Estados de Adição de Novo Campo
  const [addingFieldToSectionId, setAddingFieldToSectionId] = useState<string | null>(null);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldTag, setNewFieldTag] = useState("");
  const [newFieldType, setNewFieldType] = useState<TemplateField["type"]>("text");

  // Handlers de Metadados
  const handleUpdateTitle = (title: string) => {
    setTemplate((prev) => ({ ...prev, title }));
  };

  const handleUpdateDescription = (description: string) => {
    setTemplate((prev) => ({ ...prev, description }));
  };

  const handleUpdateCategory = (category: string) => {
    setTemplate((prev) => ({ ...prev, category }));
  };

  const handleUpdateTone = (toneStyle: ImportedReportTemplate["toneStyle"]) => {
    setTemplate((prev) => ({ ...prev, toneStyle }));
  };

  const handleUpdateDetail = (detailLevel: ImportedReportTemplate["detailLevel"]) => {
    setTemplate((prev) => ({ ...prev, detailLevel }));
  };

  // Handlers de Seções
  const handleAddSection = () => {
    const newSec: TemplateSection = {
      id: `sec-${Date.now()}`,
      title: "Nova Seção / Tópico",
      description: "Descrição e orientações para preenchimento",
      pageNumber: (template.sections[template.sections.length - 1]?.pageNumber || 1),
      layoutType: "standard",
      fields: [
        {
          id: `f-${Date.now()}`,
          label: "Campo ou Pergunta",
          variableTag: `<<CAMPO_${Date.now().toString().slice(-4)}>>`,
          type: "textarea",
          required: true,
        },
      ],
    };

    setTemplate((prev) => ({
      ...prev,
      sections: [...prev.sections, newSec],
    }));
  };

  const handleRemoveSection = (sectionId: string) => {
    setTemplate((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== sectionId),
    }));
  };

  const handleUpdateSection = (
    sectionId: string,
    field: keyof TemplateSection,
    value: any
  ) => {
    setTemplate((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, [field]: value } : s
      ),
    }));
  };

  // Handlers de Campos / Perguntas
  const handleAddField = (sectionId: string) => {
    if (!newFieldLabel) {
      alert("Insira o nome do campo.");
      return;
    }

    const tagFormatted = newFieldTag
      ? newFieldTag.toUpperCase().startsWith("<<")
        ? newFieldTag.toUpperCase()
        : `<<${newFieldTag.toUpperCase()}>>`
      : `<<${newFieldLabel.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "")}>>`;

    const newField: TemplateField = {
      id: `f-${Date.now()}`,
      label: newFieldLabel,
      variableTag: tagFormatted,
      type: newFieldType,
      required: true,
    };

    setTemplate((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, fields: [...s.fields, newField] } : s
      ),
    }));

    setAddingFieldToSectionId(null);
    setNewFieldLabel("");
    setNewFieldTag("");
    setNewFieldType("text");
  };

  const handleRemoveField = (sectionId: string, fieldId: string) => {
    setTemplate((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId
          ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) }
          : s
      ),
    }));
  };

  const handleUpdateField = (
    sectionId: string,
    fieldId: string,
    property: keyof TemplateField,
    val: any
  ) => {
    setTemplate((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              fields: s.fields.map((f) =>
                f.id === fieldId ? { ...f, [property]: val } : f
              ),
            }
          : s
      ),
    }));
  };

  // Handlers de Assets Visuais / Logos
  const handleAddVisualAsset = (position: TemplateVisualAsset["position"]) => {
    const newAsset: TemplateVisualAsset = {
      id: `asset-${Date.now()}`,
      type: position === "header" ? "logo" : position === "footer" ? "signature" : "diagram",
      position,
      caption: position === "header" ? "Logotipo Institucional" : "Assinatura do Responsável",
      layout: position === "header" ? "center" : "full",
    };

    setTemplate((prev) => ({
      ...prev,
      visualAssets: [...prev.visualAssets, newAsset],
    }));
  };

  const handleRemoveVisualAsset = (assetId: string) => {
    setTemplate((prev) => ({
      ...prev,
      visualAssets: prev.visualAssets.filter((a) => a.id !== assetId),
    }));
  };

  const handleSave = async () => {
    if (!template.title.trim()) {
      alert("Por favor, preencha o título do modelo.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await onSave(template);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao salvar template.");
      setIsSaving(false);
    }
  };

  // Agrupamento de Seções por Página
  const pageNumbers = Array.from(
    new Set(template.sections.map((s) => s.pageNumber || 1))
  ).sort((a, b) => a - b);

  const filteredSections = template.sections.filter((s) => {
    if (selectedPageFilter === "all") return true;
    return (s.pageNumber || 1) === selectedPageFilter;
  });

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-sm space-y-6 animate-in fade-in duration-200">
      {/* Barra Superior do Editor */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#006A55]" /> Extraído por IA
              </span>
              {template.extractedFrom?.fileName && (
                <span className="text-[11px] text-slate-500 font-mono">
                  Arquivo: {template.extractedFrom.fileName}
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
              Revisão e Customização do Modelo
            </h2>
          </div>
        </div>

        {/* Alternador Editor / Preview e Botão Salvar */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveTab("editor")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                activeTab === "editor"
                  ? "bg-white text-[#006A55] shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editor de Estrutura</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                activeTab === "preview"
                  ? "bg-white text-[#006A55] shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Pré-visualização A4</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{ backgroundColor: "#006A55" }}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-xs font-bold shadow-md shadow-[#006A55]/20 hover:opacity-90 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Activity className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar Modelo
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alerta de Erro ao Salvar */}
      {saveError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {activeTab === "editor" ? (
        /* ========================================================= */
        /* ABA DO EDITOR DE ESTRUTURA E TAGS                         */
        /* ========================================================= */
        <div className="space-y-6">
          {/* Metadados Gerais do Modelo */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#006A55]" />
              Identificação & Metadados do Modelo
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Título do Modelo *</label>
                <input
                  type="text"
                  value={template.title}
                  onChange={(e) => handleUpdateTitle(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-[#006A55]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Categoria</label>
                <input
                  type="text"
                  value={template.category || "Geral"}
                  onChange={(e) => handleUpdateCategory(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#006A55]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tom Clínico da IA</label>
                <select
                  value={template.toneStyle}
                  onChange={(e) => handleUpdateTone(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#006A55]"
                >
                  <option value="clinico">Clínico (Padrão SOAP / Prontuário)</option>
                  <option value="narrativo">Narrativo / Descritivo</option>
                  <option value="institucional">Institucional / Formal</option>
                  <option value="academico">Acadêmico / Pesquisa CEP</option>
                </select>
              </div>

              <div className="sm:col-span-4">
                <label className="block font-bold text-slate-700 mb-1">Descrição / Objetivo do Modelo</label>
                <textarea
                  rows={2}
                  value={template.description}
                  onChange={(e) => handleUpdateDescription(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#006A55] resize-none"
                />
              </div>
            </div>
          </div>

          {/* Gestão de Assets Visuais / Logotipos do Modelo */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#006A55]" />
                Elementos Visuais, Logotipos & Assinaturas ({template.visualAssets.length})
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddVisualAsset("header")}
                  className="text-[11px] font-bold text-[#006A55] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> + Logotipo de Cabeçalho
                </button>
                <span>&bull;</span>
                <button
                  type="button"
                  onClick={() => handleAddVisualAsset("footer")}
                  className="text-[11px] font-bold text-[#006A55] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> + Assinatura de Rodapé
                </button>
              </div>
            </div>

            {template.visualAssets.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                Nenhum elemento visual configurado. Adicione logotipos ou assinaturas se desejar.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {template.visualAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#006A55] flex items-center justify-center font-bold text-xs shrink-0">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-bold text-xs text-slate-900 truncate">
                          {asset.caption}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase font-mono">
                          {asset.position} &bull; {asset.layout}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveVisualAsset(asset.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Filtro Paginado & Botão Adicionar Seção */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-700 mr-1">Filtrar por Página:</span>
              <button
                type="button"
                onClick={() => setSelectedPageFilter("all")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                  selectedPageFilter === "all"
                    ? "bg-[#006A55] text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                )}
              >
                Todas ({template.sections.length})
              </button>
              {pageNumbers.map((pNum) => (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => setSelectedPageFilter(pNum)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                    selectedPageFilter === pNum
                      ? "bg-[#006A55] text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  )}
                >
                  Página {pNum}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddSection}
              style={{ backgroundColor: "rgba(0, 106, 85, 0.08)", color: "#006A55" }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border border-[#006A55]/30 hover:bg-[#006A55] hover:text-white transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Nova Seção</span>
            </button>
          </div>

          {/* Lista de Seções Extraídas */}
          <div className="space-y-4">
            {filteredSections.map((sec, secIdx) => (
              <div
                key={sec.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3 relative group"
              >
                {/* Header da Seção */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">
                        Título da Seção
                      </label>
                      <input
                        type="text"
                        value={sec.title}
                        onChange={(e) => handleUpdateSection(sec.id, "title", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#006A55]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">
                        Página do Relatório
                      </label>
                      <select
                        value={sec.pageNumber || 1}
                        onChange={(e) =>
                          handleUpdateSection(sec.id, "pageNumber", parseInt(e.target.value, 10))
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#006A55]"
                      >
                        <option value={1}>Página 1 (Abertura e Metas)</option>
                        <option value={2}>Página 2 (Avaliação)</option>
                        <option value={3}>Página 3 (Barreiras e Encerramento)</option>
                        <option value={4}>Página 4 (Anexos e Laudos)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveSection(sec.id)}
                    title="Excluir Seção"
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors mt-4"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Texto Fixo / Enunciado Institucional (se houver) */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Texto Fixo / Enunciado Institucional (Opcional)
                  </label>
                  <input
                    type="text"
                    value={sec.fixedText || ""}
                    onChange={(e) => handleUpdateSection(sec.id, "fixedText", e.target.value)}
                    placeholder="Instruções ou mensagens que não mudam entre pacientes..."
                    className="w-full bg-slate-50/70 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-[#006A55]"
                  />
                </div>

                {/* Lista de Campos / Perguntas da Seção */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-[#006A55]" />
                      Campos & Variáveis Dinâmicas ({sec.fields.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setAddingFieldToSectionId(sec.id)}
                      className="text-[11px] font-bold text-[#006A55] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> + Campo
                    </button>
                  </div>

                  <div className="space-y-2">
                    {sec.fields.map((fld) => (
                      <div
                        key={fld.id}
                        className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center text-xs"
                      >
                        <div>
                          <input
                            type="text"
                            value={fld.label}
                            onChange={(e) =>
                              handleUpdateField(sec.id, fld.id, "label", e.target.value)
                            }
                            placeholder="Nome do Campo / Pergunta"
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#006A55]"
                          />
                        </div>

                        <div>
                          <input
                            type="text"
                            value={fld.variableTag}
                            onChange={(e) =>
                              handleUpdateField(sec.id, fld.id, "variableTag", e.target.value)
                            }
                            placeholder="<<TAG>>"
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-[#006A55] focus:outline-none focus:border-[#006A55]"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={fld.type}
                            onChange={(e) =>
                              handleUpdateField(sec.id, fld.id, "type", e.target.value as any)
                            }
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-[#006A55]"
                          >
                            <option value="text">Texto Curto</option>
                            <option value="textarea">Texto Longo</option>
                            <option value="date">Data</option>
                            <option value="select">Seleção</option>
                            <option value="image_placeholder">Imagem / Exame</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleRemoveField(sec.id, fld.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Formulário Inline de Adicionar Campo */}
                  {addingFieldToSectionId === sec.id && (
                    <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3 space-y-2 mt-2">
                      <div className="font-bold text-xs text-[#006A55]">Novo Campo para esta Seção</div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={newFieldLabel}
                          onChange={(e) => setNewFieldLabel(e.target.value)}
                          placeholder="Nome do Campo / Pergunta"
                          className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-[#006A55]"
                        />
                        <input
                          type="text"
                          value={newFieldTag}
                          onChange={(e) => setNewFieldTag(e.target.value)}
                          placeholder="<<TAG>> (opcional)"
                          className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono text-[#006A55] focus:outline-none focus:border-[#006A55]"
                        />
                        <select
                          value={newFieldType}
                          onChange={(e) => setNewFieldType(e.target.value as any)}
                          className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-[#006A55]"
                        >
                          <option value="text">Texto Curto</option>
                          <option value="textarea">Texto Longo</option>
                          <option value="date">Data</option>
                          <option value="select">Seleção</option>
                          <option value="image_placeholder">Imagem / Exame</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setAddingFieldToSectionId(null)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddField(sec.id)}
                          style={{ backgroundColor: "#006A55" }}
                          className="px-3 py-1 text-xs font-bold text-white rounded-lg hover:opacity-90"
                        >
                          Adicionar Campo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* ABA DE PRÉ-VISUALIZAÇÃO PAGINADA (A4 / DOCUMENTO)         */
        /* ========================================================= */
        <div className="space-y-6">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">
              Visualização Paginada A4 do Relatório
            </span>
            <span className="text-slate-500 font-mono">
              Total: {pageNumbers.length} Página(s)
            </span>
          </div>

          {pageNumbers.map((pNum) => {
            const pageSections = template.sections.filter(
              (s) => (s.pageNumber || 1) === pNum
            );
            const pageHeaderLogo = template.visualAssets.find(
              (a) => a.position === "header"
            );
            const pageFooterSig = template.visualAssets.find(
              (a) => a.position === "footer"
            );

            return (
              <div
                key={pNum}
                className="bg-white border-2 border-slate-300 rounded-3xl p-6 sm:p-10 shadow-lg max-w-3xl mx-auto space-y-6 relative print:shadow-none"
              >
                {/* Header da Página */}
                <div className="border-b border-slate-200 pb-4 text-center space-y-2">
                  {pageHeaderLogo && (
                    <div className="py-2 flex items-center justify-center">
                      <div className="px-4 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs font-mono text-slate-600 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-[#006A55]" />
                        <span>[ {pageHeaderLogo.caption || "Logotipo Institucional"} ]</span>
                      </div>
                    </div>
                  )}
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-tight">
                    {template.title}
                  </h1>
                  <p className="text-xs text-slate-500">
                    {pNum === 1
                      ? "Página 1 • Abertura e Metas do Participante"
                      : pNum === 2
                      ? "Página 2 • Avaliação Clínica e Motivações"
                      : `Página ${pNum} • Relatório e Encaminhamentos`}
                  </p>
                </div>

                {/* Conteúdo das Seções da Página */}
                <div className="space-y-5">
                  {pageSections.map((sec) => (
                    <div
                      key={sec.id}
                      className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3"
                    >
                      <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200/80 pb-1.5">
                        {sec.title}
                      </h2>

                      {sec.fixedText && (
                        <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded-lg border border-slate-200">
                          {sec.fixedText}
                        </p>
                      )}

                      <div className="space-y-2">
                        {sec.fields.map((f) => (
                          <div
                            key={f.id}
                            className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1"
                          >
                            <label className="block text-[11px] font-bold text-slate-800">
                              {f.label}:
                            </label>
                            <div className="bg-slate-50 px-2.5 py-1 rounded border border-dashed border-slate-300 text-xs font-mono text-[#006A55]">
                              {f.variableTag}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Rodapé / Assinatura da Página */}
                {pageFooterSig && pNum === pageNumbers[pageNumbers.length - 1] && (
                  <div className="pt-8 border-t border-slate-200 text-center space-y-1">
                    <div className="w-48 h-px bg-slate-400 mx-auto mb-1" />
                    <p className="text-xs font-bold text-slate-800">
                      {pageFooterSig.caption || "Assinatura do Profissional / Orientador"}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Responsável Técnico / Registro Profissional
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
      )}
    </div>
  );
}
