import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, fullName, professionalRegistration, email, userId } = body;

    if (!token || !email) {
      return NextResponse.json({ error: "Token e e-mail são obrigatórios." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://owxsysdzdepwpezsnacz.supabase.co";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Valida o convite
    const { data: invitation, error: invErr } = await supabase
      .from("group_invitations")
      .select("*, research_groups(id, name)")
      .eq("invite_token", token)
      .single();

    if (invErr || !invitation) {
      return NextResponse.json({ error: "Convite não encontrado ou inválido." }, { status: 404 });
    }

    if (invitation.status === "aceito") {
      return NextResponse.json({ error: "Este convite já foi aceito anteriormente." }, { status: 400 });
    }

    if (invitation.status === "revogado") {
      return NextResponse.json({ error: "Este convite foi revogado." }, { status: 400 });
    }

    const isExpired = new Date(invitation.expires_at).getTime() < Date.now();
    if (isExpired) {
      return NextResponse.json({ error: "Este convite expirou." }, { status: 400 });
    }

    // 2. Insere ou vincula o profissional na tabela group_professionals
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName?.trim() || cleanEmail.split("@")[0];

    const { error: profErr } = await supabase
      .from("group_professionals")
      .upsert(
        {
          group_id: invitation.group_id,
          user_id: userId || null,
          email: cleanEmail,
          name: cleanName,
          role: invitation.role || "colaborador",
        },
        { onConflict: "group_id,user_id" }
      );

    if (profErr) {
      console.error("[Invite Accept Error in group_professionals]:", profErr);
    }

    // 3. Atualiza o status do convite para 'aceito'
    const { error: updateInvErr } = await supabase
      .from("group_invitations")
      .update({ status: "aceito" })
      .eq("id", invitation.id);

    if (updateInvErr) {
      console.warn("[Invite Accept Update Error]:", updateInvErr.message);
    }

    return NextResponse.json({
      success: true,
      group_id: invitation.group_id,
      group_name: invitation.research_groups?.name || "Grupo de Pesquisa",
      role: invitation.role,
      email: cleanEmail,
    });
  } catch (error: any) {
    console.error("[Invite Accept Route Error]:", error);
    return NextResponse.json(
      { error: "Falha ao aceitar convite.", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
