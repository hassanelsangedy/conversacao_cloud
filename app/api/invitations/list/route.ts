import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");

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

    const { data: invitations, error } = await supabase
      .from("group_invitations")
      .select("*, research_groups(name, caae_number)")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Erro ao listar convites.", details: error.message }, { status: 500 });
    }

    const origin = request.headers.get("origin") || request.nextUrl.origin || "https://conversacao-cloud.vercel.app";

    const mapped = (invitations || []).map((inv: any) => {
      // Checa se expirou
      const isExpired = new Date(inv.expires_at).getTime() < Date.now() && inv.status === "pendente";
      const finalStatus = isExpired ? "expirado" : inv.status;

      return {
        id: inv.id,
        group_id: inv.group_id,
        group_name: inv.research_groups?.name || "Grupo de Pesquisa",
        role: inv.role,
        invite_token: inv.invite_token,
        invite_url: `${origin}/convite/${inv.invite_token}`,
        expires_at: inv.expires_at,
        status: finalStatus,
        created_at: inv.created_at,
      };
    });

    return NextResponse.json({ success: true, invitations: mapped });
  } catch (error: any) {
    console.error("[Invite List Route Error]:", error);
    return NextResponse.json(
      { error: "Falha ao listar convites.", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
