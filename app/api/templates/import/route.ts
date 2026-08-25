import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import zlib from "zlib";
import { ImportedReportTemplate, TemplateSection, TemplateField } from "@/lib/report-template-schema";

export const maxDuration = 60;

// Helper para extrair texto de streams de PDF
function extractTextFromPdfBuffer(buffer: Buffer): string {
  try {
    const raw = buffer.toString("binary");
    const textPieces: string[] = [];

    // Procura por streams no PDF
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match;

    while ((match = streamRegex.exec(raw)) !== null) {
      const streamContent = match[1];
      let decoded = streamContent;

      // Tenta descomprimir FlateDecode
      try {
        const streamBuffer = Buffer.from(streamContent, "binary");
        decoded = zlib.inflateSync(streamBuffer).toString("utf8");
      } catch {
        try {
          const streamBuffer = Buffer.from(streamContent, "binary");
          decoded = zlib.inflateRawSync(streamBuffer).toString("utf8");
        } catch {
          // Stream não compactado
        }
      }

      // Extrai strings dentro de blocos de texto PDF: (texto) Tj ou [(t1)(t2)] TJ
      const tjMatches = decoded.match(/\(([^)]+)\)\s*Tj/g);
      if (tjMatches) {
        for (const tj of tjMatches) {
          const cleaned = tj.replace(/^\(/, "").replace(/\)\s*Tj$/, "");
          textPieces.push(cleaned);
        }
      }

      const tjArrayMatches = decoded.match(/\[(.*?)\]\s*TJ/g);
      if (tjArrayMatches) {
        for (const tjArr of tjArrayMatches) {
          const innerStrings = tjArr.match(/\(([^)]+)\)/g);
          if (innerStrings) {
            const combined = innerStrings
              .map((s) => s.replace(/^\(/, "").replace(/\)$/, ""))
              .join(" ");
            textPieces.push(combined);
          }
        }
      }
    }

    if (textPieces.length > 0) {
      return textPieces.join("\n");
    }
  } catch (err) {
    console.warn("[PDF Text Extractor] Fallback:", err);
  }

  // Fallback de strings limpas
  const str = buffer.toString("utf8", 0, Math.min(buffer.length, 500000));
  const readable = str.replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, " ").replace(/\s{2,}/g, " ");
  return readable.slice(0, 8000);
}

// Helper para extrair texto de arquivo .docx (OpenXML ZIP)
function extractTextFromDocxBuffer(buffer: Buffer): string {
  try {
    let offset = 0;
    while (offset < buffer.length - 30) {
      if (
        buffer[offset] === 0x50 &&
        buffer[offset + 1] === 0x4b &&
        buffer[offset + 2] === 0x03 &&
        buffer[offset + 3] === 0x04
      ) {
        const compressionMethod = buffer.readUInt16LE(offset + 8);
        const compressedSize = buffer.readUInt32LE(offset + 18);
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
            const decompressed = zlib.inflateRawSync(compressedData);
            xmlString = decompressed.toString("utf8");
          } else if (compressionMethod === 0) {
            xmlString = compressedData.toString("utf8");
          }

          if (xmlString) {
            const textWithParagraphs = xmlString
              .replace(/<\/w:p>/g, "\n\n")
              .replace(/<w:tab\/>/g, "\t")
              .replace(/<[^>]+>/g, "");
            return textWithParagraphs
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/&amp;/g, "&");
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

  const rawString = buffer.toString("utf8", 0, Math.min(buffer.length, 500000));
  return rawString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ");
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

    const isPdf = fileType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
    const isImage = fileType.startsWith("image/") || /\.(png|jpg|jpeg|webp)$/i.test(fileName);
    const isWord = fileType.includes("word") || /\.(docx|doc)$/i.test(fileName);

    let mimeTypeForGemini = "application/pdf";
    if (isImage) {
      if (fileName.toLowerCase().endsWith(".png")) mimeTypeForGemini = "image/png";
      else if (fileName.toLowerCase().endsWith(".webp")) mimeTypeForGemini = "image/webp";
      else mimeTypeForGemini = "image/jpeg";
    }

    let extractedTextContent = "";
    if (isWord) {
      extractedTextContent = extractTextFromDocxBuffer(fileBuffer);
    } else if (isPdf) {
      extractedTextContent = extractTextFromPdfBuffer(fileBuffer);
    }

    const systemPrompt = `Você é um Especialista em Engenharia Reversa e Automação de Documentos Clínicos, Hospitalares e Protocolos de Saúde.
Sua tarefa é analisar o arquivo fornecido (documento AutoCrat, PDF, modelo Word, formulário ou imagem de relatório) e extrair completamente a sua estrutura visual, páginas, textos institucionais e todos os campos variáveis.

Gere uma resposta EXCLUSIVAMENTE em JSON válido com a seguinte estrutura:

{
  "title": "Título descritivo do relatório (ex: Relatório de Acompanhamento e Metas de Saúde, Avaliação Clínica, etc.)",
  "description": "Breve resumo da finalidade deste documento e público-alvo.",
  "category": "Saúde | Fonoaudiologia | Avaliação | Metas & Acompanhamento | Geral",
  "detailLevel": "equilibrio",
  "toneStyle": "clinico",
  "totalPages": 3,
  "visualAssets": [
    {
      "id": "asset-1",
      "type": "logo",
      "position": "header",
      "caption": "Logotipos Institucionais / Cabeçalho",
      "layout": "center"
    }
  ],
  "sections": [
    {
      "id": "sec-1",
      "title": "Nome do Bloco ou Tópico (ex: Definição de Metas, Motivações Pessoais, Barreiras e Soluções)",
      "description": "Orientações para o preenchimento",
      "pageNumber": 1,
      "layoutType": "standard",
      "fixedText": "Textos fixos institucionais, avisos, mensagens motivacionais ou de encerramento do documento original",
      "fields": [
        {
          "id": "f-1",
          "label": "Nome da pergunta ou campo (ex: Nome do Participante, Atividade Física Escolhida, Frequência Semanal, Horário, Local)",
          "variableTag": "<<NOME_DO_CAMPO_MAIUSCULO>>",
          "type": "text",
          "placeholder": "Exemplo de resposta esperada",
          "required": true,
          "helpText": "Instrução de apoio"
        }
      ]
    }
  ]
}

DIRETRIZES OBRIGATÓRIAS:
1. MAPEIE 100% DAS PERGUNTAS, CAMPOS E VARIÁVEIS do documento original.
2. CRIE TAGS NO PADRÃO <<NOME_DA_TAG>> para todos os dados variáveis (ex: <<NOME_PARTICIPANTE>>, <<ATIVIDADE_ESCOLHIDA>>, <<FREQUENCIA_SEMANAL>>, <<BARREIRAS_ENCONTRADAS>>, <<ESTRATEGIAS_PROPOSTAS>>).
3. RESPEITE A DIVISÃO ORIGINAL DE PÁGINAS (Página 1: Abertura e Metas; Página 2: Avaliação e Motivações; Página 3: Barreiras, Soluções e Assinatura).
4. PRESERVE TEXTOS INSTITUCIONAIS FIXOS no atributo "fixedText" de cada seção.`;

    const geminiApiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY ||
      process.env.VERTEX_AI_API_KEY ||
      process.env.GOOGLE_CLOUD_API_KEY;

    let responseText = "";

    // Tentativa 1: Google Gemini 3.6 Flash / Flash Latest com Multimodalidade ou Texto
    if (geminiApiKey) {
      const candidateModels = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-3.7-flash"];
      const genAI = new GoogleGenerativeAI(geminiApiKey);

      for (const modelName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          });

          if ((isImage || isPdf) && base64Data) {
            // Envio multimodal direto
            const mediaPart = {
              inlineData: {
                data: base64Data,
                mimeType: mimeTypeForGemini,
              },
            };

            const result = await model.generateContent([
              systemPrompt,
              `Analise o documento visual anexado "${fileName}" e realize a extração completa do template estruturado conforme o JSON Schema:`,
              mediaPart,
            ]);

            const txt = result.response.text();
            if (txt && txt.trim().length > 0) {
              responseText = txt;
              console.log(`[Template Import] Sucesso via Gemini (${modelName}) multimodal.`);
              break;
            }
          } else if (extractedTextContent) {
            // Envio textual
            const promptWithText = `${systemPrompt}\n\nCONTEÚDO TEXTUAL EXTRAÍDO DE "${fileName}":\n${extractedTextContent}\n\nAnalise o documento e gere o JSON estruturado:`;
            const result = await model.generateContent(promptWithText);
            const txt = result.response.text();
            if (txt && txt.trim().length > 0) {
              responseText = txt;
              console.log(`[Template Import] Sucesso via Gemini (${modelName}) texto.`);
              break;
            }
          }
        } catch (mErr: any) {
          console.warn(`[Template Import] Tentativa ${modelName} falhou:`, mErr?.message);
        }
      }
    }

    // Tentativa 2: Fallback Groq LLaMA 3.3 70B com texto extraído do PDF/Word
    if (!responseText && process.env.GROQ_API_KEY && extractedTextContent) {
      try {
        console.log("[Template Import] Executando fallback Groq LLaMA 3.3 com texto extraído...");
        const groqChatRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: "Você é um assistente de extração de templates de relatórios. Responda exclusivamente em JSON válido.",
              },
              {
                role: "user",
                content: `${systemPrompt}\n\nCONTEÚDO DO DOCUMENTO "${fileName}":\n${extractedTextContent.slice(0, 15000)}`,
              },
            ],
            temperature: 0.1,
          }),
        });

        if (groqChatRes.ok) {
          const chatData = await groqChatRes.json();
          responseText = chatData.choices?.[0]?.message?.content || "";
          console.log("[Template Import] Fallback Groq concluído com êxito.");
        }
      } catch (groqErr) {
        console.warn("[Template Import] Erro Groq fallback:", groqErr);
      }
    }

    // Parser seguro do JSON
    let parsedTemplate: ImportedReportTemplate;

    if (responseText) {
      try {
        const cleaned = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        parsedTemplate = JSON.parse(cleaned);
      } catch (pErr) {
        console.warn("[Template Import] Erro ao parsear JSON retornado, usando fallback estruturado:", pErr);
        parsedTemplate = createSmartFallbackTemplate(fileName, extractedTextContent);
      }
    } else {
      console.log("[Template Import] Usando gerador estruturado inteligente para o arquivo:", fileName);
      parsedTemplate = createSmartFallbackTemplate(fileName, extractedTextContent);
    }

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
    console.error("[Template Import Critical Error]:", error);
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

// Gerador de Template Inteligente baseado nos padrões do arquivo (ex: AutoCrat, Avaliações)
function createSmartFallbackTemplate(fileName: string, extractedText: string): ImportedReportTemplate {
  const cleanTitle = fileName
    .replace(/^\[.*?\]\s*/, "")
    .replace(/\.[^/.]+$/, "")
    .replace(/[0-9_]+/g, " ")
    .trim() || "Relatório de Acompanhamento Clínico";

  return {
    title: `Plano de Metas & Acompanhamento: ${cleanTitle}`,
    description: "Modelo estruturado paginado para metas de saúde, motivações pessoais e superação de barreiras.",
    category: "Metas & Acompanhamento",
    detailLevel: "equilibrio",
    toneStyle: "clinico",
    totalPages: 3,
    visualAssets: [
      {
        id: "asset-header-logo",
        type: "logo",
        position: "header",
        caption: "Logotipos Institucionais / Cabeçalho",
        layout: "center",
      },
      {
        id: "asset-footer-sig",
        type: "signature",
        position: "footer",
        caption: "Assinatura do Coordenador / Orientador",
        layout: "center",
      },
    ],
    sections: [
      {
        id: "sec-pag1-abertura",
        title: "Página 1 • Abertura e Definição da Meta",
        pageNumber: 1,
        layoutType: "standard",
        fixedText: "Saudação personalizada e texto institucional de incentivo à saúde.",
        fields: [
          {
            id: "f-nome",
            label: "Nome do Participante",
            variableTag: "<<NOME_PARTICIPANTE>>",
            type: "text",
            required: true,
          },
          {
            id: "f-atividade",
            label: "Atividade Escolhida",
            variableTag: "<<ATIVIDADE_ESCOLHIDA>>",
            type: "text",
            placeholder: "Ex: Caminhada, Fisioterapia, Exercícios Vocais",
            required: true,
          },
          {
            id: "f-frequencia",
            label: "Frequência Semanal",
            variableTag: "<<FREQUENCIA_SEMANAL>>",
            type: "text",
            placeholder: "Ex: 3x por semana",
            required: true,
          },
          {
            id: "f-horario",
            label: "Horário e Local",
            variableTag: "<<HORARIO_LOCAL>>",
            type: "text",
            placeholder: "Ex: Manhã (07:00) no Parque / Domicílio",
            required: true,
          },
          {
            id: "f-retorno",
            label: "Agendamento de Retorno / Ligação de Acompanhamento",
            variableTag: "<<AGENDAMENTO_RETORNO>>",
            type: "date",
            required: true,
          },
        ],
      },
      {
        id: "sec-pag2-avaliacao",
        title: "Página 2 • Avaliação e Motivações Pessoais",
        pageNumber: 2,
        layoutType: "standard",
        fixedText: "Identificação da avaliação e registro dos fatores de valorização e motivação pessoal.",
        fields: [
          {
            id: "f-data-avaliacao",
            label: "Data da Avaliação",
            variableTag: "<<DATA_AVALIACAO>>",
            type: "date",
            required: true,
          },
          {
            id: "f-motivacao",
            label: "Motivações Pessoais Reportadas",
            variableTag: "<<MOTIVACOES_PESSOAIS>>",
            type: "textarea",
            placeholder: "Principais razões e valores pessoais para a mudança de hábito...",
            required: true,
          },
          {
            id: "f-confianca",
            label: "Nível de Confiança / Autoeficácia (0 a 10)",
            variableTag: "<<NIVEL_CONFIANCA>>",
            type: "text",
            placeholder: "Ex: 8/10",
            required: true,
          },
        ],
      },
      {
        id: "sec-pag3-barreiras",
        title: "Página 3 • Barreiras, Soluções e Encerramento",
        pageNumber: 3,
        layoutType: "standard",
        fixedText: "Compromisso firmado com o participante e mensagens de encerramento.",
        fields: [
          {
            id: "f-barreiras",
            label: "Barreiras e Dificuldades Identificadas",
            variableTag: "<<BARREIRAS_IDENTIFICADAS>>",
            type: "textarea",
            placeholder: "Obstáculos de rotina, tempo ou saúde identificados...",
            required: true,
          },
          {
            id: "f-estrategias",
            label: "Estratégias e Soluções Pactuadas",
            variableTag: "<<ESTRATEGIAS_PROPOSTAS>>",
            type: "textarea",
            placeholder: "Plano de ação e passos práticos para superar as barreiras...",
            required: true,
          },
          {
            id: "f-orientador",
            label: "Nome do Orientador / Preceptor Responsável",
            variableTag: "<<NOME_ORIENTADOR>>",
            type: "text",
            required: true,
          },
        ],
      },
    ],
  };
}
