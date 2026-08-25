export interface TemplateField {
  id: string;
  label: string;
  variableTag: string; // ex: "<<NOME_PARTICIPANTE>>", "<<QUEIXA_PRINCIPAL>>"
  type: "text" | "textarea" | "select" | "date" | "number" | "image_placeholder";
  placeholder?: string;
  options?: string[];
  required?: boolean;
  helpText?: string;
  defaultValue?: string;
}

export interface TemplateSection {
  id: string;
  title: string;
  description?: string;
  pageNumber?: number; // Para templates multi-páginas (Página 1, 2, 3...)
  layoutType?: "standard" | "grid-2" | "grid-3" | "callout" | "table";
  fixedText?: string; // Textos fixos, avisos institucionais, instruções
  fields: TemplateField[];
}

export interface TemplateVisualAsset {
  id: string;
  type: "logo" | "banner" | "diagram" | "signature" | "watermark";
  position: "header" | "footer" | "section" | "watermark";
  url?: string;
  previewUrl?: string;
  caption?: string;
  layout: "full" | "half" | "float-left" | "float-right" | "center";
}

export interface ImportedReportTemplate {
  id?: string;
  title: string;
  description: string;
  category?: string;
  detailLevel: "conciso" | "equilibrio" | "detalhado";
  toneStyle: "clinico" | "narrativo" | "institucional" | "academico";
  totalPages?: number;
  sections: TemplateSection[];
  visualAssets: TemplateVisualAsset[];
  rawExtractedText?: string;
  extractedFrom?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    extractedAt: string;
  };
}
