import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ valid: false, reason: "Token de convite não informado." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://owxsysdzdepwpezsnacz.supabase.co";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: invitation, error } = await supabase
      .from("group_invitations")
      .select("*, research_groups(id, name, caae_number, ethics_approval_date)")
      .eq("invite_token", token)
      .maybeSingle();

    if (error || !invitation) {
      return NextResponse.json({ valid: false, reason: "Convite não encontrado ou inválido." }, { status: 404 });
    }

    if (invitation.status === "aceito") {
      return NextResponse.json({ valid: false, reason: "Este convite já foi utilizado e aceito anteriormente." });
    }

    if (invitation.status === "revogado") {
      return NextResponse.json({ valid: false, reason: "Este convite foi revogado pelo administrador do grupo." });
    }

    const isExpired = new Date(invitation.expires_at).getTime() < Date.now();
    if (isExpired || invitation.status === "expirado") {
      return NextResponse.json({ valid: false, reason: "Este convite expirou o prazo limite de validade de 7 dias." });
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        id: invitation.id,
        group_id: invitation.group_id,
        group_name: invitation.research_groups?.name || "Grupo de Pesquisa",
        caae_number: invitation.research_groups?.caae_number || "58291022.4.0000.5537",
        role: invitation.role || "colaborador",
        expires_at: invitation.expires_at,
      },
    });
  } catch (error: any) {
    console.error("[Invite Validate Route Error]:", error);
    return NextResponse.json(
      { valid: false, reason: "Erro ao validar convite.", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
