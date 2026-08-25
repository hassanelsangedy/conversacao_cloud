"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Radio,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Activity,
  UserCheck,
  Lock,
  Mail,
  User,
  ArrowRight,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface InvitationData {
  id: string;
  group_id: string;
  group_name: string;
  caae_number?: string;
  role: string;
  expires_at: string;
}

export default function ConvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [invalidReason, setInvalidReason] = useState<string>("");
  const [invitation, setInvitation] = useState<InvitationData | null>(null);

  // Form State
  const [fullName, setFullName] = useState("");
  const [professionalRegistration, setProfessionalRegistration] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Valida o token ao carregar
  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setIsValid(false);
        setInvalidReason("Token de convite não encontrado.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/invitations/validate?token=${token}`);
        const data = await res.json();

        if (res.ok && data.valid && data.invitation) {
          setIsValid(true);
          setInvitation(data.invitation);
        } else {
          setIsValid(false);
          setInvalidReason(data.reason || "Convite inválido ou expirado.");
        }
      } catch (err: any) {
        setIsValid(false);
        setInvalidReason("Erro ao conectar ao servidor para validar o convite.");
      } finally {
        setLoading(false);
      }
    }

    validateToken();
  }, [token]);

  // 2. Finalização do Cadastro e Vínculo ao Grupo
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMessage("Por favor, preencha todos os campos obrigatórios (*).");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("A confirmação de senha não confere.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Cria a conta no Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
            professional_registration: professionalRegistration.trim() || null,
          },
        },
      });

      if (signUpError) {
        // Se a conta já existe, tenta fazer o login
        if (signUpError.message.toLowerCase().includes("already registered")) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password,
          });

          if (signInError) {
            throw new Error("Este e-mail já está cadastrado. Insira a senha correta da sua conta para aceitar o convite.");
          }
        } else {
          throw signUpError;
        }
      }

      // Obtém o user_id autenticado
      const { data: authUserData } = await supabase.auth.getUser();
      const currentUserId = authUserData?.user?.id || signUpData?.user?.id || null;

      // 2. Aceita o convite e vincula no group_professionals
      const acceptRes = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token,
          fullName: fullName.trim(),
          professionalRegistration: professionalRegistration.trim(),
          email: email.trim(),
          userId: currentUserId,
        }),
      });

      const acceptData = await acceptRes.json();
      if (!acceptRes.ok || !acceptData.success) {
        throw new Error(acceptData.error || "Erro ao vincular perfil ao grupo.");
      }

      // 3. Realiza login explícito para garantir sessão ativa
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      setSuccessMessage("Cadastro concluído com sucesso! Redirecionando para o ambiente de trabalho...");

      // 4. Redireciona diretamente para a Captura de Áudio
      setTimeout(() => {
        window.location.replace("/workspace/captura");
      }, 1000);
    } catch (err: any) {
      console.error("[Onboarding Error]:", err);
      setErrorMessage(err?.message || "Erro durante o cadastro e aceitação do convite.");
      setIsSubmitting(false);
    }
  };

  const roleLabel =
    invitation?.role === "coordenador"
      ? "Co-Orientador / Gestor"
      : invitation?.role === "orientador"
      ? "Orientador / Preceptor"
      : "Pesquisador / Residente";

  return (
    <main
      style={{ backgroundColor: "#F8F9FA" }}
      className="min-h-screen flex items-center justify-center p-4 sm:p-6 font-sans text-slate-800 antialiased selection:bg-[#006A55] selection:text-white"
    >
      <div className="w-full max-w-lg">
        {loading ? (
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200 p-10 rounded-3xl shadow-sm text-center space-y-3">
            <Activity className="w-8 h-8 text-[#006A55] animate-spin mx-auto" />
            <h2 className="text-sm font-bold text-slate-900">Validando convite seguro...</h2>
            <p className="text-xs text-slate-500">Aguarde enquanto verificamos as credenciais do grupo.</p>
          </div>
        ) : !isValid ? (
          /* Card de Convite Inválido / Expirado */
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200 p-8 rounded-3xl shadow-lg text-center space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-xs">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900">Convite Não Disponível</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                {invalidReason}
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/login"
                style={{ backgroundColor: "#006A55" }}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow-md shadow-[#006A55]/20 hover:opacity-90 transition-all cursor-pointer"
              >
                <span>Ir para a Página de Login</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          /* Formulário de Onboarding & Cadastro Seguro */
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 animate-in fade-in">
            {/* Header com Identidade Visual */}
            <div className="flex flex-col items-center text-center space-y-2">
              <div
                style={{ backgroundColor: "#006A55" }}
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shadow-[#006A55]/20"
              >
                <Radio className="w-6 h-6 animate-pulse" />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-slate-900">Conversação</span>
                <span
                  style={{ color: "#006A55", backgroundColor: "rgba(0, 106, 85, 0.08)" }}
                  className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border border-[#006A55]/20"
                >
                  Cloud
                </span>
              </div>

              {/* Informação do Convite do Grupo */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3.5 w-full text-left space-y-1.5 mt-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#006A55]">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Você foi convidado para participar do grupo:</span>
                </div>
                <div className="font-bold text-sm text-slate-900 pl-5">
                  {invitation?.group_name}
                </div>
                <div className="text-[11px] text-slate-600 pl-5 flex flex-wrap items-center gap-2 font-mono">
                  <span>CAAE: {invitation?.caae_number}</span>
                  <span>&bull;</span>
                  <span className="text-emerald-800 font-bold uppercase">{roleLabel}</span>
                </div>
              </div>
            </div>

            {/* Alertas */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span className="leading-tight font-medium">{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#006A55] mt-0.5" />
                <span className="leading-tight font-bold">{successMessage}</span>
              </div>
            )}

            {/* Formulário de Cadastro */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome Completo *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: Dra. Juliana Medeiros"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#006A55] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Registro Profissional / Matrícula UFRN <span className="font-normal text-slate-400">(Opcional)</span>
                </label>
                <input
                  type="text"
                  value={professionalRegistration}
                  onChange={(e) => setProfessionalRegistration(e.target.value)}
                  placeholder="Ex: CRFa 4-12345 / Matrícula"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#006A55] focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">E-mail Profissional *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@ufrn.br ou clinica.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#006A55] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Senha de Acesso *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#006A55] focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Confirmar Senha *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita sua senha"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#006A55] focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ backgroundColor: "#006A55" }}
                  className="w-full py-3 px-4 rounded-xl text-white text-xs font-bold shadow-md shadow-[#006A55]/20 hover:opacity-90 active:scale-98 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" />
                      Criando conta e ativando acesso...
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      Aceitar Convite e Entrar no Workspace
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-2 text-slate-400 text-[11px]">
                Já possui conta?{" "}
                <Link href="/login" className="text-[#006A55] font-bold hover:underline">
                  Faça login aqui
                </Link>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
