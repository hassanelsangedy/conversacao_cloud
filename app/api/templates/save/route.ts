import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ImportedReportTemplate } from "@/lib/report-template-schema";

export const maxDuration = 30;

function isValidUUID(str?: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

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

    const finalTemplateId = isValidUUID(template.id) ? template.id! : crypto.randomUUID();

    // Normaliza tone_style e detail_level para compatibilidade total com o banco
    const allowedTones = ["clinico", "narrativo", "juvenil", "academico", "institucional", "formal"];
    let finalTone = template.toneStyle?.toLowerCase() || "clinico";
    if (!allowedTones.includes(finalTone)) {
      finalTone = "clinico";
    }

    const allowedDetails = ["conciso", "equilibrio", "detalhado"];
    let finalDetail = template.detailLevel?.toLowerCase() || "equilibrio";
    if (!allowedDetails.includes(finalDetail)) {
      finalDetail = "equilibrio";
    }

    // Formata as seções para serem compatíveis com todas as telas do Conversação Cloud
    const formattedSections = (template.sections || []).map((sec) => ({
      title: sec.title,
      description: sec.description || `Instruções para ${sec.title}`,
      format: sec.layoutType === "table" ? "topicos" : "paragrafos",
      pageNumber: sec.pageNumber || 1,
      fixedText: sec.fixedText || "",
      fields: sec.fields || [],
    }));

    const { data, error } = await supabase
      .from("report_templates")
      .upsert({
        id: finalTemplateId,
        title: template.title.trim(),
        description: template.description || "Modelo de relatório clínico estruturado por IA.",
        detail_level: finalDetail,
        tone_style: finalTone,
        sections: formattedSections,
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
