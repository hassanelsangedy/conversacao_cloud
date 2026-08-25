"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Volume2,
  Trash2,
  Save,
  ArrowLeft,
  FileCheck,
  User,
  Activity,
  Sparkles,
  Calendar,
  Lock,
  Edit3,
  Check,
  Radio,
  FileText,
  Share2,
  ExternalLink,
  ChevronRight,
  X,
  RotateCcw,
  Copy,
  Printer,
  Download,
  RefreshCw,
  Image as ImageIcon,
  Plus,
  LayoutGrid,
  Maximize2,
  AlignLeft,
  AlignRight,
  AlignCenter,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export interface ReportImage {
  id: string;
  url: string;
  caption: string;
  placement: "header" | "section" | "footer";
  sectionKey?: string;
  layout: "full" | "half" | "float-left" | "float-right" | "grid-2" | "grid-3";
  createdAt: string;
}

interface SessionData {
  id: string;
  session_title: string;
  audio_input_device?: string;
  duration_seconds: number;
  status: "processando" | "concluido" | "em_rascunho" | "validado" | "descartado";
  nature: string;
  advisor_notes?: string;
  audio_storage_path?: string | null;
  raw_transcription?: string | null;
  clinical_note?: Record<string, any> | null;
  is_validated_by_advisor?: boolean;
  is_anonimized?: boolean;
  created_at: string;
  participants?: {
    first_name: string;
    last_name: string;
    auto_id: string;
    prontuario_pep?: string;
    grammatical_gender?: string;
    tcle_accepted?: boolean;
  } | null;
  report_templates?: {
    title: string;
    description?: string;
    detail_level?: string;
    tone_style?: string;
  } | null;
  research_groups?: {
    name: string;
    caae_number?: string;
  } | null;
}

export default function CuradoriaSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.id as string;
  const supabase = useMemo(() => createClient(), []);

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("Iniciando transcrição...");
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Estados de Edição da Transcrição Bruta (Coluna Esquerda)
  const [rawTranscription, setRawTranscription] = useState<string>("");
  const [originalAiTranscription, setOriginalAiTranscription] = useState<string>("");
  const isTranscriptionEdited = rawTranscription !== originalAiTranscription;

  // Estados de Edição da Nota Clínica (Coluna Direita)
  const [noteFields, setNoteFields] = useState<Record<string, string>>({});
  const [originalAiFields, setOriginalAiFields] = useState<Record<string, string>>({});
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set());

  // Estados de Imagens do Relatório
  const [reportImages, setReportImages] = useState<ReportImage[]>([]);
  const [isAddImageModalOpen, setIsAddImageModalOpen] = useState(false);
  const [targetSectionForImage, setTargetSectionForImage] = useState<string>("header");
  const [newImageCaption, setNewImageCaption] = useState("");
  const [newImagePlacement, setNewImagePlacement] = useState<"header" | "section" | "footer">("header");
  const [newImageLayout, setNewImageLayout] = useState<ReportImage["layout"]>("full");
  const [newImagePreviewUrl, setNewImagePreviewUrl] = useState<string>("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Ações e Modais
  const [isSaving, setIsSaving] = useState(false);
  const [isRestructuring, setIsRestructuring] = useState(false);
  const [isHomologating, setIsHomologating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{
    type: "success" | "error" | "info";
    title: string;
    message: string;
  } | null>(null);
  const [isHomologationModalOpen, setIsHomologationModalOpen] = useState(false);

  const initFields = useCallback((noteJson?: Record<string, any> | null) => {
    if (!noteJson) {
      setNoteFields({});
      setOriginalAiFields({});
      setEditedFields(new Set());
      setReportImages([]);
      return;
    }
    const formatted: Record<string, string> = {};
    let parsedImages: ReportImage[] = [];

    Object.entries(noteJson).forEach(([key, val]) => {
      if (key === "_images" && Array.isArray(val)) {
        parsedImages = val;
      } else if (typeof val === "string") {
        formatted[key] = val;
      } else if (Array.isArray(val)) {
        formatted[key] = val.join("\n");
      } else if (typeof val === "object" && val !== null) {
        formatted[key] = JSON.stringify(val, null, 2);
      } else {
        formatted[key] = String(val || "");
      }
    });

    setNoteFields(formatted);
    setReportImages(parsedImages);
    setOriginalAiFields((prev) => (Object.keys(prev).length === 0 ? formatted : prev));
  }, []);

  // Dispara o pipeline de IA (Whisper + Gemini) para uma sessão
  const triggerAiProcessing = useCallback(
    async (id: string) => {
      setIsProcessingAI(true);
      setProcessingError(null);
      setProcessingStep("Transcrevendo com Whisper Large v3 e estruturando relatório...");

      try {
        const res = await fetch("/api/transcribe-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: id }),
        });

        const rawText = await res.text();
        let data: any = null;

        try {
          data = JSON.parse(rawText);
        } catch {
          console.warn("[Curadoria] Resposta não-JSON recebida:", rawText.slice(0, 100));
        }

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || data?.details || "Falha temporária no processamento de IA.");
        }

        setRawTranscription(data.raw_transcription || "");
        setOriginalAiTranscription(data.raw_transcription || "");
        initFields(data.clinical_note);

        setSession((prev) =>
          prev
            ? {
                ...prev,
                status: "concluido",
                raw_transcription: data.raw_transcription,
                clinical_note: data.clinical_note,
              }
            : prev
        );

        setIsProcessingAI(false);
      } catch (err: any) {
        console.error("[Curadoria] Erro ao processar IA:", err);
        setProcessingError(err?.message || String(err));
        setIsProcessingAI(false);
      }
    },
    [initFields]
  );

  // 1. Carrega dados da sessão do Supabase
  useEffect(() => {
    let isMounted = true;
    let pollTimeout: NodeJS.Timeout | null = null;
    let retryCount = 0;
    const MAX_RETRIES = 5;

    async function loadSession() {
      if (!sessionId) return;
      setErrorMessage(null);

      try {
        console.log("[Curadoria] Carregando sessão:", sessionId);
        const { data, error } = await supabase
          .from("sessions")
          .select("*, participants(*), report_templates(*), research_groups(*)")
          .eq("id", sessionId)
          .maybeSingle();

        if (!isMounted) return;

        if (error) {
          setErrorMessage(`Erro no banco de dados: ${error.message}`);
          setSession(null);
          setLoading(false);
          return;
        }

        if (!data) {
          retryCount++;
          if (retryCount <= MAX_RETRIES) {
            pollTimeout = setTimeout(loadSession, 1500);
            return;
          } else {
            setErrorMessage("Sessão não encontrada ou você não possui permissão de acesso a este registro conforme diretrizes de privacidade e grupo ético.");
            setSession(null);
            setLoading(false);
            return;
          }
        }

        setSession(data);

        // Se já possui transcrição/nota, inicializa
        if (data.raw_transcription) {
          setRawTranscription(data.raw_transcription);
          setOriginalAiTranscription(data.raw_transcription);
        }
        if (data.clinical_note) {
          initFields(data.clinical_note);
        }

        setLoading(false);

        // Se a sessão está com status 'processando', dispara o pipeline dedicado imediatamente
        if (data.status === "processando" && (!data.raw_transcription || !data.clinical_note)) {
          triggerAiProcessing(data.id);
        }

        // Se houver áudio no Storage, gera URL assinada para o player
        if (data.audio_storage_path) {
          try {
            const { data: signedData } = await supabase.storage
              .from("audio-sessions")
              .createSignedUrl(data.audio_storage_path, 3600);

            if (signedData?.signedUrl && isMounted) {
              setAudioUrl(signedData.signedUrl);
            }
          } catch {}
        }
      } catch (err: any) {
        if (!isMounted) return;
        setErrorMessage(err?.message || "Falha ao carregar sessão.");
        setLoading(false);
      }
    }

    loadSession();

    return () => {
      isMounted = false;
      if (pollTimeout) clearTimeout(pollTimeout);
    };
  }, [sessionId, supabase, initFields, triggerAiProcessing]);

  // Edição Manual de um Campo Clínico
  const handleFieldChange = (key: string, value: string) => {
    setNoteFields((prev) => ({ ...prev, [key]: value }));

    if (value !== originalAiFields[key]) {
      setEditedFields((prev) => new Set(prev).add(key));
    } else {
      setEditedFields((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  // Reversão do campo para a versão original da IA
  const handleRevertField = (key: string) => {
    const originalValue = originalAiFields[key] || "";
    setNoteFields((prev) => ({ ...prev, [key]: originalValue }));
    setEditedFields((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });

    setFeedbackToast({
      type: "info",
      title: "Campo Revertido",
      message: `A seção "${key}" foi restaurada para o texto original da IA.`,
    });
  };

  // Reversão da Transcrição
  const handleRevertTranscription = () => {
    setRawTranscription(originalAiTranscription);
    setFeedbackToast({
      type: "info",
      title: "Transcrição Restaurada",
      message: "A transcrição literal foi restaurada para o áudio original do Whisper.",
    });
  };

  // Re-processamento da Nota Clínica com Gemini usando a Transcrição Corrigida
  const handleRestructureNoteWithAI = async () => {
    setIsRestructuring(true);
    try {
      const response = await fetch("/api/restructure-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          transcriptionText: rawTranscription,
          advisorNotes: session?.advisor_notes || "",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Falha ao reestruturar nota clínica.");
      }

      initFields(data.clinical_note);
      setOriginalAiFields({});
      setEditedFields(new Set());

      setFeedbackToast({
        type: "success",
        title: "Nota Reestruturada!",
        message: "O relatório estruturado foi atualizado com base na sua transcrição corrigida.",
      });
    } catch (err: any) {
      setFeedbackToast({
        type: "error",
        title: "Erro ao reprocessar nota",
        message: err?.message || String(err),
      });
    } finally {
      setIsRestructuring(false);
    }
  };

  // -------------------------------------------------------------
  // GESTÃO DE IMAGENS DO RELATÓRIO
  // -------------------------------------------------------------
  const handleOpenAddImageModal = (
    placement: "header" | "section" | "footer",
    sectionKey?: string
  ) => {
    setNewImagePlacement(placement);
    setTargetSectionForImage(sectionKey || (placement === "header" ? "header" : "footer"));
    setNewImageCaption(
      placement === "header"
        ? "Logotipo Institucional"
        : sectionKey
        ? `Exame / Registro de ${sectionKey}`
        : "Anexo Clínico"
    );
    setNewImageLayout(placement === "header" ? "full" : "half");
    setNewImagePreviewUrl("");
    setIsAddImageModalOpen(true);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview imediato em Base64
    const reader = new FileReader();
    reader.onload = () => {
      setNewImagePreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload seguro para Supabase Storage bucket 'report-images'
    setIsUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop() || "png";
      const fileName = `${sessionId}-${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("report-images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from("report-images")
          .getPublicUrl(fileName);

        if (publicUrlData?.publicUrl) {
          setNewImagePreviewUrl(publicUrlData.publicUrl);
        }
      }
    } catch (err) {
      console.warn("[Storage] Upload fallback para base64:", err);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSaveNewImage = () => {
    if (!newImagePreviewUrl) {
      alert("Por favor, selecione uma imagem para adicionar.");
      return;
    }

    const newImage: ReportImage = {
      id: crypto.randomUUID(),
      url: newImagePreviewUrl,
      caption: newImageCaption,
      placement: newImagePlacement,
      sectionKey: newImagePlacement === "section" ? targetSectionForImage : undefined,
      layout: newImageLayout,
      createdAt: new Date().toISOString(),
    };

    setReportImages((prev) => [...prev, newImage]);
    setIsAddImageModalOpen(false);
    setNewImagePreviewUrl("");

    setFeedbackToast({
      type: "success",
      title: "Imagem Adicionada!",
      message: `A imagem foi inserida no formato "${newImageLayout}".`,
    });
  };

  const handleRemoveImage = (imageId: string) => {
    setReportImages((prev) => prev.filter((img) => img.id !== imageId));
    setFeedbackToast({
      type: "info",
      title: "Imagem Removida",
      message: "A imagem foi removida do relatório.",
    });
  };

  const handleChangeImageLayout = (imageId: string, layout: ReportImage["layout"]) => {
    setReportImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, layout } : img))
    );
  };

  // 2. Salvar Rascunho (com imagens)
  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const updatedNote = { ...noteFields, _images: reportImages };
      const { error } = await supabase
        .from("sessions")
        .update({
          raw_transcription: rawTranscription,
          clinical_note: updatedNote,
          status: "em_rascunho",
        })
        .eq("id", sessionId);

      if (error) throw error;

      setSession((prev) =>
        prev
          ? {
              ...prev,
              raw_transcription: rawTranscription,
              clinical_note: updatedNote,
              status: "em_rascunho",
            }
          : prev
      );

      setFeedbackToast({
        type: "success",
        title: "Rascunho Salvo!",
        message: "As edições e imagens foram salvas com sucesso no banco de dados.",
      });
    } catch (err: any) {
      setFeedbackToast({
        type: "error",
        title: "Erro ao salvar rascunho",
        message: err?.message || String(err),
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Finalizar Validação e Homologar (com Purga LGPD e Imagens)
  const handleHomologate = async () => {
    setIsHomologating(true);
    try {
      const updatedNote = { ...noteFields, _images: reportImages };

      if (session?.audio_storage_path) {
        await supabase.storage.from("audio-sessions").remove([session.audio_storage_path]);
      }

      const { error: dbError } = await supabase
        .from("sessions")
        .update({
          raw_transcription: rawTranscription,
          clinical_note: updatedNote,
          status: "validado",
          is_validated_by_advisor: true,
          audio_storage_path: null,
        })
        .eq("id", sessionId);

      if (dbError) throw dbError;

      setSession((prev) =>
        prev
          ? {
              ...prev,
              raw_transcription: rawTranscription,
              clinical_note: updatedNote,
              status: "validado",
              is_validated_by_advisor: true,
              audio_storage_path: null,
            }
          : prev
      );

      setAudioUrl(null);
      setIsHomologationModalOpen(false);

      setFeedbackToast({
        type: "success",
        title: "Homologação Concluída com Sucesso!",
        message:
          "A nota clínica foi validada e o áudio bruto foi purgado definitivamente dos servidores em estrita conformidade com a LGPD e o padrão ético CEP.",
      });
    } catch (err: any) {
      setFeedbackToast({
        type: "error",
        title: "Falha na Homologação",
        message: err?.message || String(err),
      });
    } finally {
      setIsHomologating(false);
    }
  };

  // Copiar Nota Clínica Formatada
  const handleCopyNote = () => {
    let fullText = `RELATÓRIO CLÍNICO ESTRUTURADO (SOAP)\n`;
    fullText += `Título: ${session?.session_title || "Sessão Clínica"}\n`;
    if (session?.participants) {
      fullText += `Participante: ${session.participants.first_name} ${session.participants.last_name} (${session.participants.auto_id})\n`;
    }
    fullText += `Data: ${new Date(session?.created_at || Date.now()).toLocaleDateString("pt-BR")}\n\n`;

    Object.entries(noteFields).forEach(([key, val]) => {
      fullText += `--- ${key.toUpperCase()} ---\n${val}\n\n`;
    });

    if (reportImages.length > 0) {
      fullText += `--- IMAGENS E EXAMES ANEXADOS (${reportImages.length}) ---\n`;
      reportImages.forEach((img, idx) => {
        fullText += `[${idx + 1}] ${img.caption} (${img.placement}): ${img.url}\n`;
      });
    }

    navigator.clipboard.writeText(fullText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);

    setFeedbackToast({
      type: "success",
      title: "Nota Copiada!",
      message: "O texto completo do relatório estruturado foi copiado para a sua área de transferência.",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Ordenação Clínica Padrão SOAP
  const sortedFields = useMemo(() => {
    const priorityKeywords = [
      "queixa",
      "motivo",
      "história",
      "subjetivo",
      "achados",
      "exame",
      "objetivo",
      "avaliação",
      "diagnóstic",
      "hipótese",
      "conduta",
      "plano",
      "terapêutic",
    ];

    return Object.entries(noteFields).sort(([a], [b]) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const aIdx = priorityKeywords.findIndex((kw) => aLower.includes(kw));
      const bIdx = priorityKeywords.findIndex((kw) => bLower.includes(kw));

      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [noteFields]);

  const formatSeconds = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Helper para renderizar uma imagem conforme seu layout
  const renderImageComponent = (img: ReportImage) => {
    const getLayoutClasses = (layout: ReportImage["layout"]) => {
      switch (layout) {
        case "full":
          return "w-full max-h-80 object-contain rounded-xl bg-slate-50 border border-slate-200";
        case "half":
          return "w-full max-w-sm mx-auto max-h-64 object-contain rounded-xl bg-slate-50 border border-slate-200";
        case "float-left":
          return "float-left mr-3 mb-2 max-w-[180px] sm:max-w-[220px] max-h-48 object-contain rounded-xl bg-slate-50 border border-slate-200";
        case "float-right":
          return "float-right ml-3 mb-2 max-w-[180px] sm:max-w-[220px] max-h-48 object-contain rounded-xl bg-slate-50 border border-slate-200";
        case "grid-2":
          return "w-full max-h-56 object-contain rounded-xl bg-slate-50 border border-slate-200";
        case "grid-3":
          return "w-full max-h-44 object-contain rounded-xl bg-slate-50 border border-slate-200";
        default:
          return "w-full max-h-72 object-contain rounded-xl bg-slate-50 border border-slate-200";
      }
    };

    return (
      <div key={img.id} className="relative group my-2 transition-all">
        <div className="relative overflow-hidden rounded-xl">
          <img
            src={img.url}
            alt={img.caption || "Imagem do Relatório"}
            className={getLayoutClasses(img.layout)}
          />

          {/* Barra de Ferramentas de Edição de Layout da Imagem */}
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/90 backdrop-blur-md p-1 rounded-lg border border-slate-200 shadow-md opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
            <button
              type="button"
              onClick={() => handleChangeImageLayout(img.id, "full")}
              title="Largura Total (100%)"
              className={cn(
                "p-1 rounded hover:bg-slate-100 cursor-pointer text-slate-600",
                img.layout === "full" && "text-[#006A55] bg-emerald-50"
              )}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleChangeImageLayout(img.id, "half")}
              title="Médio Centralizado (50%)"
              className={cn(
                "p-1 rounded hover:bg-slate-100 cursor-pointer text-slate-600",
                img.layout === "half" && "text-[#006A55] bg-emerald-50"
              )}
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleChangeImageLayout(img.id, "float-left")}
              title="Alinhar à Esquerda"
              className={cn(
                "p-1 rounded hover:bg-slate-100 cursor-pointer text-slate-600",
                img.layout === "float-left" && "text-[#006A55] bg-emerald-50"
              )}
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleChangeImageLayout(img.id, "float-right")}
              title="Alinhar à Direita"
              className={cn(
                "p-1 rounded hover:bg-slate-100 cursor-pointer text-slate-600",
                img.layout === "float-right" && "text-[#006A55] bg-emerald-50"
              )}
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleRemoveImage(img.id)}
              title="Remover Imagem"
              className="p-1 rounded hover:bg-rose-50 text-rose-600 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {img.caption && (
          <p className="text-[11px] text-slate-500 text-center mt-1 italic print:text-black">
            {img.caption}
          </p>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4 text-slate-700 font-sans">
        <div className="bg-white/90 backdrop-blur-md border border-slate-200 p-6 sm:p-8 rounded-3xl shadow-sm text-center flex flex-col items-center gap-3 max-w-sm w-full">
          <Activity className="w-8 h-8 text-[#006A55] animate-spin" />
          <h2 className="text-sm font-bold text-slate-900">Carregando Espelho Clínico...</h2>
          <p className="text-xs text-slate-500">Recuperando dados da sessão.</p>
        </div>
      </div>
    );
  }

  if (errorMessage || !session) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4 text-slate-700 font-sans">
        <div className="bg-white/90 backdrop-blur-md border border-slate-200 p-6 sm:p-8 rounded-3xl shadow-sm text-center max-w-md w-full space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Sessão Não Encontrada</h2>
            <p className="text-xs text-slate-500 mt-1">
              {errorMessage || "Não foi possível carregar os dados desta sessão clínica."}
            </p>
          </div>
          <Link
            href="/workspace/captura"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-[#006A55] text-white text-xs font-bold hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para a Captura
          </Link>
        </div>
      </div>
    );
  }

  // TELA DE PROCESSAMENTO DE IA EM ANDAMENTO
  if (isProcessingAI || (session.status === "processando" && !rawTranscription)) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4 text-slate-700 font-sans">
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200 p-6 sm:p-8 rounded-3xl shadow-xl text-center max-w-md w-full space-y-5 animate-in fade-in duration-200">
          <div
            style={{ backgroundColor: "rgba(0, 106, 85, 0.1)", color: "#006A55" }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
          >
            <Sparkles className="w-7 h-7 animate-spin" />
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900">Processando com Inteligência Artificial</h2>
            <p className="text-xs text-slate-500 mt-1">{processingStep}</p>
          </div>

          {/* Etapas Visuais */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2.5 text-xs">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-[#006A55]" />
              <span>Áudio seguro no Supabase Storage (LGPD)</span>
            </div>
            <div className="flex items-center gap-2 text-[#006A55] font-semibold animate-pulse">
              <Activity className="w-4 h-4 animate-spin text-[#006A55]" />
              <span>Transcrevendo áudio (Groq Whisper Large v3)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <span className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px]">3</span>
              <span>Estruturando relatório SOAP (Google Gemini)</span>
            </div>
          </div>

          {processingError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 text-left">
              <div className="font-bold mb-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                Falha no processamento:
              </div>
              <div className="text-[11px] leading-tight">{processingError}</div>
              <button
                onClick={() => triggerAiProcessing(session.id)}
                className="mt-2.5 w-full py-2 bg-[#006A55] text-white text-xs font-bold rounded-xl hover:opacity-90"
              >
                Tentar Processar Novamente
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const headerImages = reportImages.filter((img) => img.placement === "header");
  const footerImages = reportImages.filter((img) => img.placement === "footer");

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 font-sans antialiased flex flex-col selection:bg-[#006A55] selection:text-white print:bg-white print:text-black">
      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:right-5 z-50 max-w-md animate-in slide-in-from-top duration-300 print:hidden">
          <div
            className={cn(
              "p-4 rounded-2xl border backdrop-blur-xl shadow-xl flex items-start gap-3",
              feedbackToast.type === "success"
                ? "bg-emerald-50/95 border-emerald-300 text-emerald-950"
                : feedbackToast.type === "error"
                ? "bg-rose-50/95 border-rose-300 text-rose-950"
                : "bg-slate-50/95 border-slate-300 text-slate-900"
            )}
          >
            {feedbackToast.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-[#006A55]" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600" />
            )}
            <div className="flex-1">
              <h4 className="text-xs font-bold">{feedbackToast.title}</h4>
              <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">{feedbackToast.message}</p>
            </div>
            <button
              onClick={() => setFeedbackToast(null)}
              className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header Superior da Curadoria (Totalmente Responsivo) */}
      <header className="px-4 sm:px-6 py-3 bg-white/85 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/workspace/captura"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 text-xs font-semibold shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar à Captura</span>
          </Link>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          <div className="overflow-hidden">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                {session.session_title || "Sessão Clínica"}
              </h1>
              {session.status === "validado" && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-[#006A55]" /> Homologado
                </span>
              )}
              {session.status === "concluido" && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                  <FileCheck className="w-3 h-3 text-teal-600" /> Pronto para Curadoria
                </span>
              )}
              {session.status === "em_rascunho" && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  <Clock className="w-3 h-3 text-amber-600" /> Em Rascunho
                </span>
              )}
              {session.status === "processando" && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full animate-pulse">
                  <Activity className="w-3 h-3 animate-spin text-amber-600" /> Processando IA
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
              <span>
                <strong>{session.participants ? `${session.participants.first_name} ${session.participants.last_name}` : "Geral"}</strong>
                {session.participants?.auto_id && ` (${session.participants.auto_id})`}
              </span>
              <span>&bull;</span>
              <span>{formatSeconds(session.duration_seconds || 0)}</span>
              <span>&bull;</span>
              <span className="truncate">{session.report_templates?.title || "SOAP Padrão"}</span>
            </p>
          </div>
        </div>

        {/* Botões de Ação de Curadoria */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {session.status === "validado" ? (
            <>
              <button
                onClick={handleCopyNote}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs cursor-pointer"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-[#006A55]" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                {isCopied ? "Copiado!" : "Copiar"}
              </button>

              <button
                onClick={handlePrint}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                Imprimir / PDF
              </button>

              <div
                style={{ backgroundColor: "rgba(0, 106, 85, 0.1)", color: "#006A55" }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-[#006A55]/30"
              >
                <ShieldCheck className="w-4 h-4 text-[#006A55]" />
                Homologado
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => handleOpenAddImageModal("header")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5 text-[#006A55]" />
                <span className="hidden md:inline">+ Imagem / Logo</span>
              </button>

              <button
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5 text-slate-500" />
                {isSaving ? "Salvando..." : "Salvar"}
              </button>

              <button
                onClick={() => setIsHomologationModalOpen(true)}
                disabled={isHomologating}
                style={{ backgroundColor: "#006A55" }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md shadow-[#006A55]/20 hover:opacity-90 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Homologar</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* ========================================================= */}
      {/* CORPO SPLIT-VIEW (DUAS COLUNAS RESPONSIVAS)              */}
      {/* ========================================================= */}
      <main className="flex-1 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 max-w-7xl mx-auto w-full print:block print:p-0">
        {/* ========================================================= */}
        {/* COLUNA ESQUERDA: "ESPELHO DA VERDADE" (TRANSCRIÇÃO EDITÁVEL) */}
        {/* ========================================================= */}
        <section
          className={cn(
            "bg-white/85 backdrop-blur-md border rounded-3xl p-4 sm:p-6 shadow-xs flex flex-col space-y-4 print:hidden transition-all",
            isTranscriptionEdited
              ? "border-[#D32F2F] shadow-sm shadow-[#D32F2F]/10 ring-1 ring-[#D32F2F]/20"
              : "border-slate-200/90"
          )}
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div
                style={{ backgroundColor: "rgba(0, 106, 85, 0.08)", color: "#006A55" }}
                className="w-8 h-8 rounded-xl flex items-center justify-center font-bold"
              >
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Espelho da Verdade
                </h2>
                <p className="text-[11px] text-slate-500">Transcrição literal integral (Whisper Large v3)</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isTranscriptionEdited ? (
                <>
                  <span
                    style={{ color: "#D32F2F", backgroundColor: "rgba(211, 47, 47, 0.08)" }}
                    className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-[#D32F2F]/20 flex items-center gap-1"
                  >
                    <Edit3 className="w-2.5 h-2.5" />
                    Editado
                  </span>

                  {session.status !== "validado" && (
                    <button
                      type="button"
                      onClick={handleRevertTranscription}
                      title="Restaurar áudio original"
                      className="text-[10px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      Reverter
                    </button>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                  <Lock className="w-3 h-3 text-[#006A55]" />
                  Auditável
                </div>
              )}
            </div>
          </div>

          {/* Player de Áudio Auditável ou Tag de Purga LGPD */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs flex-wrap gap-1">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-[#006A55]" />
                Áudio de Referência Clínica
              </span>

              {session.audio_storage_path ? (
                <span className="text-[10px] text-amber-800 bg-amber-100 font-semibold px-2 py-0.5 rounded">
                  Pendente de Purga
                </span>
              ) : (
                <span className="text-[10px] text-emerald-800 bg-emerald-100 font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#006A55]" />
                  Áudio Purgado (LGPD)
                </span>
              )}
            </div>

            {session.audio_storage_path ? (
              <div className="pt-1">
                {audioUrl ? (
                  <audio controls className="w-full h-8 accent-[#006A55]">
                    <source src={audioUrl} type="audio/webm" />
                    Seu navegador não suporta reprodução de áudio.
                  </audio>
                ) : (
                  <div className="text-[11px] text-slate-500 italic py-1">
                    Carregando player seguro do Storage...
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 leading-relaxed">
                O arquivo de áudio foi purgado definitivamente em conformidade com as resoluções do CEP/UFRN e a LGPD.
              </p>
            )}
          </div>

          {/* Área Editável de Transcrição Literal */}
          <div className="flex-1 flex flex-col space-y-2 min-h-[260px]">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Edit3 className="w-3 h-3 text-slate-400" />
                Texto Transcrito:
              </label>

              {isTranscriptionEdited && session.status !== "validado" && (
                <button
                  type="button"
                  onClick={handleRestructureNoteWithAI}
                  disabled={isRestructuring}
                  style={{ backgroundColor: "rgba(0, 106, 85, 0.08)", color: "#006A55" }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-[#006A55]/30 hover:bg-[#006A55] hover:text-white transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className={cn("w-3 h-3", isRestructuring && "animate-spin")} />
                  {isRestructuring ? "Reestruturando..." : "Reestruturar Nota com IA"}
                </button>
              )}
            </div>

            <textarea
              value={rawTranscription}
              disabled={session.status === "validado"}
              onChange={(e) => setRawTranscription(e.target.value)}
              placeholder="Nenhuma transcrição disponível ou insira a transcrição da sessão..."
              className="w-full flex-1 min-h-[220px] bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200/80 focus:border-[#006A55] rounded-2xl p-4 text-xs text-slate-900 leading-relaxed resize-none focus:outline-none transition-all font-sans custom-scrollbar"
            />
          </div>
        </section>

        {/* ========================================================= */}
        {/* COLUNA DIREITA: "RELATÓRIO ESTRUTURADO" (COM IMAGENS)     */}
        {/* ========================================================= */}
        <section className="bg-white/85 backdrop-blur-md border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-xs flex flex-col space-y-4 print:border-none print:shadow-none print:p-0">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 print:hidden flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div
                style={{ backgroundColor: "rgba(0, 106, 85, 0.08)", color: "#006A55" }}
                className="w-8 h-8 rounded-xl flex items-center justify-center font-bold"
              >
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Relatório Estruturado (SOAP)
                </h2>
                <p className="text-[11px] text-slate-500">
                  Documento Clínico &bull; Suporte a Imagens e Layouts
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {reportImages.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                  <ImageIcon className="w-3 h-3 text-[#006A55]" />
                  {reportImages.length} imagem(ns)
                </span>
              )}

              {editedFields.size > 0 && (
                <div
                  style={{ color: "#D32F2F", backgroundColor: "rgba(211, 47, 47, 0.08)" }}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-[#D32F2F]/30 flex items-center gap-1.5 shadow-2xs"
                >
                  <Edit3 className="w-3 h-3 text-[#D32F2F]" />
                  {editedFields.size} campo(s) alterado(s)
                </div>
              )}
            </div>
          </div>

          {/* Cabeçalho do Relatório com Imagem / Timbre Institucional */}
          <div className="border-b pb-4 mb-2">
            {/* Se houver imagem de cabeçalho */}
            {headerImages.length > 0 ? (
              <div className="mb-4">
                {headerImages.map((img) => renderImageComponent(img))}
              </div>
            ) : (
              session.status !== "validado" && (
                <button
                  type="button"
                  onClick={() => handleOpenAddImageModal("header")}
                  className="w-full py-2.5 mb-3 border-2 border-dashed border-slate-200 hover:border-[#006A55] rounded-2xl text-slate-500 hover:text-[#006A55] text-xs font-semibold flex items-center justify-center gap-2 transition-all print:hidden cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-[#006A55]" />
                  <span>+ Inserir Logotipo / Timbre Institucional no Cabeçalho</span>
                </button>
              )
            )}

            <h1 className="text-base sm:text-lg font-bold text-slate-900">
              Relatório Clínico Estruturado (SOAP)
            </h1>
            <p className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-2">
              <span>
                Participante:{" "}
                <strong>
                  {session.participants
                    ? `${session.participants.first_name} ${session.participants.last_name}`
                    : "Geral"}
                </strong>
              </span>
              <span>&bull;</span>
              <span>ID: {session.participants?.auto_id || "N/A"}</span>
              <span>&bull;</span>
              <span>Data: {new Date(session.created_at).toLocaleDateString("pt-BR")}</span>
            </p>
          </div>

          {/* Lista de Campos da Nota Clínica com Imagens nas Seções */}
          <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1 print:overflow-visible print:space-y-4 max-h-[600px]">
            {sortedFields.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Nenhuma seção clínica disponível no momento.
              </div>
            ) : (
              sortedFields.map(([sectionKey, sectionValue]) => {
                const isEdited = editedFields.has(sectionKey);
                const sectionImages = reportImages.filter(
                  (img) => img.placement === "section" && img.sectionKey === sectionKey
                );

                return (
                  <div
                    key={sectionKey}
                    className={cn(
                      "p-3.5 sm:p-4 rounded-2xl border transition-all relative bg-white print:border-slate-300 print:p-3",
                      isEdited
                        ? "border-[#D32F2F] shadow-sm shadow-[#D32F2F]/10 ring-1 ring-[#D32F2F]/20"
                        : "border-slate-200/90 hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                      <label className="text-xs font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                        <span>{sectionKey}</span>
                      </label>

                      <div className="flex items-center gap-2">
                        {session.status !== "validado" && (
                          <button
                            type="button"
                            onClick={() => handleOpenAddImageModal("section", sectionKey)}
                            title={`Adicionar exame ou imagem a "${sectionKey}"`}
                            className="text-[10px] font-semibold text-slate-500 hover:text-[#006A55] flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer print:hidden"
                          >
                            <ImageIcon className="w-3 h-3 text-[#006A55]" />
                            + Imagem
                          </button>
                        )}

                        {isEdited && (
                          <>
                            <span
                              style={{
                                color: "#D32F2F",
                                backgroundColor: "rgba(211, 47, 47, 0.08)",
                              }}
                              className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-[#D32F2F]/20 flex items-center gap-1"
                            >
                              <Edit3 className="w-2.5 h-2.5" />
                              [ Editado Manualmente ]
                            </span>

                            {session.status !== "validado" && (
                              <button
                                type="button"
                                onClick={() => handleRevertField(sectionKey)}
                                title="Restaurar versão sugerida pela IA"
                                className="text-[10px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                Reverter
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Imagens anexadas a esta seção específica */}
                    {sectionImages.length > 0 && (
                      <div className="mb-3 space-y-2">
                        {sectionImages.map((img) => renderImageComponent(img))}
                      </div>
                    )}

                    <textarea
                      rows={Math.max(3, sectionValue.split("\n").length + 1)}
                      value={sectionValue}
                      disabled={session.status === "validado"}
                      onChange={(e) => handleFieldChange(sectionKey, e.target.value)}
                      placeholder={`Insira os dados clínicos para ${sectionKey}...`}
                      className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200/80 focus:border-[#006A55] rounded-xl p-3 text-xs text-slate-900 leading-relaxed resize-none focus:outline-none transition-all font-sans print:bg-transparent print:border-none print:p-0"
                    />
                  </div>
                );
              })
            )}

            {/* Imagens de Rodapé / Anexos Gerais */}
            {footerImages.length > 0 && (
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Anexos Documentais & Assinaturas
                </h3>
                {footerImages.map((img) => renderImageComponent(img))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ========================================================= */}
      {/* MODAL DE ADIÇÃO DE IMAGEM / EXAME AO RELATÓRIO            */}
      {/* ========================================================= */}
      {isAddImageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xl relative text-left max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setIsAddImageModalOpen(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div
                style={{ backgroundColor: "rgba(0, 106, 85, 0.1)", color: "#006A55" }}
                className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0"
              >
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Inserir Imagem no Relatório</h3>
                <p className="text-xs text-slate-500">
                  Adicione fotos clínicas, laudos, audiogramas ou timbres institucionais.
                </p>
              </div>
            </div>

            {/* Upload e Preview da Imagem */}
            <div className="mb-4">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />

              {newImagePreviewUrl ? (
                <div className="relative group border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 p-2 text-center">
                  <img
                    src={newImagePreviewUrl}
                    alt="Preview"
                    className="max-h-56 mx-auto object-contain rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 text-xs font-semibold text-[#006A55] hover:underline flex items-center justify-center gap-1 mx-auto"
                  >
                    <Upload className="w-3.5 h-3.5" /> Trocar Imagem
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-[#006A55] rounded-2xl p-6 text-center cursor-pointer bg-slate-50 hover:bg-emerald-50/40 transition-colors"
                >
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-800">Clique para selecionar uma imagem</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">PNG, JPG, WebP ou GIF até 10MB</p>
                </div>
              )}
            </div>

            {/* Configurações de Posição e Layout */}
            <div className="space-y-3 mb-5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Posição no Relatório</label>
                <select
                  value={newImagePlacement}
                  onChange={(e) => setNewImagePlacement(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#006A55]"
                >
                  <option value="header">Cabeçalho (Logotipo / Timbre Institucional Superior)</option>
                  <option value="section">Dentro de uma Seção Clínica Específica</option>
                  <option value="footer">Rodapé / Anexos Gerais</option>
                </select>
              </div>

              {newImagePlacement === "section" && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Seção Destino</label>
                  <select
                    value={targetSectionForImage}
                    onChange={(e) => setTargetSectionForImage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#006A55]"
                  >
                    {sortedFields.map(([k]) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Seletor Visual de Formato e Espaço da Imagem */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Espaço e Formato na Página
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewImageLayout("full")}
                    className={cn(
                      "p-2 rounded-xl border text-left transition-all cursor-pointer",
                      newImageLayout === "full"
                        ? "bg-emerald-50 border-[#006A55] text-[#006A55] font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <Maximize2 className="w-4 h-4 mb-1" />
                    <div className="text-[11px] leading-tight">Largura Total</div>
                    <div className="text-[9px] text-slate-400 font-normal">100% da página</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewImageLayout("half")}
                    className={cn(
                      "p-2 rounded-xl border text-left transition-all cursor-pointer",
                      newImageLayout === "half"
                        ? "bg-emerald-50 border-[#006A55] text-[#006A55] font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <AlignCenter className="w-4 h-4 mb-1" />
                    <div className="text-[11px] leading-tight">Médio</div>
                    <div className="text-[9px] text-slate-400 font-normal">50% centralizado</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewImageLayout("float-left")}
                    className={cn(
                      "p-2 rounded-xl border text-left transition-all cursor-pointer",
                      newImageLayout === "float-left"
                        ? "bg-emerald-50 border-[#006A55] text-[#006A55] font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <AlignLeft className="w-4 h-4 mb-1" />
                    <div className="text-[11px] leading-tight">Esquerda</div>
                    <div className="text-[9px] text-slate-400 font-normal">Lateral com texto</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewImageLayout("float-right")}
                    className={cn(
                      "p-2 rounded-xl border text-left transition-all cursor-pointer",
                      newImageLayout === "float-right"
                        ? "bg-emerald-50 border-[#006A55] text-[#006A55] font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <AlignRight className="w-4 h-4 mb-1" />
                    <div className="text-[11px] leading-tight">Direita</div>
                    <div className="text-[9px] text-slate-400 font-normal">Lateral com texto</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Legenda / Descrição da Imagem (Opcional)
                </label>
                <input
                  type="text"
                  value={newImageCaption}
                  onChange={(e) => setNewImageCaption(e.target.value)}
                  placeholder="Ex: Fig 1: Audiograma tonal liminar pós-terapia"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#006A55]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddImageModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveNewImage}
                disabled={!newImagePreviewUrl || isUploadingImage}
                style={{ backgroundColor: "#006A55" }}
                className="px-5 py-2.5 text-xs font-bold text-white rounded-xl hover:opacity-90 active:scale-98 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Inserir no Relatório
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE CONFIRMAÇÃO DE HOMOLOGAÇÃO & PURGA LGPD         */}
      {/* ========================================================= */}
      {isHomologationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xl relative text-left max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setIsHomologationModalOpen(false)}
              disabled={isHomologating}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div
                style={{ backgroundColor: "rgba(0, 106, 85, 0.1)", color: "#006A55" }}
                className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0"
              >
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Homologar Nota Clínica e Purgar Áudio?
                </h3>
                <p className="text-xs text-slate-500">
                  Confirmação ética CEP/UFRN e LGPD Saúde.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 text-xs text-amber-950 space-y-2">
              <p className="font-semibold flex items-center gap-1.5 text-amber-900">
                <Trash2 className="w-4 h-4 text-amber-700 shrink-0" />
                Exclusão Definitiva do Arquivo de Áudio dos Servidores
              </p>
              <p className="text-[11px] leading-relaxed text-amber-800">
                Em conformidade com a <strong>LGPD</strong> e o padrão ético <strong>CEP</strong>, a homologação
                definitiva salvará o relatório final e <strong>excluirá permanentemente</strong> o arquivo de áudio dos servidores.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-5 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-600">
                <span>Participante:</span>
                <span className="font-bold text-slate-900">
                  {session.participants ? `${session.participants.first_name} ${session.participants.last_name}` : "Geral"}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Campos editados:</span>
                <span className="font-bold text-[#D32F2F]">
                  {editedFields.size + (isTranscriptionEdited ? 1 : 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Imagens anexadas:</span>
                <span className="font-bold text-[#006A55]">{reportImages.length}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Status resultante:</span>
                <span className="font-bold text-[#006A55]">Validado pelo Orientador</span>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsHomologationModalOpen(false)}
                disabled={isHomologating}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleHomologate}
                disabled={isHomologating}
                style={{ backgroundColor: "#006A55" }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md shadow-[#006A55]/20 hover:opacity-90 active:scale-98 transition-all cursor-pointer disabled:opacity-60"
              >
                {isHomologating ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    Purgando e Homologando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Confirmar Homologação & Purga
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
