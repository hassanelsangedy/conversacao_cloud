"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
  Edit3,
  Phone,
  Mail,
  Mic,
  Tag,
  Check,
} from "lucide-react";
import { WorkspaceHeader } from "@/components/workspace-header";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface ProfessionalMember {
  email: string;
  name: string;
  role: "coordenador" | "colaborador" | "orientador";
}

interface ParticipantSummary {
  id: string;
  auto_id: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  email?: string;
  prontuario_pep?: string;
  grammatical_gender?: string;
  tcle_accepted?: boolean;
  created_at: string;
}

interface ResearchGroupItem {
  id: string;
  name: string;
  caae_number: string;
  ethics_approval_date: string;
  tcle_file_name?: string;
  tcle_file_path?: string;
  professionals: ProfessionalMember[];
  participants: ParticipantSummary[];
  created_at: string;
}

const DEFAULT_PROFESSIONALS: ProfessionalMember[] = [
  { email: "dr.hassan@ufrn.br", name: "Dr. Hassan El Sangedy", role: "coordenador" },
  { email: "pesquisadora.ana@ufrn.br", name: "Dra. Ana Medeiros", role: "orientador" },
];

export default function GruposPage() {
  const supabase = createClient();
  const [groups, setGroups] = useState<ResearchGroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTabByGroup, setActiveTabByGroup] = useState<Record<string, "participantes" | "equipe">>({});

  // Modal Grupo (Criar / Editar)
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [caaeNumber, setCaaeNumber] = useState("");
  const [approvalDate, setApprovalDate] = useState("");
  const [tcleFile, setTcleFile] = useState<File | null>(null);
  const [professionalsList, setProfessionalsList] = useState<ProfessionalMember[]>(DEFAULT_PROFESSIONALS);

  // Modal Adicionar Participante ao Grupo
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
  const [targetGroupIdForParticipant, setTargetGroupIdForParticipant] = useState<string>("");
  const [newPartFirstName, setNewPartFirstName] = useState("");
  const [newPartLastName, setNewPartLastName] = useState("");
  const [newPartPhone, setNewPartPhone] = useState("");
  const [newPartEmail, setNewPartEmail] = useState("");
  const [newPartGender, setNewPartGender] = useState<"masculino" | "feminino" | "neutro">("feminino");
  const [newPartPep, setNewPartPep] = useState("");
  const [newPartTcle, setNewPartTcle] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 1. Carrega Grupos, Profissionais e Participantes do Supabase
  const loadData = async () => {
    try {
      setLoading(true);

      // Busca Grupos (RLS filtra automaticamente por created_by ou membership)
      const { data: grpData, error: grpErr } = await supabase
        .from("research_groups")
        .select("*")
        .order("created_at", { ascending: false });

      if (grpErr) throw grpErr;

      // Busca Profissionais cadastrados nos grupos
      const { data: profData } = await supabase
        .from("group_professionals")
        .select("*");

      // Busca Participantes vinculados aos grupos
      const { data: partData, error: partErr } = await supabase
        .from("participants")
        .select("*")
        .order("created_at", { ascending: false });

      if (partErr) throw partErr;

      const mappedGroups: ResearchGroupItem[] = (grpData || []).map((g: any) => {
        const groupParticipants = (partData || []).filter((p: any) => p.group_id === g.id);
        const groupProfs: ProfessionalMember[] = (profData || [])
          .filter((pr: any) => pr.group_id === g.id)
          .map((pr: any) => ({
            name: pr.name || "Profissional",
            email: pr.email || "",
            role: (pr.role as any) || "colaborador",
          }));

        return {
          id: g.id,
          name: g.name,
          caae_number: g.caae_number || "58291022.4.0000.5537",
          ethics_approval_date: g.ethics_approval_date || "2026-03-15",
          tcle_file_name: g.tcle_file_path ? "TCLE_Aprovado_CEP.pdf" : undefined,
          tcle_file_path: g.tcle_file_path,
          professionals: groupProfs.length > 0 ? groupProfs : DEFAULT_PROFESSIONALS,
          participants: groupParticipants,
          created_at: g.created_at || new Date().toISOString(),
        };
      });

      setGroups(mappedGroups);
    } catch (err: any) {
      console.error("[Grupos] Erro ao carregar:", err);
      setToastMessage({
        type: "error",
        text: `Erro ao carregar grupos: ${err?.message || String(err)}`,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers do Modal de Grupo
  const handleOpenNewGroupModal = () => {
    setEditingGroupId(null);
    setGroupName("");
    setCaaeNumber("");
    setApprovalDate(new Date().toISOString().split("T")[0]);
    setTcleFile(null);
    setProfessionalsList(DEFAULT_PROFESSIONALS);
    setIsGroupModalOpen(true);
  };

  const handleOpenEditGroupModal = (g: ResearchGroupItem) => {
    setEditingGroupId(g.id);
    setGroupName(g.name);
    setCaaeNumber(g.caae_number);
    setApprovalDate(g.ethics_approval_date || "");
    setTcleFile(null);
    setProfessionalsList(g.professionals.length > 0 ? g.professionals : DEFAULT_PROFESSIONALS);
    setIsGroupModalOpen(true);
  };

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

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName || !caaeNumber) {
      alert("Preencha o nome do grupo e o número CAAE.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id || null;

      let tclePath: string | null = null;
      if (tcleFile) {
        const fileExt = tcleFile.name.split(".").pop();
        const fileName = `tcle_${Date.now()}.${fileExt}`;
        const { data: uploadData } = await supabase.storage
          .from("tcle-documents")
          .upload(fileName, tcleFile, { upsert: true });

        tclePath = uploadData?.path || `tcle-docs/${fileName}`;
      }

      let activeGroupId = editingGroupId;

      if (editingGroupId) {
        // Atualizar
        const updatePayload: any = {
          name: groupName,
          caae_number: caaeNumber,
          ethics_approval_date: approvalDate || null,
        };
        if (tclePath) updatePayload.tcle_file_path = tclePath;

        const { error } = await supabase
          .from("research_groups")
          .update(updatePayload)
          .eq("id", editingGroupId);

        if (error) throw error;
      } else {
        // Criar Novo
        const newId = crypto.randomUUID();
        activeGroupId = newId;

        const { error } = await supabase.from("research_groups").insert({
          id: newId,
          name: groupName,
          caae_number: caaeNumber,
          ethics_approval_date: approvalDate || null,
          tcle_file_path: tclePath,
          created_by: currentUserId,
        });

        if (error) throw error;
      }

      // Sincroniza a equipe de profissionais no banco
      if (activeGroupId) {
        await supabase.from("group_professionals").delete().eq("group_id", activeGroupId);

        const validProfs = professionalsList.filter((p) => p.email.trim().length > 0);
        if (validProfs.length > 0) {
          const insertProfs = validProfs.map((p) => ({
            group_id: activeGroupId,
            name: p.name.trim() || p.email.split("@")[0],
            email: p.email.trim().toLowerCase(),
            role: p.role,
          }));

          await supabase.from("group_professionals").insert(insertProfs);
        }
      }

      setToastMessage({
        type: "success",
        text: editingGroupId ? `Grupo "${groupName}" atualizado!` : `Grupo "${groupName}" criado com sucesso!`,
      });

      setIsGroupModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error("[Grupos] Erro ao salvar grupo:", err);
      setToastMessage({
        type: "error",
        text: `Erro ao salvar grupo: ${err?.message || String(err)}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGroup = async (id: string, name: string) => {
    if (!confirm(`Deseja excluir o grupo "${name}"? Os participantes perderão o vínculo ético.`)) return;

    try {
      const { error } = await supabase.from("research_groups").delete().eq("id", id);
      if (error) throw error;

      setGroups((prev) => prev.filter((g) => g.id !== id));
      setToastMessage({
        type: "success",
        text: `Grupo "${name}" removido com sucesso.`,
      });
    } catch (err: any) {
      setToastMessage({
        type: "error",
        text: `Erro ao remover grupo: ${err?.message || String(err)}`,
      });
    }
  };

  // Handlers do Modal de Adicionar Participante Diretamente ao Grupo
  const handleOpenAddParticipantToGroup = (groupId: string) => {
    setTargetGroupIdForParticipant(groupId);
    setNewPartFirstName("");
    setNewPartLastName("");
    setNewPartPhone("");
    setNewPartEmail("");
    setNewPartGender("feminino");
    setNewPartPep("");
    setNewPartTcle(true);
    setIsParticipantModalOpen(true);
  };

  const handleSaveParticipantToGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartFirstName || !newPartLastName) {
      alert("Preencha o nome e sobrenome do participante.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id || null;
      const generatedId = `PAC-${Math.floor(1000 + Math.random() * 9000)}`;

      const { data, error } = await supabase
        .from("participants")
        .insert({
          auto_id: generatedId,
          first_name: newPartFirstName,
          last_name: newPartLastName,
          phone_number: newPartPhone || null,
          email: newPartEmail || null,
          grammatical_gender: newPartGender,
          group_id: targetGroupIdForParticipant,
          prontuario_pep: newPartPep || null,
          tcle_accepted: newPartTcle,
          created_by: currentUserId,
        })
        .select()
        .single();

      if (error) throw error;

      setToastMessage({
        type: "success",
        text: `Participante "${newPartFirstName} ${newPartLastName}" adicionado ao grupo!`,
      });

      setIsParticipantModalOpen(false);
      await loadData();
    } catch (err: any) {
      setToastMessage({
        type: "error",
        text: `Erro ao adicionar participante: ${err?.message || String(err)}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.caae_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      style={{ backgroundColor: "#F8F9FA" }}
      className="min-h-screen flex flex-col font-sans text-slate-800 antialiased selection:bg-[#006A55] selection:text-white"
    >
      <WorkspaceHeader
        currentTitle="Gestão de Grupos Éticos"
        badgeText="Conformidade CEP & UFRN"
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Toast Feedback */}
        {toastMessage && (
          <div
            className={cn(
              "p-4 rounded-2xl border backdrop-blur-xl shadow-lg flex items-center justify-between gap-3 animate-in fade-in duration-200",
              toastMessage.type === "success"
                ? "bg-emerald-50/95 border-emerald-300 text-emerald-950"
                : "bg-rose-50/95 border-rose-300 text-rose-950"
            )}
          >
            <div className="flex items-center gap-2.5">
              {toastMessage.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-[#006A55] shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span className="text-xs font-semibold">{toastMessage.text}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Banner Superior com Estatísticas & Botão Criar Grupo */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                style={{ backgroundColor: "rgba(0, 106, 85, 0.1)", color: "#006A55" }}
                className="w-9 h-9 rounded-2xl flex items-center justify-center font-bold shadow-xs"
              >
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Grupos de Pesquisa & Ética Clínica
              </h1>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl">
              Gerencie grupos de pesquisa com número CAAE/CEP, equipes de profissionais e participantes/pacientes vinculados.
            </p>
          </div>

          <button
            onClick={handleOpenNewGroupModal}
            style={{ backgroundColor: "#006A55" }}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-white text-xs font-bold shadow-lg shadow-[#006A55]/20 hover:opacity-90 active:scale-98 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Criar Novo Grupo
          </button>
        </div>

        {/* Busca */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome do grupo ou número CAAE..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#006A55] shadow-2xs"
          />
        </div>

        {/* Listagem de Grupos */}
        {loading ? (
          <div className="text-center py-16 bg-white/60 border border-slate-200 rounded-3xl">
            <Activity className="w-8 h-8 text-[#006A55] animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">Carregando grupos éticos...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-16 bg-white/80 border border-slate-200 rounded-3xl space-y-3">
            <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">Nenhum grupo ético cadastrado</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Cadastre um grupo de pesquisa com aprovação ética CEP/UFRN para organizar equipes e participantes.
            </p>
            <button
              onClick={handleOpenNewGroupModal}
              style={{ backgroundColor: "#006A55" }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md hover:opacity-90"
            >
              <Plus className="w-4 h-4" />
              Criar Primeiro Grupo
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredGroups.map((g) => {
              const activeTab = activeTabByGroup[g.id] || "participantes";

              return (
                <div
                  key={g.id}
                  className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-5"
                >
                  {/* Cabeçalho do Card do Grupo */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div className="flex items-start gap-3">
                      <div
                        style={{ backgroundColor: "rgba(0, 106, 85, 0.08)", color: "#006A55" }}
                        className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold border border-[#006A55]/20 shrink-0 mt-0.5"
                      >
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-bold text-slate-900 tracking-tight">
                            {g.name}
                          </h2>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Aprovado CEP/UFRN
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-1">
                          <span>
                            CAAE: <strong className="font-mono text-slate-700">{g.caae_number}</strong>
                          </span>
                          <span>&bull;</span>
                          <span>Aprovação: {new Date(g.ethics_approval_date).toLocaleDateString("pt-BR")}</span>
                          <span>&bull;</span>
                          <span>{g.participants.length} participante(s)</span>
                          <span>&bull;</span>
                          <span>{g.professionals.length} profissional(is)</span>
                        </p>
                      </div>
                    </div>

                    {/* Botões de Ação do Grupo */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenAddParticipantToGroup(g.id)}
                        style={{ backgroundColor: "rgba(0, 106, 85, 0.08)", color: "#006A55" }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-[#006A55]/20 hover:bg-[#006A55] hover:text-white transition-all cursor-pointer shadow-2xs"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>+ Participante</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditGroupModal(g)}
                        title="Editar Grupo"
                        className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteGroup(g.id, g.name)}
                        title="Excluir Grupo"
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Alternador de Abas Internas (Participantes vs Equipe) */}
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveTabByGroup((prev) => ({ ...prev, [g.id]: "participantes" }))
                      }
                      className={cn(
                        "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                        activeTab === "participantes"
                          ? "bg-[#006A55] text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Participantes Avaliados ({g.participants.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setActiveTabByGroup((prev) => ({ ...prev, [g.id]: "equipe" }))
                      }
                      className={cn(
                        "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                        activeTab === "equipe"
                          ? "bg-[#006A55] text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Equipe & Preceptores ({g.professionals.length})</span>
                    </button>
                  </div>

                  {/* Conteúdo da Aba 1: Participantes / Pacientes do Grupo */}
                  {activeTab === "participantes" && (
                    <div>
                      {g.participants.length === 0 ? (
                        <div className="text-center py-8 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                          <Users className="w-8 h-8 text-slate-300 mx-auto" />
                          <p className="text-xs text-slate-500">
                            Nenhum participante vinculado a este grupo ético ainda.
                          </p>
                          <button
                            type="button"
                            onClick={() => handleOpenAddParticipantToGroup(g.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#006A55] hover:underline"
                          >
                            <Plus className="w-3.5 h-3.5" /> Cadastrar Primeiro Participante
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {g.participants.map((p) => (
                            <div
                              key={p.id}
                              className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-[#006A55]/40 transition-all flex flex-col justify-between space-y-2.5"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <div className="font-bold text-xs text-slate-900 truncate">
                                    {p.first_name} {p.last_name}
                                  </div>
                                  {p.tcle_accepted ? (
                                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                                      TCLE OK
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0">
                                      Pendente
                                    </span>
                                  )}
                                </div>

                                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                                  <span>{p.auto_id}</span>
                                  {p.prontuario_pep && <span>&bull; {p.prontuario_pep}</span>}
                                </div>

                                {p.phone_number && (
                                  <div className="text-[11px] text-slate-600 flex items-center gap-1 mt-1">
                                    <Phone className="w-3 h-3 text-[#006A55]" />
                                    <span>{p.phone_number}</span>
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-1">
                                <Link
                                  href={`/workspace/captura?participantId=${p.id}`}
                                  style={{ backgroundColor: "rgba(0, 106, 85, 0.1)", color: "#006A55" }}
                                  className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-[11px] font-bold hover:bg-[#006A55] hover:text-white transition-all"
                                >
                                  <Mic className="w-3 h-3" />
                                  <span>Gravar</span>
                                </Link>

                                <Link
                                  href={`/workspace/participantes`}
                                  className="py-1 px-2 text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200"
                                >
                                  Detalhes
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Conteúdo da Aba 2: Equipe de Profissionais */}
                  {activeTab === "equipe" && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {g.professionals.map((prof, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2"
                          >
                            <div className="overflow-hidden">
                              <div className="font-bold text-xs text-slate-900 truncate">
                                {prof.name}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3 text-slate-400" />
                                <span>{prof.email}</span>
                              </div>
                            </div>

                            <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                              {prof.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL CRIAR / EDITAR GRUPO ÉTICO                          */}
      {/* ========================================================= */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative text-left max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setIsGroupModalOpen(false)}
              disabled={isSubmitting}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div
                style={{ backgroundColor: "rgba(0, 106, 85, 0.1)", color: "#006A55" }}
                className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0"
              >
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {editingGroupId ? "Editar Grupo de Pesquisa & Ética" : "Novo Grupo de Pesquisa & Ética"}
                </h2>
                <p className="text-xs text-slate-500">
                  Defina o número CAAE, termo TCLE e equipe autorizada.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveGroup} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome do Grupo / Laboratório *</label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Ex: Laboratório de Neurociência & Linguagem (UFRN)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#006A55] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nº do Certificado CAAE / CEP *</label>
                  <input
                    type="text"
                    required
                    value={caaeNumber}
                    onChange={(e) => setCaaeNumber(e.target.value)}
                    placeholder="Ex: 58291022.4.0000.5537"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#006A55] focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data de Aprovação Ética CEP</label>
                  <input
                    type="date"
                    value={approvalDate}
                    onChange={(e) => setApprovalDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#006A55] focus:bg-white"
                  />
                </div>
              </div>

              {/* Upload de TCLE */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Documento TCLE Oficial (PDF)</label>
                <div className="border border-dashed border-slate-300 rounded-2xl p-4 text-center bg-slate-50 hover:bg-emerald-50/40 transition-colors">
                  <input
                    type="file"
                    id="tcle_file_upload"
                    accept=".pdf"
                    onChange={(e) => setTcleFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label htmlFor="tcle_file_upload" className="cursor-pointer space-y-1 block">
                    <UploadCloud className="w-6 h-6 text-slate-400 mx-auto" />
                    <span className="text-xs font-bold text-slate-800 block">
                      {tcleFile ? tcleFile.name : "Clique para anexar o PDF do TCLE aprovado"}
                    </span>
                    <span className="text-[10px] text-slate-500 block">Documento de consentimento CEP</span>
                  </label>
                </div>
              </div>

              {/* Equipe de Profissionais */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Profissionais da Equipe</h4>
                    <p className="text-[11px] text-slate-500">Orientadores, preceptores e pesquisadores autorizados.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddProfessionalRow}
                    className="text-[11px] font-bold text-[#006A55] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Membro
                  </button>
                </div>

                <div className="space-y-2">
                  {professionalsList.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => handleUpdateProfessional(idx, "name", e.target.value)}
                        placeholder="Nome do Profissional"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#006A55]"
                      />
                      <input
                        type="email"
                        value={p.email}
                        onChange={(e) => handleUpdateProfessional(idx, "email", e.target.value)}
                        placeholder="E-mail"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#006A55]"
                      />
                      <select
                        value={p.role}
                        onChange={(e) => handleUpdateProfessional(idx, "role", e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#006A55]"
                      >
                        <option value="coordenador">Coordenador</option>
                        <option value="orientador">Orientador</option>
                        <option value="colaborador">Colaborador</option>
                      </select>
                      {professionalsList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveProfessionalRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Botões do Modal */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ backgroundColor: "#006A55" }}
                  className="px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md shadow-[#006A55]/20 hover:opacity-90 active:scale-98 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {editingGroupId ? "Salvar Alterações" : "Criar Grupo"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL ADICIONAR PARTICIPANTE DIRETO AO GRUPO              */}
      {/* ========================================================= */}
      {isParticipantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setIsParticipantModalOpen(false)}
              disabled={isSubmitting}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div
                style={{ backgroundColor: "rgba(0, 106, 85, 0.1)", color: "#006A55" }}
                className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0"
              >
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Adicionar Participante ao Grupo</h3>
                <p className="text-xs text-slate-500">Cadastre o participante vinculado a este protocolo ético.</p>
              </div>
            </div>

            <form onSubmit={handleSaveParticipantToGroup} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Primeiro Nome *</label>
                  <input
                    type="text"
                    required
                    value={newPartFirstName}
                    onChange={(e) => setNewPartFirstName(e.target.value)}
                    placeholder="Ex: Maya"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#006A55]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sobrenome *</label>
                  <input
                    type="text"
                    required
                    value={newPartLastName}
                    onChange={(e) => setNewPartLastName(e.target.value)}
                    placeholder="Ex: Elsangedy"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#006A55]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefone</label>
                  <input
                    type="tel"
                    value={newPartPhone}
                    onChange={(e) => setNewPartPhone(e.target.value)}
                    placeholder="Ex: (84) 99888-7766"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#006A55]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={newPartEmail}
                    onChange={(e) => setNewPartEmail(e.target.value)}
                    placeholder="paciente@email.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#006A55]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gênero</label>
                  <select
                    value={newPartGender}
                    onChange={(e) => setNewPartGender(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#006A55]"
                  >
                    <option value="feminino">Feminino</option>
                    <option value="masculino">Masculino</option>
                    <option value="neutro">Neutro</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prontuário PEP</label>
                  <input
                    type="text"
                    value={newPartPep}
                    onChange={(e) => setNewPartPep(e.target.value)}
                    placeholder="PEP-2026-0087"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#006A55]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={newPartTcle}
                    onChange={(e) => setNewPartTcle(e.target.checked)}
                    className="rounded text-[#006A55] focus:ring-[#006A55] w-4 h-4"
                  />
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#006A55]" />
                    TCLE Assinado & Conforme (CEP)
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsParticipantModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ backgroundColor: "#006A55" }}
                  className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmitting ? "Salvando..." : "Adicionar ao Grupo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
