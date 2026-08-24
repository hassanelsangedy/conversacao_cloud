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
} from "lucide-react";
import { WorkspaceHeader } from "@/components/workspace-header";
import { DEFAULT_TEMPLATES, ReportTemplateItem } from "@/lib/templates-data";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function ModelosPage() {
  const supabase = createClient();
  const [templates, setTemplates] = useState<ReportTemplateItem[]>(DEFAULT_TEMPLATES);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadTemplates() {
      try {
        const { data, error } = await supabase.from("report_templates").select("*");
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
              : [],
          }));
          setTemplates(formatted);
        }
      } catch (err) {
        console.warn("Supabase fetch templates fallback:", err);
      }
    }
    loadTemplates();
  }, []);

  const filteredTemplates = templates.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ backgroundColor: "#F8F9FA" }} className="min-h-screen flex flex-col font-sans text-slate-800 antialiased">
      <WorkspaceHeader currentTitle="Editor de Modelos de Notas Clínicas" badgeText="Google Vertex AI Prompt Engine" />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Banner Superior */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                style={{ backgroundColor: "rgba(0, 106, 85, 0.1)", color: "#006A55" }}
                className="w-8 h-8 rounded-xl flex items-center justify-center font-bold"
              >
                <FileText className="w-5 h-5" />
              </span>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Modelos de Relatórios & Notas Clínicas
              </h1>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl">
              Crie e customize templates de estruturação alimentados pelo Gemini 1.5 Pro. Defina as seções, o nível de detalhe e o tom clínico desejado.
            </p>
          </div>

          <Link
            href="/workspace/modelos/novo"
            style={{ backgroundColor: "#006A55" }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs font-semibold shadow-md shadow-[#006A55]/20 hover:opacity-90 active:scale-98 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Criar Novo Modelo
          </Link>
        </div>

        {/* Busca */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por título de modelo ou finalidade..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#006A55] focus:ring-1 focus:ring-[#006A55]/20 shadow-xs"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Total: <strong>{filteredTemplates.length}</strong> modelo(s)
          </span>
        </div>

        {/* Grid de Modelos de Notas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredTemplates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="bg-white/85 backdrop-blur-xl border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-sm text-slate-900 group-hover:text-[#006A55] transition-colors">
                      {tmpl.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{tmpl.description}</p>
                  </div>
                  <span
                    style={{ color: "#006A55", backgroundColor: "rgba(0, 106, 85, 0.08)" }}
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#006A55]/20 shrink-0"
                  >
                    {tmpl.detail_level}
                  </span>
                </div>

                {/* Parâmetros do Modelo */}
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-slate-700 font-medium capitalize">
                    Tom: {tmpl.tone_style}
                  </span>
                  <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-slate-700 font-medium">
                    {tmpl.sections.length} seções configuradas
                  </span>
                </div>

                {/* Preview das Seções */}
                <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Estrutura de Seções
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {tmpl.sections.map((sec, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-medium bg-white px-2 py-1 rounded-lg border border-slate-200/80 text-slate-800"
                      >
                        {sec.title}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Ações do Card */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-[#006A55]" />
                  Compatível com Whisper + Gemini
                </span>

                <Link
                  href={`/workspace/modelos/${tmpl.id}`}
                  style={{ color: "#006A55" }}
                  className="flex items-center gap-1 text-xs font-bold hover:underline cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Editar Modelo
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
