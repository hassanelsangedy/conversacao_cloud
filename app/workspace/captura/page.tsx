"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Mic,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Users,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronDown,
  Search,
  Plus,
  Volume2,
  Radio,
  X,
  FileCheck,
  Activity,
  BookOpen,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// --- Constantes Padrão de Chaves Estrangeiras (UUIDs do Supabase) ---
const DEFAULT_GROUP_ID = "a1111111-1111-1111-1111-111111111111";
const DEFAULT_TEMPLATE_ID = "b1111111-1111-1111-1111-111111111111";
const DEFAULT_PARTICIPANT_ID = "c1111111-1111-1111-1111-111111111111";

interface Participant {
  id: string;
  auto_id: string;
  prontuario_pep?: string;
  first_name: string;
  last_name: string;
  grammatical_gender?: "masculino" | "feminino" | "neutro";
  tcle_accepted?: boolean;
}

interface ReportTemplate {
  id: string;
  title: string;
  description?: string;
  detail_level?: "conciso" | "equilibrio" | "detalhado";
  tone_style?: "clinico" | "narrativo" | "juvenil";
  sections?: any;
}

interface SessionRecord {
  id: string;
  session_title: string;
  participant_name: string;
  participant_id_str: string;
  duration_seconds: number;
  status: "pendente" | "em_rascunho" | "processando" | "concluido" | "validado" | "descartado";
  nature: "livre" | "estruturada" | "semi-estruturada";
  created_at: string;
  template_title: string;
}

const FALLBACK_PARTICIPANTS: Participant[] = [
  {
    id: DEFAULT_PARTICIPANT_ID,
    auto_id: "PAC-0082",
    prontuario_pep: "PEP-2026-9812",
    first_name: "Ana Beatriz",
    last_name: "Medeiros",
    grammatical_gender: "feminino",
    tcle_accepted: true,
  },
  {
    id: "c2222222-2222-2222-2222-222222222222",
    auto_id: "PAC-0083",
    prontuario_pep: "PEP-2026-9813",
    first_name: "Carlos Eduardo",
    last_name: "Nogueira",
    grammatical_gender: "masculino",
    tcle_accepted: true,
  },
];

const FALLBACK_TEMPLATES: ReportTemplate[] = [
  {
    id: DEFAULT_TEMPLATE_ID,
    title: "SOAP Clínico Padrão",
    description: "Subjetivo, Objetivo, Avaliação e Plano Terapêutico",
    detail_level: "equilibrio",
    tone_style: "clinico",
    sections: ["Subjetivo", "Objetivo", "Avaliação Diagnóstica", "Plano & Encaminhamentos"],
  },
  {
    id: "b2222222-2222-2222-2222-222222222222",
    title: "Anamnese Fonoaudiológica Completa",
    description: "Histórico de queixa, desenvolvimento da fala, motricidade orofacial",
    detail_level: "detalhado",
    tone_style: "clinico",
  },
];

export default function CapturaCentralPage() {
  const pathname = usePathname();
  const supabase = createClient();

  // --- Estados Principais ---
  const [participants, setParticipants] = useState<Participant[]>(FALLBACK_PARTICIPANTS);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant>(FALLBACK_PARTICIPANTS[0]);
  const [participantSearch, setParticipantSearch] = useState("");
  const [isParticipantDropdownOpen, setIsParticipantDropdownOpen] = useState(false);

  const [templates, setTemplates] = useState<ReportTemplate[]>(FALLBACK_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate>(FALLBACK_TEMPLATES[0]);
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);

  const [activeGroupId, setActiveGroupId] = useState<string>(DEFAULT_GROUP_ID);

  const [nature, setNature] = useState<"livre" | "semi-estruturada" | "estruturada">("semi-estruturada");
  const [sessionTitle, setSessionTitle] = useState("Consulta de Atendimento Clínico");

  // Histórico
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [historySearch, setHistorySearch] = useState("");

  // Gravação & Áudio
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "paused">("idle");
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Dispositivos de Microfone & MediaRecorder Real
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Modal de Finalização, Erros e Toast
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [advisorNotes, setAdvisorNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toastNotification, setToastNotification] = useState<{
    title: string;
    description: string;
    sessionId?: string;
  } | null>(null);

  // Modal de Novo Paciente
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPep, setNewPep] = useState("");
  const [newGender, setNewGender] = useState<"masculino" | "feminino" | "neutro">("feminino");
  const [newTcle, setNewTcle] = useState(true);

  // --- 1. Carrega Dados do Supabase no Início (com fallback/seed) ---
  useEffect(() => {
    async function loadInitialData() {
      try {
        // Carrega Grupo Ativo
        const { data: groupsData } = await supabase.from("research_groups").select("id, name").limit(1);
        if (groupsData && groupsData.length > 0) {
          setActiveGroupId(groupsData[0].id);
        }

        // Carrega Templates
        const { data: templatesData } = await supabase.from("report_templates").select("*");
        if (templatesData && templatesData.length > 0) {
          setTemplates(templatesData);
          setSelectedTemplate(templatesData[0]);
        }

        // Carrega Pacientes
        const { data: participantsData } = await supabase.from("participants").select("*");
        if (participantsData && participantsData.length > 0) {
          setParticipants(participantsData);
          setSelectedParticipant(participantsData[0]);
        }

        // Carrega Histórico de Sessões Recentes
        const { data: sessionsData } = await supabase
          .from("sessions")
          .select("*, participants(first_name, last_name, auto_id), report_templates(title)")
          .order("created_at", { ascending: false })
          .limit(20);

        if (sessionsData && sessionsData.length > 0) {
          const mappedHistory: SessionRecord[] = sessionsData.map((s: any) => ({
            id: s.id,
            session_title: s.session_title,
            participant_name: s.participants ? `${s.participants.first_name} ${s.participants.last_name}` : "Paciente",
            participant_id_str: s.participants?.auto_id || "PAC-ANON",
            duration_seconds: s.duration_seconds || 0,
            status: s.status || "concluido",
            nature: s.nature || "semi-estruturada",
            created_at: s.created_at ? new Date(s.created_at).toLocaleDateString("pt-BR") : "Recente",
            template_title: s.report_templates?.title || "SOAP Clínico",
          }));
          setHistory(mappedHistory);
        }
      } catch (err) {
        console.warn("[Captura Init] Erro ao carregar dados iniciais:", err);
      }
    }

    loadInitialData();
  }, [supabase]);

  // --- 2. Enumera Dispositivos de Microfone ---
  const loadAudioDevices = async () => {
    try {
      if (typeof window === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
        return;
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === "audioinput");
      const hasLabels = audioInputs.some((d) => d.label && d.label.length > 0);

      if (!hasLabels && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setMicPermissionGranted(true);
          stream.getTracks().forEach((track) => track.stop());
          const updatedDevices = await navigator.mediaDevices.enumerateDevices();
          const updatedInputs = updatedDevices.filter((d) => d.kind === "audioinput");
          setAudioDevices(updatedInputs);
          if (updatedInputs.length > 0 && !selectedDeviceId) {
            setSelectedDeviceId(updatedInputs[0].deviceId || "default");
          }
          return;
        } catch {
          // Permissão não concedida ainda
        }
      }

      setAudioDevices(audioInputs);
      if (audioInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(audioInputs[0].deviceId || "default");
      }
    } catch (err) {
      console.error("Erro ao enumerar microfones:", err);
    }
  };

  useEffect(() => {
    loadAudioDevices();

    const handleDeviceChange = () => {
      loadAudioDevices();
    };

    if (navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    }

    return () => {
      if (navigator.mediaDevices?.removeEventListener) {
        navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
      }
      stopAudioMonitoring();
    };
  }, []);

  // --- 3. Cronômetro ---
  useEffect(() => {
    if (recordingState === "recording") {
      timerRef.current = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [recordingState]);

  // --- 4. Monitoramento e Gravação Real de Áudio ---
  const startAudioMonitoring = async (deviceId?: string) => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      setMicPermissionGranted(true);

      // Inicia MediaRecorder real
      recordedChunksRef.current = [];
      try {
        const recorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : undefined,
        });

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };

        recorder.start(1000);
        mediaRecorderRef.current = recorder;
      } catch (recErr) {
        const fallbackRecorder = new MediaRecorder(stream);
        fallbackRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };
        fallbackRecorder.start(1000);
        mediaRecorderRef.current = fallbackRecorder;
      }

      // Conecta Web Audio API para Waveform e VU Meter
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 255) * 160));
        setAudioLevel(normalized);

        animationFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch {
      simulateAudioVisualizer();
    }
  };

  const simulateAudioVisualizer = () => {
    let phase = 0;
    const interval = setInterval(() => {
      if (recordingState === "recording") {
        phase += 0.2;
        const simulated = Math.sin(phase) * 30 + Math.cos(phase * 1.5) * 20 + 40;
        setAudioLevel(Math.max(10, Math.min(95, simulated)));
      } else {
        setAudioLevel(0);
        clearInterval(interval);
      }
    }, 100);
  };

  const stopAudioMonitoring = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  // --- Controles de Gravação ---
  const handleStartRecording = async () => {
    setSaveError(null);
    setRecordingState("recording");
    await startAudioMonitoring(selectedDeviceId);
  };

  const handlePauseRecording = () => {
    setRecordingState("paused");
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
    }
  };

  const handleResumeRecording = () => {
    setRecordingState("recording");
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
    }
  };

  const handleResetRecording = () => {
    if (confirm("Deseja realmente descartar a gravação atual? Todos os dados temporários serão perdidos.")) {
      setRecordingState("idle");
      setSecondsElapsed(0);
      recordedChunksRef.current = [];
      stopAudioMonitoring();
    }
  };

  const handleOpenFinishModal = () => {
    setRecordingState("paused");
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
    }
    setSaveError(null);
    setIsFinishModalOpen(true);
  };

  // --- 5. Fluxo de Persistência e Processamento via API Route ---
  const handleConfirmFinalize = async () => {
    setIsSubmitting(true);
    setSaveError(null);

    try {
      // 1. Consolida o Blob de áudio gravado
      const audioBlob =
        recordedChunksRef.current.length > 0
          ? new Blob(recordedChunksRef.current, { type: "audio/webm" })
          : new Blob([new Uint8Array(1024)], { type: "audio/webm" });

      // 2. Monta o FormData para envio direto ao backend
      const formData = new FormData();
      formData.append("file", audioBlob, "audio_session.webm");
      formData.append("sessionTitle", sessionTitle || "Consulta de Atendimento Clínico");
      formData.append("duration", String(secondsElapsed));
      formData.append("participantId", selectedParticipant.id || DEFAULT_PARTICIPANT_ID);
      formData.append("groupId", activeGroupId || DEFAULT_GROUP_ID);
      formData.append("templateId", selectedTemplate.id || DEFAULT_TEMPLATE_ID);
      formData.append("advisorNotes", advisorNotes || "");
      formData.append("nature", nature);
      formData.append("deviceId", selectedDeviceId || "Default");

      console.log("[Captura] Despachando FormData para /api/process-session...");

      // 3. Chamada à rota Serverless
      const res = await fetch("/api/process-session", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const errorMsg = errJson?.error || errJson?.details || `Erro no servidor (Status: ${res.status})`;
        console.error("[Captura] Erro retornado pela API:", errorMsg);
        setSaveError(`Falha no processamento: ${errorMsg}`);
        setIsSubmitting(false);
        return;
      }

      const data = await res.json();
      console.log("[Captura] Sessão processada com sucesso:", data);

      const createdSessionId = data.sessionId;

      // Reseta formulários e cronômetro
      setRecordingState("idle");
      setSecondsElapsed(0);
      setAdvisorNotes("");
      recordedChunksRef.current = [];
      stopAudioMonitoring();
      setIsSubmitting(false);
      setIsFinishModalOpen(false);

      // Redireciona imediatamente para a tela de Curadoria da sessão
      if (createdSessionId) {
        window.location.href = `/workspace/curadoria/${createdSessionId}`;
      }
    } catch (err: any) {
      console.error("[Captura] Exceção durante o despacho:", err);
      setSaveError(`Falha de conexão: ${err?.message || String(err)}`);
      setIsSubmitting(false);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  const formatDurationDisplay = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}h ${remMins}m`;
    }
    return `${mins}m ${secs}s`;
  };

  const filteredParticipants = participants.filter(
    (p) =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(participantSearch.toLowerCase()) ||
      p.auto_id.toLowerCase().includes(participantSearch.toLowerCase()) ||
      (p.prontuario_pep && p.prontuario_pep.toLowerCase().includes(participantSearch.toLowerCase()))
  );

  const filteredHistory = history.filter(
    (h) =>
      h.session_title.toLowerCase().includes(historySearch.toLowerCase()) ||
      h.participant_name.toLowerCase().includes(historySearch.toLowerCase()) ||
      h.participant_id_str.toLowerCase().includes(historySearch.toLowerCase())
  );

  const navLinks = [
    { href: "/workspace/captura", label: "Captura Central", icon: Mic },
    { href: "/workspace/grupos", label: "Grupos Éticos & CEP", icon: ShieldCheck },
    { href: "/workspace/glossario", label: "Glossário Clínico", icon: BookOpen },
    { href: "/workspace/modelos", label: "Modelos de Notas", icon: FileText },
  ];

  return (
    <div
      style={{ backgroundColor: "#F8F9FA" }}
      className="flex h-screen w-full font-sans text-slate-800 antialiased overflow-hidden selection:bg-[#006A55] selection:text-white"
    >
      {/* ========================================================= */}
      {/* 1. SIDEBAR COM NAVEGAÇÃO & HISTÓRICO TOTALMENTE INTERATIVO */}
      {/* ========================================================= */}
      <aside className="w-80 border-r border-slate-200/80 bg-white/80 backdrop-blur-xl flex flex-col justify-between shrink-0 select-none z-20 shadow-xs">
        {/* Topo da Sidebar: Identidade Institucional */}
        <div className="p-4 border-b border-slate-200/70 space-y-3">
          <div className="flex items-center gap-2.5">
            <div
              style={{ backgroundColor: "#006A55" }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md shadow-[#006A55]/20"
            >
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-slate-900">
                  Conversação
                </span>
                <span
                  style={{ color: "#006A55", backgroundColor: "rgba(0, 106, 85, 0.08)" }}
                  className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border border-[#006A55]/20"
                >
                  Cloud v14
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Pure-Batch &bull; LGPD & CEP</p>
            </div>
          </div>

          {/* Links Principais do Workspace */}
          <nav className="space-y-1 pt-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all",
                    isActive
                      ? "bg-[#006A55] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-slate-400")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Lista de Histórico Recente de Gravações */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 custom-scrollbar">
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#006A55]" />
              Histórico Recente ({filteredHistory.length})
            </span>
          </div>

          {/* Campo de Busca no Histórico */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Buscar no histórico..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#006A55] focus:bg-white transition-all"
            />
          </div>

          {filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-medium">
              Nenhuma sessão gravada ainda
            </div>
          ) : (
            filteredHistory.map((item) => {
              const getStatusBadge = (status: SessionRecord["status"]) => {
                switch (status) {
                  case "validado":
                    return (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Validada
                      </span>
                    );
                  case "concluido":
                    return (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
                        <FileCheck className="w-3 h-3 text-teal-600" /> Concluída
                      </span>
                    );
                  case "processando":
                    return (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded animate-pulse">
                        <Activity className="w-3 h-3 animate-spin text-amber-600" /> Processando
                      </span>
                    );
                  case "em_rascunho":
                    return (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                        <Clock className="w-3 h-3 text-slate-400" /> Rascunho
                      </span>
                    );
                  default:
                    return (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        Pendente
                      </span>
                    );
                }
              };

              return (
                <Link
                  key={item.id}
                  href={`/workspace/curadoria/${item.id}`}
                  className="group block relative p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-[#006A55]/40 transition-all cursor-pointer shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-1.5 mb-1">
                    <h3 className="font-semibold text-xs text-slate-900 group-hover:text-[#006A55] line-clamp-1">
                      {item.session_title}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                    <span className="font-medium text-slate-700 flex items-center gap-1 truncate max-w-[130px]">
                      <Users className="w-3 h-3 text-slate-400 shrink-0" />
                      {item.participant_name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{item.participant_id_str}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10px]">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <span>{item.created_at}</span>
                      <span>&bull;</span>
                      <span className="font-mono text-[#006A55] font-bold">
                        {formatDurationDisplay(item.duration_seconds)}
                      </span>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {/* Rodapé da Sidebar: Grupo de Pesquisa & Ética */}
        <div className="p-3 bg-slate-50/80 border-t border-slate-200/80 space-y-2">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200">
            <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-[#006A55]" />
            </div>
            <div className="overflow-hidden">
              <div className="text-[11px] font-bold text-slate-800 truncate">Lab. Linguagem & Cognição</div>
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <span>CAAE:</span>
                <span className="font-mono text-[9px] text-[#006A55] font-semibold">58291022.4.0000.5537</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2. ÁREA CENTRAL: HEADER DE CONFIGURAÇÃO & CARD FLUTUANTE */}
      {/* ========================================================= */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F8F9FA] overflow-y-auto relative">
        {/* Notificação Toast Não-Bloqueante pós Gravação */}
        {toastNotification && (
          <div className="sticky top-4 z-40 max-w-xl mx-auto w-full px-4 animate-in slide-in-from-top duration-300">
            <div className="bg-white/95 backdrop-blur-xl border border-emerald-200 rounded-2xl p-4 shadow-lg shadow-emerald-900/5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-[#006A55] flex items-center justify-center shrink-0 mt-0.5">
                  <Activity className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{toastNotification.title}</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    {toastNotification.description}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    {toastNotification.sessionId && (
                      <Link
                        href={`/workspace/curadoria/${toastNotification.sessionId}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#006A55] hover:underline"
                      >
                        Abrir Espelho de Curadoria &rarr;
                      </Link>
                    )}
                    <button
                      onClick={() => setToastNotification(null)}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                    >
                      Nova Sessão
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setToastNotification(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Header Superior com Seletores Clínicos */}
        <header className="px-6 py-3.5 border-b border-slate-200/80 bg-white/70 backdrop-blur-md sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Seletor de Paciente */}
            <div className="relative">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Participante / Paciente
              </label>
              <button
                onClick={() => {
                  setIsParticipantDropdownOpen(!isParticipantDropdownOpen);
                  setIsTemplateDropdownOpen(false);
                }}
                className="flex items-center gap-2.5 bg-white border border-slate-200 hover:border-[#006A55] px-3 py-1.5 rounded-xl text-xs font-medium text-slate-800 transition-all shadow-xs cursor-pointer min-w-[240px] justify-between"
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 text-[#006A55] flex items-center justify-center font-bold text-[10px] border border-emerald-200">
                    {selectedParticipant.first_name[0]}
                  </div>
                  <span className="font-bold text-slate-900 truncate">
                    {selectedParticipant.first_name} {selectedParticipant.last_name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">({selectedParticipant.auto_id})</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedParticipant.tcle_accepted ? (
                    <span
                      title="TCLE Aceito e Registrado"
                      className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20"
                    />
                  ) : (
                    <span
                      title="TCLE Pendente"
                      className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-400/20"
                    />
                  )}
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </button>

              {/* Dropdown de Pacientes */}
              {isParticipantDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in duration-150">
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={participantSearch}
                      onChange={(e) => setParticipantSearch(e.target.value)}
                      placeholder="Pesquisar por nome, ID ou PEP..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#006A55] focus:bg-white"
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1 custom-scrollbar">
                    {filteredParticipants.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedParticipant(p);
                          setIsParticipantDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full text-left p-2 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer",
                          selectedParticipant.id === p.id
                            ? "bg-emerald-50 text-emerald-900 border border-emerald-200 font-semibold"
                            : "hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        <div className="overflow-hidden">
                          <div className="font-bold text-slate-900 truncate">
                            {p.first_name} {p.last_name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                            <span>{p.auto_id}</span>
                            {p.prontuario_pep && <span>&bull; {p.prontuario_pep}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {p.tcle_accepted ? (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                              TCLE OK
                            </span>
                          ) : (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                              Sem TCLE
                            </span>
                          )}
                          {selectedParticipant.id === p.id && <Check className="w-3.5 h-3.5 text-[#006A55]" />}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 mt-1 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setIsParticipantDropdownOpen(false);
                        setIsNewPatientModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-[#006A55] hover:opacity-90 font-bold hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Cadastrar Novo Participante
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Seletor de Modelo */}
            <div className="relative">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Template da Nota Clínica
              </label>
              <button
                onClick={() => {
                  setIsTemplateDropdownOpen(!isTemplateDropdownOpen);
                  setIsParticipantDropdownOpen(false);
                }}
                className="flex items-center gap-2.5 bg-white border border-slate-200 hover:border-[#006A55] px-3 py-1.5 rounded-xl text-xs font-medium text-slate-800 transition-all shadow-xs cursor-pointer min-w-[220px] justify-between"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-[#006A55] shrink-0" />
                  <span className="font-bold text-slate-900 truncate">{selectedTemplate.title}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {/* Dropdown de Templates */}
              {isTemplateDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-84 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in duration-150">
                  <div className="text-[11px] font-bold text-slate-500 px-2 py-1 uppercase tracking-wider">
                    Modelos Vertex AI
                  </div>
                  <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                    {templates.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setSelectedTemplate(t);
                          setIsTemplateDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full text-left p-2.5 rounded-xl text-xs transition-colors cursor-pointer",
                          selectedTemplate.id === t.id
                            ? "bg-emerald-50 text-emerald-900 border border-emerald-200 font-semibold"
                            : "hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-900">{t.title}</span>
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                            {t.detail_level || "equilibrio"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2">{t.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Natureza da Sessão */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Natureza da Sessão
              </label>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                {(["livre", "semi-estruturada", "estruturada"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setNature(mode)}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-semibold rounded-lg capitalize transition-all cursor-pointer",
                      nature === mode
                        ? "bg-white text-[#006A55] shadow-xs border border-slate-200/80"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Título Rápido */}
          <div className="flex-1 max-w-xs min-w-[200px]">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Título da Sessão
            </label>
            <input
              type="text"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              placeholder="Ex: Consulta Fonoaudiológica Inicial"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#006A55] font-semibold shadow-xs"
            />
          </div>
        </header>

        {/* ========================================================= */}
        {/* 3. CARD FLUTUANTE DE GRAVAÇÃO (DESIGN SYSTEM CLÍNICO)     */}
        {/* ========================================================= */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
          <div className="w-full max-w-2xl bg-white/85 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-8 shadow-xl shadow-slate-900/5 relative z-10 flex flex-col items-center text-center transition-all">
            {/* Badge de Status Clínico */}
            <div className="mb-5">
              {recordingState === "idle" && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-[#006A55]" />
                  Pronto para Iniciar Captura &bull; Pure-Batch
                </div>
              )}

              {recordingState === "recording" && (
                <div
                  style={{ backgroundColor: "rgba(211, 47, 47, 0.08)", color: "#D32F2F" }}
                  className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-[#D32F2F]/30 text-xs font-bold tracking-wide animate-pulse shadow-md shadow-[#D32F2F]/10"
                >
                  <span
                    style={{ backgroundColor: "#D32F2F" }}
                    className="w-2.5 h-2.5 rounded-full shadow-md animate-ping"
                  />
                  GRAVANDO SESSÃO CLÍNICA AO VIVO
                </div>
              )}

              {recordingState === "paused" && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                  <Pause className="w-3.5 h-3.5 text-amber-600" />
                  Gravação Pausada
                </div>
              )}
            </div>

            {/* Informações da Sessão */}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mb-2">
              <span className="font-bold text-slate-900">
                {selectedParticipant.first_name} {selectedParticipant.last_name}
              </span>
              <span>&bull;</span>
              <span className="font-mono text-slate-500">{selectedParticipant.auto_id}</span>
              <span>&bull;</span>
              <span className="text-[#006A55] font-semibold">{selectedTemplate.title}</span>
            </div>

            {/* Cronômetro Central Monospace */}
            <div className="my-3">
              <div
                className={cn(
                  "font-mono text-6xl md:text-7xl font-bold tracking-tight select-none transition-colors",
                  recordingState === "recording"
                    ? "text-[#D32F2F]"
                    : recordingState === "paused"
                    ? "text-amber-600"
                    : "text-slate-800"
                )}
              >
                {formatTime(secondsElapsed)}
              </div>
              <div className="text-[11px] font-medium text-slate-500 mt-2 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#006A55]" />
                Áudio em buffer de memória local &bull; Upload em lote após conclusão
              </div>
            </div>

            {/* Waveform & Nível do Microfone */}
            <div className="w-full max-w-md h-16 bg-slate-50/80 border border-slate-200 rounded-2xl p-3 my-4 flex flex-col justify-center gap-1.5">
              <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 font-medium">
                <span className="flex items-center gap-1">
                  <Volume2 className="w-3 h-3 text-[#006A55]" />
                  Nível de Entrada de Áudio
                </span>
                <span className="font-mono text-[#006A55] font-bold">{audioLevel}%</span>
              </div>

              {/* Barras de Frequência */}
              <div className="h-6 w-full flex items-center justify-between gap-1 px-1">
                {Array.from({ length: 28 }).map((_, i) => {
                  const baseHeight =
                    recordingState === "recording"
                      ? Math.max(15, (audioLevel * (1 + Math.sin(i))) % 100)
                      : 10;
                  return (
                    <div
                      key={i}
                      style={{ height: `${baseHeight}%` }}
                      className={cn(
                        "flex-1 rounded-full transition-all duration-75",
                        recordingState === "recording"
                          ? baseHeight > 60
                            ? "bg-[#D32F2F]"
                            : baseHeight > 30
                            ? "bg-[#006A55]"
                            : "bg-[#006A55]/60"
                          : "bg-slate-200"
                      )}
                    />
                  );
                })}
              </div>
            </div>

            {/* Seletor de Microfone via navigator.mediaDevices.enumerateDevices */}
            <div className="w-full max-w-md bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-6 text-left">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-[#006A55]" />
                  Microfone de Entrada
                </label>
                <button
                  onClick={loadAudioDevices}
                  title="Atualizar lista de microfones"
                  className="text-[10px] font-bold text-[#006A55] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Atualizar
                </button>
              </div>

              <div className="relative">
                <select
                  value={selectedDeviceId}
                  disabled={recordingState !== "idle"}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#006A55] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer appearance-none pr-8 truncate font-medium shadow-2xs"
                >
                  {audioDevices.length === 0 ? (
                    <option value="">Nenhum microfone detectado (Clique em Atualizar)</option>
                  ) : (
                    audioDevices.map((device, idx) => (
                      <option key={device.deviceId || idx} value={device.deviceId}>
                        {device.label || `Microfone ${idx + 1} (${device.deviceId.slice(0, 8)}...)`}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Botões de Ação de Gravação */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {recordingState === "idle" && (
                <button
                  onClick={handleStartRecording}
                  style={{ backgroundColor: "#006A55" }}
                  className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-white font-bold text-xs shadow-lg shadow-[#006A55]/20 hover:opacity-90 active:scale-98 transition-all cursor-pointer"
                >
                  <Mic className="w-4 h-4" />
                  Iniciar Gravação da Sessão
                </button>
              )}

              {recordingState === "recording" && (
                <>
                  <button
                    onClick={handlePauseRecording}
                    className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 transition-all cursor-pointer shadow-xs"
                  >
                    <Pause className="w-4 h-4 text-amber-600" />
                    Pausar
                  </button>

                  <button
                    onClick={handleOpenFinishModal}
                    style={{ backgroundColor: "#006A55" }}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-bold text-xs shadow-lg shadow-[#006A55]/20 hover:opacity-90 active:scale-98 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    Finalizar e Gerar Nota
                  </button>

                  <button
                    onClick={handleResetRecording}
                    title="Descartar gravação atual"
                    className="p-3 rounded-2xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition-all cursor-pointer shadow-xs"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </>
              )}

              {recordingState === "paused" && (
                <>
                  <button
                    onClick={handleResumeRecording}
                    style={{ backgroundColor: "#006A55" }}
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-bold text-xs shadow-md shadow-[#006A55]/20 hover:opacity-90 transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4" />
                    Retomar Gravação
                  </button>

                  <button
                    onClick={handleOpenFinishModal}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    Finalizar e Gerar Nota
                  </button>

                  <button
                    onClick={handleResetRecording}
                    title="Descartar gravação"
                    className="p-3 rounded-2xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition-all cursor-pointer shadow-xs"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================= */}
      {/* 4. MODAL DE CONFIRMAÇÃO: FINALIZAR E GERAR NOTA           */}
      {/* ========================================================= */}
      {isFinishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setIsFinishModalOpen(false)}
              disabled={isSubmitting}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div
                style={{ backgroundColor: "rgba(0, 106, 85, 0.1)", color: "#006A55" }}
                className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold"
              >
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Finalizar e Gerar Nota Clínica?</h2>
                <p className="text-xs text-slate-500">
                  Confirme os metadados antes de submeter ao processamento Serverless Pure-Batch.
                </p>
              </div>
            </div>

            {/* Alerta Visual de Erro */}
            {saveError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <div className="leading-tight font-medium">{saveError}</div>
              </div>
            )}

            {/* Resumo da Sessão */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Paciente / Participante:</span>
                <span className="font-bold text-slate-900">
                  {selectedParticipant.first_name} {selectedParticipant.last_name} ({selectedParticipant.auto_id})
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Duração Registrada:</span>
                <span className="font-mono font-bold text-[#006A55]">{formatTime(secondsElapsed)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Template Escolhido:</span>
                <span className="font-semibold text-slate-800">{selectedTemplate.title}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Natureza da Sessão:</span>
                <span className="capitalize font-semibold text-slate-800">{nature}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status do TCLE (Ética):</span>
                <span className="text-[#006A55] flex items-center gap-1 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {selectedParticipant.tcle_accepted ? "Conforme (Aceito)" : "Pendente"}
                </span>
              </div>
            </div>

            {/* Anotações do Orientador / Preceptor */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Anotações Complementares do Preceptor / Orientador</span>
                <span className="text-[10px] text-slate-400 font-normal">Opcional</span>
              </label>
              <textarea
                rows={3}
                value={advisorNotes}
                onChange={(e) => setAdvisorNotes(e.target.value)}
                placeholder="Ex: Observar modulação fonética aos 12 min; orientações domiciliares para a família..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#006A55] focus:bg-white resize-none font-sans"
              />
            </div>

            {/* Botões do Modal */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsFinishModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Continuar Gravando
              </button>

              <button
                type="button"
                onClick={handleConfirmFinalize}
                disabled={isSubmitting}
                style={{ backgroundColor: "#006A55" }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md shadow-[#006A55]/20 hover:opacity-90 active:scale-98 transition-all cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    Gravando no Supabase...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Confirmar e Despachar Batch
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. MODAL DE CADASTRO RÁPIDO DE PARTICIPANTE              */}
      {/* ========================================================= */}
      {isNewPatientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setIsNewPatientModalOpen(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div
                style={{ backgroundColor: "rgba(0, 106, 85, 0.1)", color: "#006A55" }}
                className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold"
              >
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Cadastrar Participante</h2>
                <p className="text-xs text-slate-500">Adicione um novo paciente ao grupo de pesquisa.</p>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newFirstName || !newLastName) return;

                const autoId = `PAC-00${participants.length + 85}`;

                // Salva participante no Supabase
                const { data: createdPart } = await supabase
                  .from("participants")
                  .insert([
                    {
                      group_id: activeGroupId,
                      auto_id: autoId,
                      prontuario_pep: newPep || null,
                      first_name: newFirstName,
                      last_name: newLastName,
                      grammatical_gender: newGender,
                      tcle_accepted: newTcle,
                      tcle_accepted_at: newTcle ? new Date().toISOString() : null,
                    },
                  ])
                  .select()
                  .single();

                const newParticipantObj: Participant = createdPart || {
                  id: `c-${Date.now()}`,
                  auto_id: autoId,
                  prontuario_pep: newPep || undefined,
                  first_name: newFirstName,
                  last_name: newLastName,
                  grammatical_gender: newGender,
                  tcle_accepted: newTcle,
                };

                setParticipants((prev) => [newParticipantObj, ...prev]);
                setSelectedParticipant(newParticipantObj);
                setIsNewPatientModalOpen(false);
                setNewFirstName("");
                setNewLastName("");
                setNewPep("");
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nome *</label>
                  <input
                    type="text"
                    required
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="Ex: Mariana"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 focus:outline-none focus:border-[#006A55] font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Sobrenome *</label>
                  <input
                    type="text"
                    required
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="Ex: Albuquerque"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 focus:outline-none focus:border-[#006A55] font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Prontuário PEP (Opcional)</label>
                <input
                  type="text"
                  value={newPep}
                  onChange={(e) => setNewPep(e.target.value)}
                  placeholder="Ex: PEP-2026-0044"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 focus:outline-none focus:border-[#006A55] font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Gênero Gramatical para Relatórios</label>
                <div className="flex gap-2">
                  {(["feminino", "masculino", "neutro"] as const).map((g) => (
                    <button
                      type="button"
                      key={g}
                      onClick={() => setNewGender(g)}
                      className={cn(
                        "flex-1 py-1.5 rounded-xl border capitalize text-center text-xs transition-colors cursor-pointer font-medium",
                        newGender === g
                          ? "bg-emerald-50 border-[#006A55] text-emerald-900 font-bold"
                          : "border-slate-200 text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <input
                  type="checkbox"
                  id="tcle_check"
                  checked={newTcle}
                  onChange={(e) => setNewTcle(e.target.checked)}
                  className="rounded border-slate-300 text-[#006A55] focus:ring-[#006A55]"
                />
                <label htmlFor="tcle_check" className="text-[11px] text-slate-600 font-medium cursor-pointer">
                  Termo de Consentimento Livre e Esclarecido (TCLE) assinado
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewPatientModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: "#006A55" }}
                  className="px-4 py-1.5 rounded-xl text-white font-bold shadow-md shadow-[#006A55]/20 hover:opacity-90 transition-all cursor-pointer"
                >
                  Salvar Participante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
