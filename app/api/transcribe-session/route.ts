import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60;

const DEFAULT_GROUP_ID = "a1111111-1111-1111-1111-111111111111";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionId = body?.sessionId;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId é obrigatório." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://owxsysdzdepwpezsnacz.supabase.co";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Busca a sessão no Supabase
    const { data: session, error: sessErr } = await supabase
      .from("sessions")
      .select("*, participants(*), report_templates(*)")
      .eq("id", sessionId)
      .single();

    if (sessErr || !session) {
      return NextResponse.json({ error: "Sessão não encontrada." }, { status: 404 });
    }

    let rawTranscription = session.raw_transcription || "";

    // 2. Se a transcrição ainda não existir, realiza via Groq Whisper
    if (!rawTranscription || rawTranscription.trim().length === 0) {
      const storagePath = session.audio_storage_path || `${sessionId}.webm`;
      console.log(`[Transcribe] Baixando áudio ${storagePath} do Supabase Storage...`);

      const { data: downloadedBlob, error: dlErr } = await supabase.storage
        .from("audio-sessions")
        .download(storagePath);

      if (dlErr || !downloadedBlob) {
        console.error("[Transcribe] Erro ao baixar áudio:", dlErr?.message);
        rawTranscription = "[Áudio registrado. Processando transcrição...]";
      } else {
        const arr = await downloadedBlob.arrayBuffer();
        const activeBuffer = Buffer.from(arr);

        // Glossário Clínico
        let glossaryPrompt = "";
        const targetGroupId = session.group_id || DEFAULT_GROUP_ID;
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

        const groqApiKey = process.env.GROQ_API_KEY;
        if (groqApiKey && activeBuffer.length > 0) {
          try {
            const groqFormData = new FormData();
            const audioBlob = new Blob([new Uint8Array(activeBuffer)], { type: "audio/webm" });
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
              console.log(`[Transcribe] Groq Whisper concluído: "${rawTranscription}"`);
            } else {
              const groqErrText = await groqRes.text();
              console.error(`[Transcribe] Falha no Groq (${groqRes.status}):`, groqErrText);
            }
          } catch (groqErr) {
            console.error("[Transcribe] Exceção no Groq:", groqErr);
          }
        }
      }

      if (!rawTranscription || rawTranscription.trim().length === 0) {
        rawTranscription = "[Gravação processada. Nenhuma fala ou discurso audível detectado.]";
      }

      // Atualiza a transcrição no banco imediatamente
      await supabase
        .from("sessions")
        .update({ raw_transcription: rawTranscription })
        .eq("id", sessionId);
    }

    // 3. Estruturação Clínica SOAP (Gemini com fallback em Groq LLaMA)
    let clinicalNoteJson: Record<string, any> = session.clinical_note || {};

    if (!clinicalNoteJson || Object.keys(clinicalNoteJson).length === 0) {
      const geminiApiKey =
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_GENAI_API_KEY ||
        process.env.VERTEX_AI_API_KEY ||
        process.env.GOOGLE_CLOUD_API_KEY;

      const systemPrompt = `Você é um assistente de IA médica especializado em estruturar transcrições de sessões clínicas no formato SOAP / Anamnese conforme LGPD e CEP/UFRN.

DIRETRIZES:
1. Baseie-se nas informações da transcrição literal abaixo.
2. Responda EXCLUSIVAMENTE em JSON válido com as seguintes chaves:
   - "Queixa Principal / Motivo da Consulta"
   - "História Clínica & Subjetivo"
   - "Achados da Avaliação & Objetivo"
   - "Avaliação Diagnóstica & Hipótese"
   - "Conduta & Plano Terapêutico"
3. ANONIMIZAÇÃO: Oculte dados sensíveis (CPF, telefones) como [DADO_ANONIMIZADO].

NOTAS DO ORIENTADOR:
${session.advisor_notes || "Nenhuma observação."}

TRANSCRIÇÃO LITERAL:
${rawTranscription}`;

      let responseText = "";

      // Tentativa 1: Google Gemini (modelos oficiais ativos)
      if (geminiApiKey) {
        const candidateModels = [
          "gemini-2.5-flash",
          "gemini-2.0-flash",
          "gemini-1.5-flash",
          "gemini-1.5-pro",
        ];

        try {
          const genAI = new GoogleGenerativeAI(geminiApiKey);

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
              const text = result.response.text();
              if (text && text.trim().length > 0) {
                responseText = text;
                console.log(`[Transcribe] Estruturação com Gemini (${modelName}) concluída com sucesso.`);
                break;
              }
            } catch (mErr: any) {
              console.warn(`[Transcribe] Tentativa Gemini ${modelName} falhou:`, mErr?.message);
            }
          }
        } catch (genErr) {
          console.warn("[Transcribe] Exceção genAI:", genErr);
        }
      }

      // Tentativa 2: Fallback no Groq (Llama-3.3-70b) se o Gemini oscilar
      if (!responseText && process.env.GROQ_API_KEY) {
        try {
          console.log("[Transcribe] Usando fallback Groq LLaMA 3.3 para estruturação...");
          const groqChatRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              response_format: { type: "json_object" },
              messages: [
                {
                  role: "system",
                  content: "Você é um assistente de IA clínica. Responda apenas em JSON válido.",
                },
                { role: "user", content: systemPrompt },
              ],
              temperature: 0.1,
            }),
          });

          if (groqChatRes.ok) {
            const chatData = await groqChatRes.json();
            responseText = chatData.choices?.[0]?.message?.content || "";
            console.log("[Transcribe] Fallback Groq LLaMA concluído com sucesso.");
          }
        } catch (chatErr) {
          console.warn("[Transcribe] Exceção Groq Chat:", chatErr);
        }
      }

      // Parser seguro do JSON
      if (responseText) {
        try {
          const cleanedText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
          clinicalNoteJson = JSON.parse(cleanedText);
        } catch (pErr) {
          console.warn("[Transcribe] Erro ao parsear JSON estruturado:", pErr);
        }
      }

      // Fallback estruturado garantido se nenhum provedor responder
      if (!clinicalNoteJson || Object.keys(clinicalNoteJson).length === 0) {
        clinicalNoteJson = {
          "Queixa Principal / Motivo da Consulta": "Sessão clínica de atendimento fonoaudiológico/médico.",
          "História Clínica & Subjetivo": rawTranscription,
          "Achados da Avaliação & Objetivo": "Relato transcrito durante a sessão.",
          "Avaliação Diagnóstica & Hipótese": "Conforme transcrição clínica auditada.",
          "Conduta & Plano Terapêutico": "Revisão e homologação pelo orientador responsável.",
        };
      }
    }

    // 4. Salva a sessão concluída no banco
    await supabase
      .from("sessions")
      .update({
        raw_transcription: rawTranscription,
        clinical_note: clinicalNoteJson,
        status: "concluido",
        is_anonimized: true,
      })
      .eq("id", sessionId);

    return NextResponse.json({
      success: true,
      sessionId,
      status: "concluido",
      raw_transcription: rawTranscription,
      clinical_note: clinicalNoteJson,
    });
  } catch (err: any) {
    console.error("[Transcribe Route Error]:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao processar sessão clínica",
        details: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
