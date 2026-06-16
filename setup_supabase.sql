-- Remover tabelas antigas para evitar conflito (CUIDADO: Isso apaga os dados antigos de testes)
DROP TABLE IF EXISTS public.attendees CASCADE;
DROP TABLE IF EXISTS public.event_metadata CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;

-- Criar tabela de eventos
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  "eventTitle" TEXT NOT NULL,
  local TEXT,
  date TEXT,
  anciao TEXT,
  regionais TEXT,
  palavra TEXT,
  hinos TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela de participantes (attendees) com referência ao evento
CREATE TABLE public.attendees (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ministry TEXT NOT NULL,
  role TEXT NOT NULL,
  instrument TEXT NOT NULL,
  level TEXT NOT NULL,
  city TEXT NOT NULL,
  timestamp BIGINT NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendees ENABLE ROW LEVEL SECURITY;

-- Permissões para acesso público
CREATE POLICY "Allow all for anon on events" ON public.events FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon on attendees" ON public.attendees FOR ALL TO anon USING (true) WITH CHECK (true);
