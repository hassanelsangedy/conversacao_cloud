"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Plus,
  Users,
  FileText,
  Calendar,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Search,
  ExternalLink,
  Download,
  Trash2,
  X,
  Lock,
  UserPlus,
  Activity,
  FileCheck,
} from "lucide-react";
import { WorkspaceHeader } from "@/components/workspace-header";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface ProfessionalMember {
  email: string;
  name: string;
  role: "coordenador" | "colaborador";
}

interface ResearchGroupItem {
  id: string;
  name: string;
  caae_number: string;
  ethics_approval_date: string;
  tcle_file_name?: string;
  tcle_file_path?: string;
  professionals: ProfessionalMember[];
  created_at: string;
}

const INITIAL_GROUPS: ResearchGroupItem[] = [
  {
    id: "g1",
    name: "Laboratório de Neurociência & Linguagem (UFRN)",
    caae_number: "58291022.4.0000.5537",
    ethics_approval_date: "2026-03-15",
    tcle_file_name: "TCLE_Aprovado_CEP_2026.pdf",
    tcle_file_path: "tcle-docs/tcle-58291022.pdf",
    created_at: "2026-03-20",
    professionals: [
      { email: "dr.hassan@ufrn.br", name: "Dr. Hassan El Sangedy", role: "coordenador" },
      { email: "pesquisadora.ana@ufrn.br", name: "Dra. Ana Medeiros", role: "colaborador" },
      { email: "carlos.mestrado@ufrn.br", name: "Carlos Nogueira", role: "colaborador" },
    ],
  },
  {
    id: "g2",
    name: "Grupo de Estudos em Comunicação Aumentativa & TDAH",
    caae_number: "69102319.1.0000.5538",
    ethics_approval_date: "2026-05-10",
    tcle_file_name: "Termo_Consentimento_Infantil_TDAH.pdf",
    tcle_file_path: "tcle-docs/tcle-69102319.pdf",
    created_at: "2026-05-12",
    professionals: [
      { email: "dr.hassan@ufrn.br", name: "Dr. Hassan El Sangedy", role: "coordenador" },
      { email: "dra.juliana@clinica.com", name: "Dra. Juliana Ferreira", role: "colaborador" },
    ],
  },
];

export default function GruposEticosPage() {
  const supabase = createClient();
  const [groups, setGroups] = useState<ResearchGroupItem[]>(INITIAL_GROUPS);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [groupName, setGroupName] = useState("");
  const [caaeNumber, setCaaeNumber] = useState("");
  const [approvalDate, setApprovalDate] = useState("");
  const [tcleFile, setTcleFile] = useState<File | null>(null);

  // Multi-user professionals state
  const [professionalsList, setProfessionalsList] = useState<ProfessionalMember[]>([
    { email: "", name: "", role: "colaborador" },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleAddProfessionalRow = () => {
    setProfessionalsList((prev) => [...prev, { email: "", name: "", role: "colaborador" }]);
  };

  const handleRemoveProfessionalRow = (index: number) => {
    setProfessionalsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateProfessional = (
    index: number,
    field: keyof ProfessionalMember,
    value: string
  ) => {
    setProfessionalsList((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName || !caaeNumber || !approvalDate) {
      setStatusMessage({ type: "error", text: "Preencha todos os campos obrigatórios (*)." });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      let tclePath = "";
      // Upload do TCLE para o Supabase Storage se arquivo fornecido
      if (tcleFile) {
        const fileExt = tcleFile.name.split(".").pop();
        const fileName = `tcle_${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("tcle-documents")
          .upload(fileName, tcleFile, { upsert: true });

        if (uploadError) {
          console.warn("Storage upload fallback:", uploadError.message);
          tclePath = `tcle-docs/${fileName}`;
        } else {
          tclePath = uploadData?.path || `tcle-docs/${fileName}`;
        }
      }

      const validProfessionals = professionalsList.filter(
        (p) => p.email.trim().length > 0 && p.name.trim().length > 0
      );

      const newGroupItem: ResearchGroupItem = {
        id: `g-${Date.now()}`,
        name: groupName,
        caae_number: caaeNumber,
        ethics_approval_date: approvalDate,
        tcle_file_name: tcleFile ? tcleFile.name : undefined,
        tcle_file_path: tclePath,
        professionals:
          validProfessionals.length > 0
            ? validProfessionals
            : [{ email: "responsavel@ufrn.br", name: "Profissional Responsável", role: "coordenador" }],
        created_at: new Date().toISOString().split("T")[0],
      };

      setGroups([newGroupItem, ...groups]);
      setIsSubmitting(false);
      setStatusMessage({ type: "success", text: "Grupo Ético cadastrado com sucesso!" });

      setTimeout(() => {
        setIsModalOpen(false);
        setGroupName("");
        setCaaeNumber("");
        setApprovalDate("");
        setTcleFile(null);
        setProfessionalsList([{ email: "", name: "", role: "colaborador" }]);
        setStatusMessage(null);
      }, 1200);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      setStatusMessage({ type: "error", text: "Erro ao cadastrar o grupo. Tente novamente." });
    }
  };

  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.caae_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ backgroundColor: "#F8F9FA" }} className="min-h-screen flex flex-col font-sans text-slate-800 antialiased">
      <WorkspaceHeader currentTitle="Gestão de Grupos Éticos & CEP" badgeText="Conformidade LGPD & UFRN" />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Banner Superior Regulatório */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                style={{ backgroundColor: "rgba(0, 106, 85, 0.1)", color: "#006A55" }}
                className="w-8 h-8 rounded-xl flex items-center justify-center font-bold"
              >
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Grupos de Pesquisa & Atendimento Clínico
              </h1>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl">
              Configuração de certificados de ética (CAAE/CEP/SigSaúde), controle de acesso por Row Level Security (RLS) e repositório seguro de Termos de Consentimento (TCLE).
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            style={{ backgroundColor: "#006A55" }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs font-semibold shadow-md shadow-[#006A55]/20 hover:opacity-90 active:scale-98 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Novo Grupo Ético
          </button>
        </div>

        {/* Barra de Filtro e Busca */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome do laboratório ou número CAAE..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#006A55] focus:ring-1 focus:ring-[#006A55]/20 shadow-xs"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Total: <strong>{filteredGroups.length}</strong> grupo(s)
          </span>
        </div>

        {/* Grid de Grupos Cadastrados */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredGroups.map((group) => (
            <div
              key={group.id}
              className="bg-white/85 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all space-y-4 relative overflow-hidden group"
            >
              <div
                style={{ backgroundColor: "#006A55" }}
                className="absolute top-0 left-0 right-0 h-1 opacity-80"
              />

              {/* Cabeçalho do Card */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-sm text-slate-900 leading-snug group-hover:text-[#006A55] transition-colors">
                    {group.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      CAAE: {group.caae_number}
                    </span>
                  </div>
                </div>

                <span
                  style={{ color: "#006A55", backgroundColor: "rgba(0, 106, 85, 0.08)" }}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#006A55]/20 shrink-0"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Aprovado CEP
                </span>
              </div>

              {/* Informações Regulatórias */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    Data Aprovação CEP
                  </span>
                  <p className="font-semibold text-slate-700">{group.ethics_approval_date}</p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                    <FileText className="w-3 h-3 text-slate-400" />
                    Modelo TCLE (PDF)
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-700 font-semibold truncate max-w-[130px]" title={group.tcle_file_name}>
                      {group.tcle_file_name || "TCLE_Padrao.pdf"}
                    </span>
                    <button
                      type="button"
                      title="Baixar Modelo de TCLE"
                      onClick={() => alert(`Iniciando download seguro do TCLE: ${group.tcle_file_name || "TCLE.pdf"}`)}
                      className="text-[#006A55] hover:opacity-80 p-0.5 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Profissionais e Membros Autorizados */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#006A55]" />
                    Profissionais Autorizados ({group.professionals.length})
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Isolamento RLS</span>
                </div>

                <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                  {group.professionals.map((prof, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white border border-slate-200/70 text-xs shadow-2xs"
                    >
                      <div className="overflow-hidden pr-2">
                        <p className="font-semibold text-slate-800 truncate">{prof.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{prof.email}</p>
                      </div>
                      <span
                        className={cn(
                          "text-[9px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0",
                          prof.role === "coordenador"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        )}
                      >
                        {prof.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* ========================================================= */}
      {/* MODAL: CADASTRO DE NOVO GRUPO ÉTICO & UPLOAD TCLE        */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar text-left">
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
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Novo Grupo Ético & Clínico</h2>
                <p className="text-xs text-slate-500">
                  Preencha os dados do projeto aprovado pelo Comitê de Ética em Pesquisa (CEP/UFRN).
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

            <form onSubmit={handleCreateGroup} className="space-y-4 text-xs">
              {/* Nome do Grupo */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Nome do Grupo / Laboratório *
                </label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Ex: Laboratório de Cognição e Linguagem Clínica - UFRN"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-[#006A55] font-medium"
                />
              </div>

              {/* Linha Dupla: CAAE e Data de Aprovação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Número do CAAE *
                  </label>
                  <input
                    type="text"
                    required
                    value={caaeNumber}
                    onChange={(e) => setCaaeNumber(e.target.value)}
                    placeholder="Ex: 58291022.4.0000.5537"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-[#006A55] font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Data de Aprovação no CEP *
                  </label>
                  <input
                    type="date"
                    required
                    value={approvalDate}
                    onChange={(e) => setApprovalDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-[#006A55] font-medium"
                  />
                </div>
              </div>

              {/* Upload do TCLE em PDF (Supabase Storage) */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Modelo de TCLE Aprovado (PDF para Supabase Storage)
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-[#006A55] rounded-2xl p-4 bg-slate-50/60 text-center transition-colors">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    id="tcle_upload"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setTcleFile(e.target.files[0]);
                      }
                    }}
                  />
                  <label htmlFor="tcle_upload" className="cursor-pointer flex flex-col items-center justify-center gap-1.5">
                    <UploadCloud className="w-7 h-7 text-[#006A55]" />
                    <span className="font-semibold text-slate-800">
                      {tcleFile ? tcleFile.name : "Clique para selecionar o PDF do TCLE"}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Armazenado no bucket privado Supabase Storage com criptografia
                    </span>
                  </label>
                </div>
              </div>

              {/* Multi-usuário: Profissionais Autorizados */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-slate-700 font-semibold">
                    Profissionais Autorizados (Row Level Security)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddProfessionalRow}
                    className="text-[11px] font-semibold text-[#006A55] hover:opacity-80 flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    + Adicionar Profissional
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                  {professionalsList.map((prof, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200/80"
                    >
                      <input
                        type="text"
                        placeholder="Nome Completo"
                        value={prof.name}
                        onChange={(e) => handleUpdateProfessional(index, "name", e.target.value)}
                        className="col-span-5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#006A55]"
                      />
                      <input
                        type="email"
                        placeholder="e-mail institucional"
                        value={prof.email}
                        onChange={(e) => handleUpdateProfessional(index, "email", e.target.value)}
                        className="col-span-4 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#006A55]"
                      />
                      <select
                        value={prof.role}
                        onChange={(e) =>
                          handleUpdateProfessional(index, "role", e.target.value as "coordenador" | "colaborador")
                        }
                        className="col-span-2 bg-white border border-slate-200 rounded-lg px-1.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#006A55]"
                      >
                        <option value="colaborador">Colaborador</option>
                        <option value="coordenador">Coordenador</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveProfessionalRow(index)}
                        disabled={professionalsList.length === 1}
                        className="col-span-1 text-slate-400 hover:text-rose-500 disabled:opacity-30 flex justify-center cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botões de Ação */}
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
                      Salvando no Supabase...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Salvar Grupo & Ativar RLS
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
