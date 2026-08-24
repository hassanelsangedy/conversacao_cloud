import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { sessionId, transcriptionText, advisorNotes } = await request.json();

    if (!sessionId || !transcriptionText) {
      return NextResponse.json(
        { error: "sessionId e transcriptionText são obrigatórios." },
        { status: 400 }
      );
    }

    const geminiApiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY ||
      process.env.VERTEX_AI_API_KEY ||
      process.env.GOOGLE_CLOUD_API_KEY;

    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "Chave da API Gemini não configurada." },
        { status: 500 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://owxsysdzdepwpezsnacz.supabase.co";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

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
${advisorNotes || "Nenhuma observação."}

TRANSCRIÇÃO LITERAL CORRIGIDA:
${transcriptionText}`;

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

    if (!responseText) {
      throw geminiErr || new Error("Falha ao gerar estruturação com Gemini.");
    }

    const clinicalNoteJson = JSON.parse(responseText);

    // Atualiza o banco com a transcrição corrigida e a nova nota clínica
    await supabase
      .from("sessions")
      .update({
        raw_transcription: transcriptionText,
        clinical_note: clinicalNoteJson,
      })
      .eq("id", sessionId);

    return NextResponse.json({
      success: true,
      clinical_note: clinicalNoteJson,
      raw_transcription: transcriptionText,
    });
  } catch (err: any) {
    console.error("[Restructure Note Error]:", err);
    return NextResponse.json(
      { error: "Erro ao reestruturar nota clínica", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
