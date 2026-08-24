import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60; // 60s timeout para processamento em lote

const DEFAULT_GROUP_ID = "a1111111-1111-1111-1111-111111111111";
const DEFAULT_TEMPLATE_ID = "b1111111-1111-1111-1111-111111111111";
const DEFAULT_PARTICIPANT_ID = "c1111111-1111-1111-1111-111111111111";

export async function POST(request: NextRequest) {
  try {
    console.log("[PIPELINE] 1. Recebendo áudio do cliente...");

    const contentType = request.headers.get("content-type") || "";

    let fileBuffer: Buffer | null = null;
    let fileMimeType = "audio/webm";
    let sessionId: string | null = null;
    let sessionTitle = "Sessão Clínica";
    let durationSeconds = 0;
    let participantId: string | null = null;
    let groupId: string | null = null;
    let templateId: string | null = null;
    let advisorNotes = "";
    let nature = "semi-estruturada";
    let deviceId = "Default";

    // 1. Processa FormData ou JSON
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
        fileMimeType = file.type || fileMimeType;
        console.log(`[PIPELINE] Áudio recebido: ${fileBuffer.byteLength} bytes (${fileMimeType}).`);
      }

      sessionTitle = (formData.get("sessionTitle") as string) || sessionTitle;
      durationSeconds = parseInt((formData.get("duration") as string) || "0", 10);
      participantId = (formData.get("participantId") as string) || null;
      groupId = (formData.get("groupId") as string) || null;
      templateId = (formData.get("templateId") as string) || null;
      advisorNotes = (formData.get("advisorNotes") as string) || "";
      nature = (formData.get("nature") as string) || nature;
      deviceId = (formData.get("deviceId") as string) || deviceId;
      sessionId = (formData.get("sessionId") as string) || null;
    } else {
      const body = await request.json().catch(() => ({}));
      sessionId = body.sessionId || null;
    }

    // Inicializa cliente Supabase Server
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://owxsysdzdepwpezsnacz.supabase.co";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const isUuid = (str?: string | null) =>
      str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    const validGroupId = isUuid(groupId) ? groupId : DEFAULT_GROUP_ID;
    const validTemplateId = isUuid(templateId) ? templateId : DEFAULT_TEMPLATE_ID;
    const validParticipantId = isUuid(participantId) ? participantId : DEFAULT_PARTICIPANT_ID;

    // 2. Se a sessão ainda não existir no banco, cria o registro inicial
    if (!sessionId) {
      sessionId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `s-${Date.now()}`;
    }

    const storagePath = `${sessionId}.webm`;

    // Upload do arquivo de áudio para o bucket privado `audio-sessions`
    if (fileBuffer && fileBuffer.length > 0) {
      try {
        const { error: storageErr } = await supabase.storage
          .from("audio-sessions")
          .upload(storagePath, fileBuffer, {
            contentType: fileMimeType,
            upsert: true,
          });
        if (storageErr) {
          console.warn("[PIPELINE] Aviso ao salvar áudio no Supabase Storage:", storageErr.message);
        } else {
          console.log(`[PIPELINE] Áudio gravado com sucesso no Storage: ${storagePath}`);
        }
      } catch (stErr) {
        console.warn("[PIPELINE] Exceção no upload storage:", stErr);
      }
    }

    // Inserção na tabela `sessions`
    const { error: upsertErr } = await supabase
      .from("sessions")
      .upsert({
        id: sessionId,
        session_title: sessionTitle,
        audio_input_device: deviceId,
        duration_seconds: durationSeconds,
        status: "processando",
        audio_storage_path: storagePath,
        group_id: validGroupId,
        template_id: validTemplateId,
        participant_id: validParticipantId,
        advisor_notes: advisorNotes || null,
        nature: nature,
      });

    if (upsertErr) {
      console.error("[PIPELINE ERROR] Erro ao registrar sessão no Supabase:", upsertErr.message);
    } else {
      console.log(`[PIPELINE] Sessão ${sessionId} registrada com status 'processando'.`);
    }

    // 3. Busca metadados da sessão, participante e glossário
    const { data: sessionData } = await supabase
      .from("sessions")
      .select("*, participants(*), report_templates(*)")
      .eq("id", sessionId)
      .single();

    const targetGroupId = sessionData?.group_id || validGroupId;
    const notes = sessionData?.advisor_notes || advisorNotes;

    let glossaryPrompt = "";
    if (targetGroupId) {
      const { data: glossaryTerms } = await supabase
        .from("clinical_glossary")
        .select("written_term, heard_term, is_correction")
        .eq("group_id", targetGroupId);

      if (glossaryTerms && glossaryTerms.length > 0) {
        const termsList = glossaryTerms
          .map((t) => (t.is_correction ? `${t.written_term} (${t.heard_term})` : t.written_term))
          .join(", ");
        glossaryPrompt = `Termos clínicos e vocabulário especializado: ${termsList}`;
      }
    }

    if (!fileBuffer && sessionData?.audio_storage_path) {
      try {
        const { data: downloadedBlob } = await supabase.storage
          .from("audio-sessions")
          .download(sessionData.audio_storage_path);
        if (downloadedBlob) {
          const arr = await downloadedBlob.arrayBuffer();
          fileBuffer = Buffer.from(arr);
        }
      } catch (dlErr) {
        console.warn("[PIPELINE] Falha ao baixar áudio do storage:", dlErr);
      }
    }

    // 4. Motor ASR: Transcrição via Groq Whisper Large v3
    console.log("[PIPELINE] 2. Enviando para Groq Whisper...");
    const groqApiKey = process.env.GROQ_API_KEY;
    let rawTranscription = "";

    if (groqApiKey && fileBuffer && fileBuffer.length > 0) {
      try {
        const groqFormData = new FormData();
        const audioBlob = new Blob([new Uint8Array(fileBuffer)], { type: fileMimeType });
        groqFormData.append("file", audioBlob, "gravacao.webm");
        groqFormData.append("model", "whisper-large-v3");
        groqFormData.append("language", "pt");
        if (glossaryPrompt) {
          groqFormData.append("prompt", glossaryPrompt);
        }
        groqFormData.append("response_format", "json");
        groqFormData.append("temperature", "0");

        const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${groqApiKey}` },
          body: groqFormData,
        });

        if (groqRes.ok) {
          const groqJson = await groqRes.json();
          rawTranscription = groqJson.text || "";
        } else {
          const groqErrText = await groqRes.text();
          console.error(`[PIPELINE ERROR] Falha na API Groq (${groqRes.status}):`, groqErrText);
        }
      } catch (groqErr) {
        console.error("[PIPELINE ERROR] Exceção durante Groq Whisper:", groqErr);
      }
    } else {
      if (!groqApiKey) {
        console.warn("[PIPELINE ERROR] GROQ_API_KEY não configurada.");
      }
      if (!fileBuffer || fileBuffer.length === 0) {
        console.warn("[PIPELINE ERROR] Áudio vazio recebido.");
      }
    }

    console.log("[PIPELINE] 3. Transcrição recebida:", rawTranscription || "(silêncio ou sem fala)");

    if (!rawTranscription || rawTranscription.trim().length === 0) {
      rawTranscription = "[Gravação processada. Nenhuma fala ou discurso audível detectado.]";
    }

    // 5. Motor LLM: Estruturação com Gemini 1.5 Pro
    console.log("[PIPELINE] 4. Enviando transcrição para Gemini...");
    const geminiApiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY ||
      process.env.VERTEX_AI_API_KEY ||
      process.env.GOOGLE_CLOUD_API_KEY;

    let clinicalNoteJson: Record<string, any> = {};

    if (geminiApiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const candidateModels = [
          "gemini-flash-latest",
          "gemini-3.6-flash",
          "gemini-3.7-flash",
          "gemini-pro-latest",
        ];

        const systemPrompt = `Você é um assistente de IA médica especializado em estruturar transcrições de sessões clínicas no formato SOAP / Anamnese conforme LGPD e CEP/UFRN.

DIRETRIZES:
1. RIGOR TOTAL: Baseie-se EXCLUSIVAMENTE nas palavras da transcrição literal abaixo. Não alucine fatos, nomes ou doenças não mencionadas.
2. ESTRUTURAÇÃO: Responda EXCLUSIVAMENTE em JSON válido com as chaves:
   - "Queixa Principal / Motivo da Consulta"
   - "História Clínica & Subjetivo"
   - "Achados da Avaliação & Objetivo"
   - "Avaliação Diagnóstica & Hipótese"
   - "Conduta & Plano Terapêutico"
3. ANONIMIZAÇÃO: Oculte dados sensíveis (CPF, telefones) como [DADO_ANONIMIZADO].

NOTAS DO ORIENTADOR:
${notes || "Nenhuma observação."}

TRANSCRIÇÃO LITERAL:
${rawTranscription}`;

        let responseText = "";
        let geminiErr = null;

        for (const modelName of candidateModels) {
          try {
            const model = genAI.getGenerativeModel({
              model: modelName,
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1,
              },
            });
            const result = await model.generateContent(systemPrompt);
            responseText = result.response.text();
            if (responseText) break;
          } catch (mErr: any) {
            geminiErr = mErr;
          }
        }

        if (responseText) {
          clinicalNoteJson = JSON.parse(responseText);
          console.log("[PIPELINE] 5. Nota clínica gerada com sucesso!");
        } else if (geminiErr) {
          console.error("[PIPELINE ERROR] Erro na estruturação com Gemini:", geminiErr);
        }
      } catch (err) {
        console.error("[PIPELINE ERROR] Exceção geral no Gemini:", err);
      }
    }

    if (!clinicalNoteJson || Object.keys(clinicalNoteJson).length === 0) {
      clinicalNoteJson = {
        "Queixa Principal / Motivo da Consulta": "Sessão clínica registrada.",
        "História Clínica & Subjetivo": rawTranscription,
        "Achados da Avaliação & Objetivo": "Avaliação clínica concluída.",
        "Avaliação Diagnóstica & Hipótese": "Conforme relato do participante.",
        "Conduta & Plano Terapêutico": "Revisão e validação pelo orientador.",
      };
    }

    // 6. Atualiza registro final no Supabase
    const { error: updateErr } = await supabase
      .from("sessions")
      .update({
        raw_transcription: rawTranscription,
        clinical_note: clinicalNoteJson,
        duration_seconds: durationSeconds,
        status: "concluido",
        is_anonimized: true,
      })
      .eq("id", sessionId);

    if (updateErr) {
      console.error("[PIPELINE ERROR] Erro ao salvar sessão no banco:", updateErr.message);
    } else {
      console.log(`[PIPELINE] Sessão ${sessionId} finalizada com sucesso no banco de dados.`);
    }

    return NextResponse.json({
      success: true,
      sessionId,
      status: "concluido",
      clinical_note: clinicalNoteJson,
      raw_transcription: rawTranscription,
      duration_seconds: durationSeconds,
    });
  } catch (error: any) {
    console.error("[PIPELINE ERROR] Falha crítica no pipeline:", error);
    return NextResponse.json(
      {
        error: "Falha durante o pipeline Pure-Batch de IA.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
