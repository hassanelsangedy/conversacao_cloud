import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

const DEFAULT_GROUP_ID = "a1111111-1111-1111-1111-111111111111";
const DEFAULT_TEMPLATE_ID = "b1111111-1111-1111-1111-111111111111";
const DEFAULT_PARTICIPANT_ID = "c1111111-1111-1111-1111-111111111111";

export async function POST(request: NextRequest) {
  try {
    console.log("[PIPELINE] 1. Recebendo áudio e metadados no backend...");

    const contentType = request.headers.get("content-type") || "";

    let fileBuffer: Buffer | null = null;
    let fileMimeType = "audio/webm";
    let sessionId: string | null = null;
    let sessionTitle = "Consulta de Atendimento Clínico";
    let durationSeconds = 0;
    let participantId: string | null = null;
    let groupId: string | null = null;
    let templateId: string | null = null;
    let advisorNotes = "";
    let nature = "semi-estruturada";
    let deviceId = "Default";
    let userId: string | null = null;

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
      userId = (formData.get("userId") as string) || (formData.get("createdBy") as string) || null;
    } else {
      const body = await request.json().catch(() => ({}));
      sessionId = body.sessionId || null;
      advisorNotes = body.advisorNotes || "";
      userId = body.userId || body.createdBy || null;
    }

    // 2. Inicializa cliente Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://owxsysdzdepwpezsnacz.supabase.co";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const isUuid = (str?: string | null): str is string =>
      Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

    const validGroupId = isUuid(groupId) ? groupId : DEFAULT_GROUP_ID;
    const validTemplateId = isUuid(templateId) ? templateId : DEFAULT_TEMPLATE_ID;
    const validParticipantId = isUuid(participantId) ? participantId : DEFAULT_PARTICIPANT_ID;
    const validUserId = isUuid(userId) ? userId : null;

    if (!sessionId) {
      sessionId = crypto.randomUUID();
    }

    const storagePath = `${sessionId}.webm`;

    // 3. Salva áudio no bucket Supabase Storage
    if (fileBuffer && fileBuffer.length > 0) {
      try {
        const { error: storageErr } = await supabase.storage
          .from("audio-sessions")
          .upload(storagePath, fileBuffer, {
            contentType: fileMimeType,
            upsert: true,
          });
        if (storageErr) {
          console.warn("[PIPELINE] Aviso Storage:", storageErr.message);
        } else {
          console.log(`[PIPELINE] Áudio gravado com sucesso no Storage: ${storagePath}`);
        }
      } catch (stErr) {
        console.warn("[PIPELINE] Exceção storage upload:", stErr);
      }
    }

    // 4. Cria o registro na tabela `sessions` com status 'processando'
    const sessionPayload: any = {
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
    };
    if (validUserId) {
      sessionPayload.created_by = validUserId;
    }

    const { error: dbErr } = await supabase.from("sessions").upsert(sessionPayload);

    if (dbErr) {
      console.error("[PIPELINE ERROR] Erro no banco:", dbErr.message);
    }

    // 5. Retorna imediatamente (< 500ms) com 200 OK sem risco de timeout 504
    return NextResponse.json({
      success: true,
      sessionId,
      status: "processando",
      duration_seconds: durationSeconds,
      message: "Áudio e metadados recebidos com sucesso.",
    });
  } catch (error: any) {
    console.error("[PIPELINE ERROR] Falha no upload:", error);
    return NextResponse.json(
      {
        error: "Falha durante o recebimento da sessão.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
