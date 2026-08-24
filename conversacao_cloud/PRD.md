# PRD: Conversacao_cloud - Sistema que transforma uma conversa em ação (Versão v14)

**Identidade do Projeto:** Conversacao_cloud
**Ambiente Central:** Supabase (Auth, PostgreSQL DB, Storage & Edge Functions)
**Arquitetura:** Serverless Pure-Batch (Processamento assíncrono em lote sem streaming local ou WebSockets)

---

## 1. Visão Geral do Produto
O Conversacao_cloud é um ecossistema cloud-native concebido para converter sessões clínicas, consultas e entrevistas em notas clínicas estruturadas (padrão SOAP e anamneses), relatórios humanizados para pacientes e análises científicas para pesquisa acadêmica qualitativa, sob estrita conformidade com a LGPD e o padrão ético CEP/UFRN/SigSaúde.

---

## 2. Stack Tecnológica
* **Frontend:** Next.js 14/15 (App Router), React, TypeScript, Tailwind CSS, Lucide Icons.
* **Backend & Infraestrutura:** Supabase (PostgreSQL, Row Level Security, Supabase Auth, Storage privado e Edge Functions em Deno).
* **Motor ASR (Áudio para Texto):** Groq API (Whisper Large v3) com injeção de glossário customizado.
* **Motor LLM (Estruturação e Anonimização):** Google Cloud Vertex AI (Gemini 1.5 Pro) em ambiente corporativo seguro sem retenção de dados.

---

## 3. Estrutura do Banco de Dados (Supabase SQL & RLS)

```sql
-- 1. Grupos de Pesquisa e Atendimento Clínico (Conformidade Ética)
CREATE TABLE research_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  caae_number TEXT,
  ethics_approval_date DATE,
  tcle_file_path TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Permissões de Acesso de Profissionais por Grupo
CREATE TABLE group_professionals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES research_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'colaborador' CHECK (role IN ('coordenador', 'colaborador')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- 3. Glossário Clínico e Calibração Fonética
CREATE TABLE clinical_glossary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES research_groups(id) ON DELETE CASCADE,
  is_correction BOOLEAN DEFAULT false,
  heard_term TEXT,
  written_term TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Modelos de Notas Clínicas e Templates
CREATE TABLE report_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  detail_level TEXT DEFAULT 'equilibrio' CHECK (detail_level IN ('conciso', 'equilibrio', 'detalhado')),
  tone_style TEXT DEFAULT 'clinico' CHECK (tone_style IN ('clinico', 'narrativo', 'juvenil')),
  sections JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Pacientes e Participantes
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES research_groups(id) ON DELETE RESTRICT,
  auto_id TEXT NOT NULL UNIQUE,
  prontuario_pep TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_country_code TEXT DEFAULT '+55',
  phone_number TEXT,
  email TEXT,
  grammatical_gender TEXT DEFAULT 'neutro' CHECK (grammatical_gender IN ('masculino', 'feminino', 'neutro')),
  tcle_accepted BOOLEAN DEFAULT false,
  tcle_accepted_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Sessões de Atendimento e Gravação
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  group_id UUID REFERENCES research_groups(id) ON DELETE CASCADE,
  template_id UUID REFERENCES report_templates(id),
  session_title TEXT NOT NULL,
  audio_input_device TEXT,
  duration_seconds INT DEFAULT 0,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_rascunho', 'processando', 'concluido', 'validado', 'descartado')),
  nature TEXT CHECK (nature IN ('livre', 'estruturada', 'semi-estruturada')),
  advisor_notes TEXT,
  audio_storage_path TEXT,
  raw_transcription TEXT,
  clinical_note JSONB,
  is_validated_by_advisor BOOLEAN DEFAULT false,
  is_anonimized BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitação de RLS
ALTER TABLE research_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_glossary ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Políticas de Isolamento RLS
CREATE POLICY "Profissionais acessam sessoes autorizadas" 
ON sessions FOR ALL 
USING (group_id IN (SELECT group_id FROM group_professionals WHERE user_id = auth.uid()));

CREATE POLICY "Profissionais acessam participantes autorizados" 
ON participants FOR ALL 
USING (group_id IN (SELECT group_id FROM group_professionals WHERE user_id = auth.uid()));
