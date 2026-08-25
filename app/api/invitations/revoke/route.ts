import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { invitationId } = await request.json();

    if (!invitationId) {
      return NextResponse.json({ error: "invitationId é obrigatório." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://owxsysdzdepwpezsnacz.supabase.co";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await supabase
      .from("group_invitations")
      .update({ status: "revogado" })
      .eq("id", invitationId);

    if (error) {
      return NextResponse.json({ error: "Erro ao revogar convite.", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Convite revogado com sucesso." });
  } catch (error: any) {
    console.error("[Invite Revoke Route Error]:", error);
    return NextResponse.json(
      { error: "Falha ao revogar convite.", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
