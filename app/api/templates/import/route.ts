import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import zlib from "zlib";
import { ImportedReportTemplate, TemplateSection, TemplateField } from "@/lib/report-template-schema";

export const maxDuration = 60;

// Helper para extrair texto de arquivo .docx (estrutura ZIP nativa do OpenXML)
function extractTextFromDocxBuffer(buffer: Buffer): string {
  try {
    // Procura pela entrada "word/document.xml" no buffer do ZIP
    let offset = 0;
    const documentXmlTag = Buffer.from("word/document.xml");

    while (offset < buffer.length - 30) {
      // Local File Header Signature: 0x04034b50 (PK\x03\x04)
      if (
        buffer[offset] === 0x50 &&
        buffer[offset + 1] === 0x4b &&
        buffer[offset + 2] === 0x03 &&
        buffer[offset + 3] === 0x04
      ) {
        const compressionMethod = buffer.readUInt16LE(offset + 8);
        const compressedSize = buffer.readUInt32LE(offset + 18);
        const uncompressedSize = buffer.readUInt32LE(offset + 22);
        const fileNameLength = buffer.readUInt16LE(offset + 26);
        const extraFieldLength = buffer.readUInt16LE(offset + 28);

        const fileName = buffer
          .subarray(offset + 30, offset + 30 + fileNameLength)
          .toString("utf8");

        const dataStart = offset + 30 + fileNameLength + extraFieldLength;

        if (fileName === "word/document.xml") {
          const compressedData = buffer.subarray(dataStart, dataStart + compressedSize);
          let xmlString = "";

          if (compressionMethod === 8) {
            // Deflate compression
            const decompressed = zlib.inflateRawSync(compressedData);
            xmlString = decompressed.toString("utf8");
          } else if (compressionMethod === 0) {
            // Stored (no compression)
            xmlString = compressedData.toString("utf8");
          }

          if (xmlString) {
            // Converte tags <w:p> para quebras de linha e extrai texto de <w:t>
            const textWithParagraphs = xmlString
              .replace(/<\/w:p>/g, "\n\n")
              .replace(/<w:tab\/>/g, "\t")
              .replace(/<[^>]+>/g, "");
            return textWithParagraphs.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
          }
        }

        offset = dataStart + compressedSize;
      } else {
        offset++;
      }
    }
  } catch (err) {
    console.warn("[Docx Parser] Fallback de extração:", err);
  }

  // Fallback: extração de strings limpas do buffer
  const rawString = buffer.toString("utf8", 0, Math.min(buffer.length, 500000));
  const cleaned = rawString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ");
  return cleaned;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado para importação." }, { status: 400 });
    }

    const fileName = file.name || "modelo_relatorio";
    const fileType = file.type || "";
    const fileSize = file.size || 0;
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const base64Data = fileBuffer.toString("base64");

    const isImageOrPdf =
      fileType.startsWith("image/") ||
      fileType === "application/pdf" ||
      fileName.endsWith(".pdf") ||
      fileName.endsWith(".png") ||
      fileName.endsWith(".jpg") ||
      fileName.endsWith(".jpeg") ||
      fileName.endsWith(".webp");

    const isWord =
      fileType.includes("word") ||
      fileType.includes("officedocument") ||
      fileName.endsWith(".docx") ||
      fileName.endsWith(".doc");

    let mimeTypeForGemini = fileType || "application/octet-stream";
    if (fileName.endsWith(".pdf")) mimeTypeForGemini = "application/pdf";
    else if (fileName.endsWith(".png")) mimeTypeForGemini = "image/png";
    else if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) mimeTypeForGemini = "image/jpeg";
    else if (fileName.endsWith(".webp")) mimeTypeForGemini = "image/webp";

    let extractedTextContent = "";
    if (isWord) {
      extractedTextContent = extractTextFromDocxBuffer(fileBuffer);
    }

    // Inicializa o Google Generative AI
    const geminiApiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY ||
      process.env.VERTEX_AI_API_KEY ||
      process.env.GOOGLE_CLOUD_API_KEY;

    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "Chave de API do Gemini não configurada no servidor." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const systemPrompt = `Você é um Especialista em Engenharia Reversa e Automação de Documentos Clínicos e Hospitalares.
Sua tarefa é analisar o arquivo fornecido (documento Word, PDF, imagem de formulário ou modelo de relatório) e extrair completamente a sua estrutura visual, textual e de campos.

Gere uma resposta EXCLUSIVAMENTE em JSON válido com a seguinte estrutura:

{
  "title": "Nome sugerido para o modelo de relatório (ex: Relatório de Avaliação Fonoaudiológica, Anamnese de Voz, etc.)",
  "description": "Breve descrição do objetivo clínico ou institucional deste modelo.",
  "category": "Fonoaudiologia | Audiologia | Voz | Linguagem | Geral",
  "detailLevel": "conciso" | "equilibrio" | "detalhado",
  "toneStyle": "clinico" | "narrativo" | "institucional" | "academico",
  "totalPages": 1,
  "visualAssets": [
    {
      "id": "asset-1",
      "type": "logo" | "banner" | "diagram" | "signature",
      "position": "header" | "footer" | "section",
      "caption": "Logotipo Institucional / Brasão",
      "layout": "full" | "half" | "center" | "float-left" | "float-right"
    }
  ],
  "sections": [
    {
      "id": "sec-1",
      "title": "Nome da Seção / Tópico (ex: Cabeçalho & Identificação, Queixa Principal, Exame Clínico, etc.)",
      "description": "Instruções ou propósito desta seção",
      "pageNumber": 1,
      "layoutType": "standard" | "grid-2" | "grid-3" | "callout" | "table",
      "fixedText": "Textos fixos institucionais, avisos, enunciados que não mudam (se houver)",
      "fields": [
        {
          "id": "f-1",
          "label": "Nome do Campo ou Pergunta (ex: Nome do Paciente, Idade, Achados Clínicos)",
          "variableTag": "<<NOME_CAMPO_MAIUSCULO>>",
          "type": "text" | "textarea" | "select" | "date" | "number" | "image_placeholder",
          "placeholder": "Texto de exemplo para preenchimento",
          "options": ["Opção 1", "Opção 2"],
          "required": true,
          "helpText": "Orientação para o profissional"
        }
      ]
    }
  ]
}

DIRETRIZES FUNDAMENTAIS:
1. MAPEIE TODAS AS SEÇÕES E PERGUNTAS presentes no arquivo original. Não omita tópicos.
2. CONVERTA CADA RESPOSTA/CAMPO VARIÁVEL em uma tag no padrão <<NOME_DA_TAG>> (ex: <<NOME_PACIENTE>>, <<DATA_CONSULTA>>, <<HISTORICO_QUEIXA>>, <<CONDUTA_TERAPEUTICA>>).
3. DETECTE LOGOTIPOS, CABEÇALHOS E ASSINATURAS identificando se ficam no topo (header), meio (section) ou rodapé (footer).
4. RESPEITE A DIVISÃO DE PÁGINAS (Página 1, Página 2, etc.) definindo "pageNumber" em cada seção.
`;

    let responseText = "";

    if (isImageOrPdf) {
      // Envia arquivo visual diretamente via multimodalidade Gemini Vision
      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: mimeTypeForGemini,
        },
      };

      const result = await model.generateContent([
        systemPrompt,
        `Analise a imagem/documento anexado a seguir e extraia o template estruturado conforme o JSON Schema:`,
        imagePart,
      ]);

      responseText = result.response.text();
    } else {
      // Envia o texto e estrutura extraídos do documento Word (.docx)
      const promptWithText = `${systemPrompt}

CONTEÚDO TEXTUAL E ESTRUTURAL EXTRAÍDO DO DOCUMENTO "${fileName}":
${extractedTextContent || "Documento Word com texto clínico."}

Analise os tópicos, tabelas, enunciados e quebras de parágrafo acima e monte o modelo JSON estruturado:`;

      const result = await model.generateContent(promptWithText);
      responseText = result.response.text();
    }

    // Parser do JSON retornado pelo Gemini
    let parsedTemplate: ImportedReportTemplate;
    try {
      const cleaned = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedTemplate = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("[Template Import] Erro ao parsear JSON do Gemini:", responseText);
      // Fallback estruturado de emergência
      parsedTemplate = {
        title: fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "),
        description: "Modelo importado automaticamente a partir de arquivo de referência.",
        category: "Geral",
        detailLevel: "equilibrio",
        toneStyle: "clinico",
        totalPages: 1,
        visualAssets: [
          {
            id: "asset-1",
            type: "logo",
            position: "header",
            caption: "Logotipo / Cabeçalho do Relatório",
            layout: "center",
          },
        ],
        sections: [
          {
            id: "sec-1",
            title: "Identificação & Metadados",
            pageNumber: 1,
            layoutType: "grid-2",
            fields: [
              {
                id: "f-1",
                label: "Nome do Participante",
                variableTag: "<<NOME_PARTICIPANTE>>",
                type: "text",
                required: true,
              },
              {
                id: "f-2",
                label: "Data da Sessão",
                variableTag: "<<DATA_SESSAO>>",
                type: "date",
                required: true,
              },
            ],
          },
          {
            id: "sec-2",
            title: "Conteúdo Clínico & Avaliação",
            pageNumber: 1,
            layoutType: "standard",
            fields: [
              {
                id: "f-3",
                label: "Relatório Descritivo",
                variableTag: "<<RELATORIO_DESCRITIVO>>",
                type: "textarea",
                required: true,
              },
            ],
          },
        ],
      };
    }

    // Adiciona metadados de origem do arquivo
    parsedTemplate.extractedFrom = {
      fileName,
      fileType: mimeTypeForGemini,
      fileSize,
      extractedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      template: parsedTemplate,
    });
  } catch (error: any) {
    console.error("[Template Import Route Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Falha durante o processamento do arquivo de modelo.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
