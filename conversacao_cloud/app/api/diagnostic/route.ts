import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

export async function GET() {
  const result: {
    timestamp: string;
    gemini: {
      status: "ok" | "error";
      response: string | null;
      latency_ms: number;
      error: string | null;
    };
    groq: {
      status: "ok" | "error";
      response: string | null;
      latency_ms: number;
      error: string | null;
    };
  } = {
    timestamp: new Date().toISOString(),
    gemini: { status: "error", response: null, latency_ms: 0, error: null },
    groq: { status: "error", response: null, latency_ms: 0, error: null },
  };

  // --- Teste 1: Google Gemini (Modelo Ativo: gemini-flash-latest / gemini-3.6-flash) ---
  const geminiApiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.VERTEX_AI_API_KEY;

  if (!geminiApiKey) {
    result.gemini.error = "Chave GEMINI_API_KEY não configurada no ambiente.";
  } else {
    const startGemini = Date.now();
    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const candidateModels = [
        "gemini-flash-latest",
        "gemini-3.6-flash",
        "gemini-3.7-flash",
        "gemini-pro-latest",
      ];

      let lastErr = null;
      for (const modelName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const res = await model.generateContent("Responda apenas com a palavra: OPERACIONAL");
          result.gemini.response = `${res.response.text().trim()} (via ${modelName})`;
          result.gemini.status = "ok";
          break;
        } catch (mErr: any) {
          lastErr = mErr;
        }
      }

      if (result.gemini.status !== "ok" && lastErr) {
        throw lastErr;
      }

      result.gemini.latency_ms = Date.now() - startGemini;
    } catch (err: any) {
      result.gemini.latency_ms = Date.now() - startGemini;
      result.gemini.error = err?.message || String(err);
    }
  }

  // --- Teste 2: Groq Whisper / Models API ---
  const groqApiKey = process.env.GROQ_API_KEY;

  if (!groqApiKey) {
    result.groq.error = "Chave GROQ_API_KEY não configurada no ambiente.";
  } else {
    const startGroq = Date.now();
    try {
      const groqRes = await fetch("https://api.groq.com/openai/v1/models", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
        },
      });

      result.groq.latency_ms = Date.now() - startGroq;

      if (groqRes.ok) {
        const groqJson = await groqRes.json();
        const whisperFound = groqJson.data?.some(
          (m: any) => m.id?.includes("whisper")
        );
        result.groq.status = "ok";
        result.groq.response = whisperFound
          ? "Groq API autorizada & modelo whisper-large-v3 disponível"
          : "Groq API autorizada";
      } else {
        const errText = await groqRes.text();
        result.groq.error = `HTTP ${groqRes.status}: ${errText}`;
      }
    } catch (err: any) {
      result.groq.latency_ms = Date.now() - startGroq;
      result.groq.error = err?.message || String(err);
    }
  }

  return NextResponse.json(result);
}
