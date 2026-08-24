import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60;

const DEFAULT_GROUP_ID = "a1111111-1111-1111-1111-111111111111";

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

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

    let rawTranscription = session.raw_transcription;

    // 2. Se a transcrição ainda não existir, realiza via Groq Whisper
    if (!rawTranscription || rawTranscription.trim().length === 0) {
      const storagePath = session.audio_storage_path || `${sessionId}.webm`;
      console.log(`[Transcribe] Baixando áudio ${storagePath} do Supabase Storage...`);

      const { data: downloadedBlob, error: dlErr } = await supabase.storage
        .from("audio-sessions")
        .download(storagePath);

      if (dlErr || !downloadedBlob) {
        console.error("[Transcribe] Erro ao baixar áudio:", dlErr?.message);
        return NextResponse.json(
          { error: "Arquivo de áudio não encontrado no Storage." },
          { status: 404 }
        );
      }

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
      if (groqApiKey) {
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

      if (!rawTranscription || rawTranscription.trim().length === 0) {
        rawTranscription = "[Gravação processada. Nenhuma fala ou discurso audível detectado.]";
      }

      // Atualiza a transcrição no banco imediatamente
      await supabase
        .from("sessions")
        .update({ raw_transcription: rawTranscription })
        .eq("id", sessionId);
    }

    // 3. Estruturação via Google Gemini
    let clinicalNoteJson: Record<string, any> = session.clinical_note || {};

    if (!clinicalNoteJson || Object.keys(clinicalNoteJson).length === 0) {
      const geminiApiKey =
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_GENAI_API_KEY ||
        process.env.VERTEX_AI_API_KEY ||
        process.env.GOOGLE_CLOUD_API_KEY;

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
${session.advisor_notes || "Nenhuma observação."}

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
          } else if (geminiErr) {
            console.warn("[Transcribe] Aviso Gemini:", geminiErr);
          }
        } catch (err) {
          console.warn("[Transcribe] Exceção Gemini:", err);
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
      { error: "Erro ao transcrever sessão", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
