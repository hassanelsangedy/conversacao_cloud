export interface TemplateSection {
  title: string;
  description: string;
  format: "automatico" | "paragrafos" | "topicos";
}

export interface ReportTemplateItem {
  id: string;
  title: string;
  description: string;
  detail_level: "conciso" | "equilibrio" | "detalhado";
  tone_style: "clinico" | "narrativo" | "juvenil";
  sections: TemplateSection[];
  created_at?: string;
}

export const DEFAULT_TEMPLATES: ReportTemplateItem[] = [
  {
    id: "soap-padrao",
    title: "SOAP Clínico Padrão",
    description: "Estrutura médica e fonoaudiológica padrão ouro: Subjetivo, Objetivo, Avaliação e Plano.",
    detail_level: "equilibrio",
    tone_style: "clinico",
    sections: [
      {
        title: "Subjetivo (S)",
        description: "Relato do paciente/responsável, queixas principais, histórico recente e percepção dos sintomas.",
        format: "paragrafos",
      },
      {
        title: "Objetivo (O)",
        description: "Dados observados pelo profissional, testes clínicos aplicados, achados e métricas físicas/comportamentais.",
        format: "topicos",
      },
      {
        title: "Avaliação Diagnóstica (A)",
        description: "Análise interpretativa dos achados, hipóteses diagnósticas e correlações clínicas.",
        format: "paragrafos",
      },
      {
        title: "Plano & Conduta (P)",
        description: "Prescrições, encaminhamentos, metas terapêuticas para as próximas sessões e orientações domiciliares.",
        format: "topicos",
      },
    ],
  },
  {
    id: "anamnese-fono",
    title: "Anamnese Fonoaudiológica Completa",
    description: "Mapeamento aprofundado do desenvolvimento da linguagem, audição, motricidade orofacial e voz.",
    detail_level: "detalhado",
    tone_style: "clinico",
    sections: [
      {
        title: "Queixa Principal & Histórico Pregresso",
        description: "Motivo da consulta, idade de início das manifestações e tratamentos anteriores.",
        format: "paragrafos",
      },
      {
        title: "Desenvolvimento Neuropsicomotor e Fala",
        description: "Marcos do desenvolvimento, balbucio, primeiras palavras e estruturação sintática.",
        format: "topicos",
      },
      {
        title: "Avaliação das Funções Orofaciais e Deglutição",
        description: "Mastigação, deglutição, respiração e tônus muscular orofacial.",
        format: "topicos",
      },
      {
        title: "Conduta Terapêutica Inicial",
        description: "Planejamento inicial de intervenção e frequência recomendada.",
        format: "topicos",
      },
    ],
  },
  {
    id: "pesquisa-qualitativa",
    title: "Entrevista de Pesquisa Qualitativa (CEP/UFRN)",
    description: "Adequado para coleta de dados de pesquisas acadêmicas, categorização de falas e análise de discurso.",
    detail_level: "detalhado",
    tone_style: "narrativo",
    sections: [
      {
        title: "Contextualização da Interação",
        description: "Ambiente da entrevista, vínculo e estado de receptividade do participante.",
        format: "paragrafos",
      },
      {
        title: "Núcleos de Sentido e Eixos Temáticos",
        description: "Identificação dos temas recorrentes e categorias analíticas do relato oral.",
        format: "topicos",
      },
      {
        title: "Citações Relevantes (Verbatim)",
        description: "Trechos literais anonimizados que exemplificam os achados centrais.",
        format: "paragrafos",
      },
    ],
  },
  {
    id: "evolucao-humanizada",
    title: "Evolução & Devolutiva Humanizada",
    description: "Relatório com linguagem acolhedora para entrega aos pais, cuidadores e equipe multidisciplinar.",
    detail_level: "conciso",
    tone_style: "juvenil",
    sections: [
      {
        title: "Como Foi Nosso Encontro de Hoje",
        description: "Resumo amigável das atividades e do engajamento do paciente na sessão.",
        format: "paragrafos",
      },
      {
        title: "Conquistas do Dia",
        description: "Progressos observados e pontos positivos celebrados.",
        format: "topicos",
      },
      {
        title: "Dicas Práticas para Praticar em Casa",
        description: "Orientações lúdicas e simples para a rotina familiar.",
        format: "topicos",
      },
    ],
  },
];
