import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ImportedReportTemplate } from "@/lib/report-template-schema";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const template: ImportedReportTemplate = await request.json();

    if (!template || !template.title) {
      return NextResponse.json({ error: "Título do modelo é obrigatório." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://owxsysdzdepwpezsnacz.supabase.co";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const newTemplateId = template.id || crypto.randomUUID();

    // Prepara as seções em JSONB compatível com o schema do Conversação Cloud
    const sectionsJson = {
      items: template.sections || [],
      visualAssets: template.visualAssets || [],
      totalPages: template.totalPages || 1,
      category: template.category || "Geral",
      extractedFrom: template.extractedFrom || null,
    };

    const { data, error } = await supabase
      .from("report_templates")
      .upsert({
        id: newTemplateId,
        title: template.title,
        description: template.description || "Modelo estruturado importado via IA.",
        detail_level: template.detailLevel || "equilibrio",
        tone_style: template.toneStyle || "clinico",
        sections: sectionsJson,
      })
      .select()
      .single();

    if (error) {
      console.error("[Save Template Error]:", error);
      return NextResponse.json({ error: "Erro ao salvar no banco de dados", details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      template: {
        id: data.id,
        title: data.title,
        description: data.description,
        detail_level: data.detail_level,
        tone_style: data.tone_style,
        sections: data.sections,
      },
    });
  } catch (error: any) {
    console.error("[Save Template Route Error]:", error);
    return NextResponse.json(
      { error: "Falha ao persistir modelo", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
