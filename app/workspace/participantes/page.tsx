"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Search,
  Plus,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Trash2,
  X,
  Mic,
  Calendar,
  Tag,
  Check,
  FileText,
  Activity,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { WorkspaceHeader } from "@/components/workspace-header";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface CustomAttribute {
  key: string;
  value: string;
}

interface ParticipantItem {
  id: string;
  auto_id: string;
  prontuario_pep?: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  email?: string;
  grammatical_gender?: "masculino" | "feminino" | "neutro";
  group_id?: string;
  tcle_accepted?: boolean;
  metadata?: {
    custom_attributes?: CustomAttribute[];
    notes?: string;
    birth_date?: string;
    occupation?: string;
    primary_diagnosis?: string;
  } | null;
  created_at: string;
  research_groups?: {
    id: string;
    name: string;
    caae_number?: string;
  } | null;
}

interface ResearchGroupOption {
  id: string;
  name: string;
  caae_number?: string;
}

export default function ParticipantesPage() {
  const supabase = createClient();

  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [groups, setGroups] = useState<ResearchGroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState("all");

  // Modal State (Cadastro e Edição)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<"masculino" | "feminino" | "neutro">("feminino");
  const [groupId, setGroupId] = useState<string>("");
  const [prontuarioPep, setProntuarioPep] = useState("");
  const [tcleAccepted, setTcleAccepted] = useState(true);
  const [notes, setNotes] = useState("");
  const [customFields, setCustomFields] = useState<CustomAttribute[]>([
    { key: "", value: "" },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);

      // 1. Busca Grupos
      const { data: grpData } = await supabase
        .from("research_groups")
        .select("id, name, caae_number")
        .order("name", { ascending: true });

      if (grpData) {
        setGroups(grpData);
      }

      // 2. Busca Participantes com Join do Grupo
      const { data: partData, error: partError } = await supabase
        .from("participants")
        .select("*, research_groups(*)")
        .order("created_at", { ascending: false });

      if (partError) throw partError;

      if (partData) {
        setParticipants(partData);
      }
    } catch (err: any) {
      console.error("[Participantes] Erro ao carregar dados:", err);
      setToastMessage({
        type: "error",
        text: `Erro ao carregar participantes: ${err?.message || String(err)}`,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenNewModal = () => {
    setEditingId(null);
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setGender("feminino");
    setGroupId(groups[0]?.id || "");
    setProntuarioPep("");
    setTcleAccepted(true);
    setNotes("");
    setCustomFields([{ key: "", value: "" }]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: ParticipantItem) => {
    setEditingId(p.id);
    setFirstName(p.first_name || "");
    setLastName(p.last_name || "");
    setPhone(p.phone_number || "");
    setEmail(p.email || "");
    setGender(p.grammatical_gender || "feminino");
    setGroupId(p.group_id || groups[0]?.id || "");
    setProntuarioPep(p.prontuario_pep || "");
    setTcleAccepted(Boolean(p.tcle_accepted));
    setNotes(p.metadata?.notes || "");

    const existingCustom = p.metadata?.custom_attributes || [];
    setCustomFields(
      existingCustom.length > 0 ? existingCustom : [{ key: "", value: "" }]
    );

    setIsModalOpen(true);
  };

  const handleAddCustomField = () => {
    setCustomFields((prev) => [...prev, { key: "", value: "" }]);
  };

  const handleRemoveCustomField = (index: number) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCustomFieldChange = (index: number, field: "key" | "value", val: string) => {
    setCustomFields((prev) => {
      const next = [...prev];
      next[index][field] = val;
      return next;
    });
  };

  const handleSaveParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName) {
      alert("Por favor, preencha o nome e sobrenome.");
      return;
    }

    setIsSubmitting(true);
    try {
      const validCustomAttributes = customFields.filter(
        (f) => f.key.trim().length > 0 && f.value.trim().length > 0
      );

      const metadataPayload = {
        custom_attributes: validCustomAttributes,
        notes: notes.trim() || undefined,
      };

      if (editingId) {
        // Atualização
        const { error } = await supabase
          .from("participants")
          .update({
            first_name: firstName,
            last_name: lastName,
            phone_number: phone || null,
            email: email || null,
            grammatical_gender: gender,
            group_id: groupId || null,
            prontuario_pep: prontuarioPep || null,
            tcle_accepted: tcleAccepted,
            metadata: metadataPayload,
          })
          .eq("id", editingId);

        if (error) throw error;

        setToastMessage({
          type: "success",
          text: `Participante "${firstName} ${lastName}" atualizado com sucesso!`,
        });
      } else {
        // Novo Cadastro
        const { data: authData } = await supabase.auth.getUser();
        const currentUserId = authData?.user?.id;

        const generatedId = `PAC-${Math.floor(1000 + Math.random() * 9000)}`;

        const { error } = await supabase.from("participants").insert({
          auto_id: generatedId,
          first_name: firstName,
          last_name: lastName,
          phone_number: phone || null,
          email: email || null,
          grammatical_gender: gender,
          group_id: groupId || null,
          prontuario_pep: prontuarioPep || null,
          tcle_accepted: tcleAccepted,
          metadata: metadataPayload,
          created_by: currentUserId || null,
        });

        if (error) throw error;

        setToastMessage({
          type: "success",
          text: `Participante "${firstName} ${lastName}" cadastrado com sucesso!`,
        });
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error("[Participantes] Erro ao salvar:", err);
      setToastMessage({
        type: "error",
        text: `Erro ao salvar participante: ${err?.message || String(err)}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteParticipant = async (id: string, name: string) => {
    if (!confirm(`Tem certeza de que deseja excluir o cadastro de "${name}"?`)) return;

    try {
      const { error } = await supabase.from("participants").delete().eq("id", id);
      if (error) throw error;

      setParticipants((prev) => prev.filter((p) => p.id !== id));
      setToastMessage({
        type: "success",
        text: `Participante "${name}" removido com sucesso.`,
      });
    } catch (err: any) {
      setToastMessage({
        type: "error",
        text: `Erro ao excluir participante: ${err?.message || String(err)}`,
      });
    }
  };

  const filteredParticipants = participants.filter((p) => {
    const term = search.toLowerCase();
    const matchesSearch =
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(term) ||
      p.auto_id.toLowerCase().includes(term) ||
      (p.prontuario_pep && p.prontuario_pep.toLowerCase().includes(term)) ||
      (p.email && p.email.toLowerCase().includes(term)) ||
      (p.phone_number && p.phone_number.includes(term));

    const matchesGroup =
      selectedGroupFilter === "all" || p.group_id === selectedGroupFilter;

    return matchesSearch && matchesGroup;
  });

  const totalWithTcle = participants.filter((p) => p.tcle_accepted).length;

  return (
    <div
      style={{ backgroundColor: "#F8F9FA" }}
      className="min-h-screen flex flex-col font-sans text-slate-800 antialiased selection:bg-[#006A55] selection:text-white"
    >
      <WorkspaceHeader
        currentTitle="Gestão de Participantes"
        badgeText="Registro Clínico & Ético"
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Toast Notificação */}
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

        {/* Banner Superior com Estatísticas & Botão de Cadastro */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                style={{ backgroundColor: "rgba(0, 106, 85, 0.1)", color: "#006A55" }}
                className="w-9 h-9 rounded-2xl flex items-center justify-center font-bold shadow-xs"
              >
                <Users className="w-5 h-5" />
              </span>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Participantes & Pacientes
              </h1>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl">
              Gerencie cadastros, dados de contato, vínculo a grupos éticos, consentimento TCLE e informações anamnésicas personalizadas.
            </p>
          </div>

          <button
            onClick={handleOpenNewModal}
            style={{ backgroundColor: "#006A55" }}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-white text-xs font-bold shadow-lg shadow-[#006A55]/20 hover:opacity-90 active:scale-98 transition-all cursor-pointer whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" />
            Cadastrar Novo Participante
          </button>
        </div>

        {/* Métricas Rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-[#006A55] flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{participants.length}</div>
              <div className="text-[11px] text-slate-500 font-medium">Total de Participantes</div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{totalWithTcle}</div>
              <div className="text-[11px] text-slate-500 font-medium">TCLE Ético Conforme</div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center font-bold">
              <Tag className="w-5 h-5 text-[#006A55]" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{groups.length}</div>
              <div className="text-[11px] text-slate-500 font-medium">Grupos Éticos Disponíveis</div>
            </div>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, ID, prontuário, telefone ou email..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#006A55] shadow-2xs"
            />
          </div>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <label className="text-xs text-slate-500 font-semibold whitespace-nowrap">Grupo:</label>
            <select
              value={selectedGroupFilter}
              onChange={(e) => setSelectedGroupFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#006A55] shadow-2xs cursor-pointer"
            >
              <option value="all">Todos os Grupos Éticos</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Lista de Cards de Participantes */}
        {loading ? (
          <div className="text-center py-16 bg-white/60 border border-slate-200 rounded-3xl">
            <Activity className="w-8 h-8 text-[#006A55] animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">Carregando lista de participantes...</p>
          </div>
        ) : filteredParticipants.length === 0 ? (
          <div className="text-center py-16 bg-white/80 border border-slate-200 rounded-3xl space-y-3">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">Nenhum participante encontrado</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Cadastre um novo paciente para associar a gravações e relatórios clínicos estruturados.
            </p>
            <button
              onClick={handleOpenNewModal}
              style={{ backgroundColor: "#006A55" }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md hover:opacity-90"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Participante
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredParticipants.map((p) => {
              const customAttrs = p.metadata?.custom_attributes || [];

              return (
                <div
                  key={p.id}
                  className="bg-white border border-slate-200/90 hover:border-[#006A55]/40 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    {/* Header do Card */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          style={{ backgroundColor: "rgba(0, 106, 85, 0.08)", color: "#006A55" }}
                          className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm border border-[#006A55]/20 shrink-0"
                        >
                          {p.first_name[0]}
                          {p.last_name[0]}
                        </div>
                        <div className="overflow-hidden">
                          <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#006A55] transition-colors truncate">
                            {p.first_name} {p.last_name}
                          </h3>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                            <span>{p.auto_id}</span>
                            {p.prontuario_pep && <span>&bull; {p.prontuario_pep}</span>}
                          </div>
                        </div>
                      </div>

                      {p.tcle_accepted ? (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shrink-0">
                          <ShieldCheck className="w-3 h-3 text-[#006A55]" /> TCLE OK
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                          Sem TCLE
                        </span>
                      )}
                    </div>

                    {/* Grupo Vinculado */}
                    {p.research_groups && (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Grupo de Pesquisa / Ético</div>
                        <div className="font-semibold text-slate-800 truncate mt-0.5">
                          {p.research_groups.name}
                        </div>
                        {p.research_groups.caae_number && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            CAAE: {p.research_groups.caae_number}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Contatos (Telefone e Email) */}
                    <div className="space-y-1.5 text-xs text-slate-600">
                      {p.phone_number ? (
                        <a
                          href={`tel:${p.phone_number}`}
                          className="flex items-center gap-2 hover:text-[#006A55] transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 text-[#006A55]" />
                          <span>{p.phone_number}</span>
                        </a>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Phone className="w-3.5 h-3.5" />
                          <span className="italic text-[11px]">Telefone não informado</span>
                        </div>
                      )}

                      {p.email ? (
                        <a
                          href={`mailto:${p.email}`}
                          className="flex items-center gap-2 hover:text-[#006A55] transition-colors truncate"
                        >
                          <Mail className="w-3.5 h-3.5 text-[#006A55]" />
                          <span className="truncate">{p.email}</span>
                        </a>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Mail className="w-3.5 h-3.5" />
                          <span className="italic text-[11px]">E-mail não informado</span>
                        </div>
                      )}
                    </div>

                    {/* Informações Customizadas / Metadados */}
                    {customAttrs.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                        {customAttrs.map((attr, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200"
                          >
                            <strong>{attr.key}:</strong> {attr.value}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Notas Livres */}
                    {p.metadata?.notes && (
                      <p className="text-[11px] text-slate-500 italic bg-amber-50/60 p-2 rounded-xl border border-amber-200/50 line-clamp-2">
                        "{p.metadata.notes}"
                      </p>
                    )}
                  </div>

                  {/* Ações do Card */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Link
                      href={`/workspace/captura?participantId=${p.id}`}
                      style={{ backgroundColor: "rgba(0, 106, 85, 0.08)", color: "#006A55" }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border border-[#006A55]/20 hover:bg-[#006A55] hover:text-white transition-all cursor-pointer shadow-2xs"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>Gravar Sessão</span>
                    </Link>

                    <button
                      onClick={() => handleOpenEditModal(p)}
                      title="Editar Participante"
                      className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() =>
                        handleDeleteParticipant(p.id, `${p.first_name} ${p.last_name}`)
                      }
                      title="Excluir Participante"
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL DE CADASTRO / EDIÇÃO DE PARTICIPANTE                */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative text-left max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setIsModalOpen(false)}
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
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {editingId ? "Editar Cadastro de Participante" : "Cadastrar Novo Participante"}
                </h2>
                <p className="text-xs text-slate-500">
                  Insira as informações de identificação, contato, ética e campos adicionais.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveParticipant} className="space-y-4 text-xs">
              {/* Nome e Sobrenome */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Primeiro Nome *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ex: Maya"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#006A55] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sobrenome *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ex: Furukava Elsangedy"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#006A55] focus:bg-white"
                  />
                </div>
              </div>

              {/* Contatos: Telefone e Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Número de Telefone / WhatsApp</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex: (84) 99888-7766"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#006A55] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ex: paciente@email.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#006A55] focus:bg-white"
                  />
                </div>
              </div>

              {/* Gênero e Vínculo a Grupo Ético */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gênero Gramatical (Pronome)</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#006A55] focus:bg-white"
                  >
                    <option value="feminino">Feminino (a paciente / ela)</option>
                    <option value="masculino">Masculino (o paciente / ele)</option>
                    <option value="neutro">Neutro (o participante)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vincular ao Grupo de Pesquisa / Ético</label>
                  <select
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#006A55] focus:bg-white"
                  >
                    <option value="">Nenhum / Geral</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} {g.caae_number && `(${g.caae_number})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Prontuário PEP e TCLE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nº Prontuário / PEP (Opcional)</label>
                  <input
                    type="text"
                    value={prontuarioPep}
                    onChange={(e) => setProntuarioPep(e.target.value)}
                    placeholder="Ex: PEP-2026-0087"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#006A55] focus:bg-white"
                  />
                </div>

                <div className="pt-5">
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={tcleAccepted}
                      onChange={(e) => setTcleAccepted(e.target.checked)}
                      className="rounded text-[#006A55] focus:ring-[#006A55] w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#006A55]" />
                      TCLE Assinado & Conforme (CEP/UFRN)
                    </span>
                  </label>
                </div>
              </div>

              {/* Seção de Informações Adicionais Customizáveis */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Outras Informações de Interesse</h4>
                    <p className="text-[11px] text-slate-500">
                      Adicione campos personalizados (ex: Profissão, Diagnóstico Prévio, Medicações).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomField}
                    className="text-[11px] font-bold text-[#006A55] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Campo
                  </button>
                </div>

                <div className="space-y-2">
                  {customFields.map((field, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={field.key}
                        onChange={(e) => handleCustomFieldChange(idx, "key", e.target.value)}
                        placeholder="Nome do Campo (ex: Profissão)"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#006A55]"
                      />
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) => handleCustomFieldChange(idx, "value", e.target.value)}
                        placeholder="Valor (ex: Arquiteta)"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#006A55]"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomField(idx)}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Observações Clínicas / Anamnésicas Gerais
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Histórico clínico relevante, restrições ou pontos de atenção..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#006A55] resize-none"
                  />
                </div>
              </div>

              {/* Botões do Modal */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                      {editingId ? "Salvar Alterações" : "Concluir Cadastro"}
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
