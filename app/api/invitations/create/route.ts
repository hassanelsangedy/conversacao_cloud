import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { groupId, role = "colaborador", expiresInDays = 7, inviterId } = body;

    if (!groupId) {
      return NextResponse.json({ error: "groupId é obrigatório." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://owxsysdzdepwpezsnacz.supabase.co";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Valida se o grupo existe
    const { data: group, error: groupErr } = await supabase
      .from("research_groups")
      .select("id, name")
      .eq("id", groupId)
      .single();

    if (groupErr || !group) {
      return NextResponse.json({ error: "Grupo de pesquisa não encontrado." }, { status: 404 });
    }

    // 2. Gera token único e data de expiração
    const inviteToken = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (parseInt(String(expiresInDays), 10) || 7));

    // 3. Insere o convite na tabela group_invitations
    const { data: invitation, error: invErr } = await supabase
      .from("group_invitations")
      .insert({
        group_id: groupId,
        inviter_id: inviterId || null,
        role: role,
        invite_token: inviteToken,
        expires_at: expiresAt.toISOString(),
        status: "pendente",
      })
      .select()
      .single();

    if (invErr) {
      console.error("[Invite Create Error]:", invErr);
      return NextResponse.json({ error: "Erro ao gerar convite no banco.", details: invErr.message }, { status: 500 });
    }

    const origin = request.headers.get("origin") || request.nextUrl.origin || "https://conversacao-cloud.vercel.app";
    const inviteUrl = `${origin}/convite/${inviteToken}`;

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        group_id: invitation.group_id,
        group_name: group.name,
        role: invitation.role,
        invite_token: invitation.invite_token,
        invite_url: inviteUrl,
        expires_at: invitation.expires_at,
        status: invitation.status,
      },
    });
  } catch (error: any) {
    console.error("[Invite Create Route Error]:", error);
    return NextResponse.json(
      { error: "Falha ao criar convite.", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
