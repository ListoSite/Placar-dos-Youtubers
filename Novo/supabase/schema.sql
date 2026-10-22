-- Placar dos Youtubers: base de dados no Supabase.
-- Corre este ficheiro uma vez no Supabase: SQL Editor → New query → colar → Run.
-- Pode ser corrido outra vez sem estragar nada (só cria o que falta).

-- ---------------------------------------------------------------------------
-- Dados do site (só o servidor do site, com a chave service_role, lê e escreve)
-- ---------------------------------------------------------------------------

-- Pessoas, canais e projetos: uma linha cada. "dados" tem o registo completo;
-- as outras colunas são cópias para ser fácil procurar e ordenar no Supabase.
create table if not exists public.pessoas (
  id text primary key,
  nome text not null default '',
  categoria text not null default '',
  estado text not null default '',
  escondido boolean not null default false,
  dados jsonb not null,
  atualizado timestamptz not null default now()
);
create index if not exists pessoas_categoria on public.pessoas (categoria);

create table if not exists public.canais (
  id text primary key,
  pessoa_id text,
  titulo text not null default '',
  papel text not null default '',
  dados jsonb not null,
  atualizado timestamptz not null default now()
);
create index if not exists canais_pessoa on public.canais (pessoa_id);

create table if not exists public.projetos (
  id text primary key,
  nome text not null default '',
  pessoa_id text,
  dados jsonb not null,
  atualizado timestamptz not null default now()
);

-- Tudo o resto: definições, estatísticas, registos diários (snap/AAAA-MM), dados do Social Blade…
create table if not exists public.documentos (
  chave text primary key,
  dados jsonb not null,
  atualizado timestamptz not null default now()
);

-- Resultados do Palco (vídeos gravados): confrontos, estrelas dos torneios e coroas dos rankings
create table if not exists public.palco_resultados (
  id bigint generated always as identity primary key,
  criado timestamptz not null default now(),
  espetaculo text not null default '',
  tipo text not null check (tipo in ('duelo', 'titulo', 'coroa')),
  a text,
  b text,
  vencedor text not null,
  dados jsonb not null default '{}'::jsonb
);
create index if not exists palco_resultados_par on public.palco_resultados (a, b);
create index if not exists palco_resultados_vencedor on public.palco_resultados (vencedor);

alter table public.pessoas enable row level security;
alter table public.canais enable row level security;
alter table public.projetos enable row level security;
alter table public.documentos enable row level security;
alter table public.palco_resultados enable row level security;
-- Sem políticas: ninguém de fora lê nem escreve diretamente. O site serve os dados pela sua API.

-- ---------------------------------------------------------------------------
-- Votações (os visitantes votam com a conta Google)
-- ---------------------------------------------------------------------------
create table if not exists public.votacoes (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text not null default '',
  -- Lista de opções: [{ "id": "wuant", "nome": "Wuant", "pessoa": "wuant" }, …]
  opcoes jsonb not null default '[]'::jsonb,
  estado text not null default 'aberta' check (estado in ('rascunho', 'aberta', 'fechada')),
  abre timestamptz not null default now(),
  fecha timestamptz,
  mostrar_resultados boolean not null default true,
  criado timestamptz not null default now()
);

create table if not exists public.votos (
  votacao_id uuid not null references public.votacoes (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  opcao text not null,
  criado timestamptz not null default now(),
  primary key (votacao_id, user_id)
);
create index if not exists votos_votacao on public.votos (votacao_id, opcao);

alter table public.votacoes enable row level security;
alter table public.votos enable row level security;

-- Toda a gente vê as votações publicadas
drop policy if exists "votacoes publicadas" on public.votacoes;
create policy "votacoes publicadas" on public.votacoes
  for select to anon, authenticated
  using (estado <> 'rascunho');

-- Cada pessoa com sessão iniciada pelo Google vota uma vez por votação, numa opção válida, enquanto está aberta
-- (contas criadas por email ou anónimas não votam: assim não se fazem contas falsas em série)
drop policy if exists "votar uma vez" on public.votos;
create policy "votar uma vez" on public.votos
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') = 'google'
    and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
    and exists (
      select 1 from public.votacoes v
      where v.id = votacao_id
        and v.estado = 'aberta'
        and v.abre <= now()
        and (v.fecha is null or v.fecha > now())
        and exists (select 1 from jsonb_array_elements(v.opcoes) o where o ->> 'id' = opcao)
    )
  );

-- Cada pessoa vê só o seu próprio voto
drop policy if exists "ver o meu voto" on public.votos;
create policy "ver o meu voto" on public.votos
  for select to authenticated
  using (user_id = auth.uid());

-- Resultados (contagens), sem mostrar quem votou em quê
create or replace function public.resultados_votacao(v uuid)
returns table (opcao text, votos bigint)
language sql
security definer
set search_path = public
stable
as $$
  select vo.opcao, count(*)::bigint
  from public.votos vo
  join public.votacoes va on va.id = vo.votacao_id
  where vo.votacao_id = v
    and va.estado <> 'rascunho'
    and (va.mostrar_resultados or va.estado = 'fechada' or (va.fecha is not null and va.fecha <= now()))
  group by vo.opcao;
$$;
revoke all on function public.resultados_votacao(uuid) from public;
grant execute on function public.resultados_votacao(uuid) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Vídeos publicados (o que aparece na página pública, guardado ao gravar no Palco)
-- ---------------------------------------------------------------------------
create table if not exists public.palco_publicacoes (
  id bigint generated always as identity primary key,
  criado timestamptz not null default now(),
  espetaculo text not null default '',
  titulo text not null default '',
  tema text not null default '',
  formato text not null default '',
  link text not null default '',
  visivel boolean not null default true,
  dados jsonb not null default '{}'::jsonb
);
alter table public.palco_publicacoes enable row level security;
