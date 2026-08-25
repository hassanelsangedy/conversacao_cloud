"use client";

import React, { useState, useEffect } from "react";
import {
  Mail,
  Link as LinkIcon,
  Copy,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  Users,
  Activity,
  Trash2,
  Clock,
  Send,
  Plus,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface GroupOption {
  id: string;
  name: string;
  caae_number?: string;
}

interface InvitationItem {
  id: string;
  group_id: string;
  group_name: string;
  role: string;
  invite_token: string;
  invite_url: string;
  expires_at: string;
  status: "pendente" | "aceito" | "expirado" | "revogado";
  created_at: string;
}

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: GroupOption[];
  defaultGroupId?: string;
}

export function InviteMemberModal({
  isOpen,
  onClose,
  groups,
  defaultGroupId,
}: InviteMemberModalProps) {
  const supabase = createClient();
  const [selectedGroupId, setSelectedGroupId] = useState<string>(defaultGroupId || groups[0]?.id || "");
  const [selectedRole, setSelectedRole] = useState<string>("colaborador");
  const [expiresInDays, setExpiresInDays] = useState<number>(7);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<InvitationItem | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const [invitationsList, setInvitationsList] = useState<InvitationItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (defaultGroupId) {
      setSelectedGroupId(defaultGroupId);
    } else if (groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [defaultGroupId, groups, selectedGroupId]);

  const loadInvitations = async (gId: string) => {
    if (!gId) return;
    try {
      setLoadingList(true);
      const res = await fetch(`/api/invitations/list?groupId=${gId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setInvitationsList(data.invitations || []);
      }
    } catch (err) {
      console.warn("Erro ao buscar convites:", err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (isOpen && selectedGroupId) {
      loadInvitations(selectedGroupId);
    }
  }, [isOpen, selectedGroupId]);

  if (!isOpen) return null;

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId) {
      alert("Selecione um grupo de pesquisa.");
      return;
    }

    setIsGenerating(true);
    setFeedbackToast(null);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id || null;

      const res = await fetch("/api/invitations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: selectedGroupId,
          role: selectedRole,
          expiresInDays,
          inviterId: currentUserId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao gerar convite.");
      }

      setGeneratedInvite(data.invitation);
      setFeedbackToast({
        type: "success",
        text: "Link de convite gerado com sucesso!",
      });

      await loadInvitations(selectedGroupId);
    } catch (err: any) {
      setFeedbackToast({
        type: "error",
        text: err?.message || "Falha ao gerar link de convite.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async (url: string, token: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setFeedbackToast({
        type: "success",
        text: "Link copiado para a área de transferência!",
      });
      setTimeout(() => setCopiedToken(null), 3000);
    } catch {
      alert("Copie o link manualmente: " + url);
    }
  };

  const handleRevokeInvite = async (invitationId: string) => {
    if (!confirm("Deseja revogar este link de convite? Novos acessos através dele serão bloqueados.")) return;

    try {
      const res = await fetch("/api/invitations/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });

      if (res.ok) {
        setFeedbackToast({
          type: "success",
          text: "Convite revogado com sucesso.",
        });
        await loadInvitations(selectedGroupId);
      }
    } catch (err) {
      alert("Erro ao revogar convite.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl relative text-left max-h-[90vh] overflow-y-auto custom-scrollbar space-y-6">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho */}
        <div className="flex items-center gap-3">
          <div
            style={{ backgroundColor: "rgba(0, 106, 85, 0.1)", color: "#006A55" }}
            className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold shrink-0 shadow-xs"
          >
            <LinkIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Convidar Membro / Gerar Link de Acesso
            </h2>
            <p className="text-xs text-slate-500">
              Gere um link seguro para novos pesquisadores e preceptores se cadastrarem no grupo.
            </p>
          </div>
        </div>

        {/* Feedback Toast */}
        {feedbackToast && (
          <div
            className={cn(
              "p-3 rounded-xl border flex items-center justify-between gap-2 text-xs font-semibold animate-in fade-in",
              feedbackToast.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-rose-50 border-rose-200 text-rose-900"
            )}
          >
            <div className="flex items-center gap-2">
              {feedbackToast.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-[#006A55] shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedbackToast.text}</span>
            </div>
            <button
              onClick={() => setFeedbackToast(null)}
              className="text-slate-400 hover:text-slate-700 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Formulário de Criação de Link de Convite */}
        <form onSubmit={handleGenerateInvite} className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4 text-xs">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-[#006A55]" />
            Configurar Novo Link de Convite
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block font-bold text-slate-700 mb-1">Grupo de Pesquisa</label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#006A55]"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Papel / Função no Grupo</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#006A55]"
              >
                <option value="colaborador">Pesquisador / Residente</option>
                <option value="orientador">Orientador / Preceptor</option>
                <option value="coordenador">Co-Orientador / Gestor</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Validade do Link</label>
              <select
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(parseInt(e.target.value, 10))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#006A55]"
              >
                <option value={7}>7 dias (Padrão)</option>
                <option value={15}>15 dias</option>
                <option value={30}>30 dias</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={isGenerating}
              style={{ backgroundColor: "#006A55" }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold shadow-md shadow-[#006A55]/20 hover:opacity-90 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  Gerando Link...
                </>
              ) : (
                <>
                  <LinkIcon className="w-4 h-4" />
                  Gerar Link de Convite
                </>
              )}
            </button>
          </div>
        </form>

        {/* Link Recém Gerado com Botão de Copiar */}
        {generatedInvite && (
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-300 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[#006A55] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Link de Convite Pronto para Compartilhamento:
              </span>
              <span className="text-[10px] font-mono text-emerald-800 bg-white/80 px-2 py-0.5 rounded border border-emerald-200">
                Expira em {new Date(generatedInvite.expires_at).toLocaleDateString("pt-BR")}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={generatedInvite.invite_url}
                className="flex-1 bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleCopyLink(generatedInvite.invite_url, generatedInvite.invite_token)}
                style={{ backgroundColor: "#006A55" }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md hover:opacity-90 transition-all cursor-pointer shrink-0"
              >
                {copiedToken === generatedInvite.invite_token ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar Link
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Lista de Convites Ativos & Histórico */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs">
            <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#006A55]" />
              Convites Ativos do Grupo ({invitationsList.length})
            </h3>
            <button
              type="button"
              onClick={() => loadInvitations(selectedGroupId)}
              className="text-[11px] text-[#006A55] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={cn("w-3 h-3", loadingList && "animate-spin")} />
              Atualizar
            </button>
          </div>

          {loadingList ? (
            <div className="text-center py-6 text-xs text-slate-400">
              <Activity className="w-5 h-5 animate-spin mx-auto mb-1 text-[#006A55]" />
              Carregando convites...
            </div>
          ) : invitationsList.length === 0 ? (
            <div className="text-center py-6 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-500">
              Nenhum convite ativo gerado para este grupo ainda.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {invitationsList.map((inv) => {
                const isPendente = inv.status === "pendente";

                return (
                  <div
                    key={inv.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="overflow-hidden space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 capitalize">
                          {inv.role === "colaborador"
                            ? "Pesquisador / Residente"
                            : inv.role === "orientador"
                            ? "Orientador / Preceptor"
                            : "Coordenador / Gestor"}
                        </span>
                        <span
                          className={cn(
                            "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                            inv.status === "pendente"
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : inv.status === "aceito"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-slate-200 text-slate-600"
                          )}
                        >
                          {inv.status}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-500 font-mono truncate">
                        {inv.invite_url}
                      </div>

                      <div className="text-[10px] text-slate-400">
                        Expira em: {new Date(inv.expires_at).toLocaleDateString("pt-BR")}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isPendente && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCopyLink(inv.invite_url, inv.invite_token)}
                            className="p-1.5 text-[#006A55] hover:bg-emerald-50 rounded-lg border border-slate-200 transition-colors"
                            title="Copiar Link"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRevokeInvite(inv.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                            title="Revogar Convite"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
