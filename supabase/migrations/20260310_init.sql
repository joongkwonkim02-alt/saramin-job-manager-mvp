-- Supabase schema for Saramin Job Manager MVP
-- Run in SQL Editor or via Supabase CLI migration.

create extension if not exists pgcrypto;

create type public.job_status as enum ('active', 'approved', 'rejected', 'hold', 'expired');
create type public.oauth_provider as enum ('email', 'google', 'kakao', 'naver');
create type public.external_link_source as enum ('saramin', 'jobplanet', 'blind', 'news');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  failed_login_attempts integer not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index users_email_unique_idx on public.users ((lower(email)));

create table public.oauth_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider public.oauth_provider not null,
  provider_user_id text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_user_id),
  unique (user_id, provider)
);

create table public.filter_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  search_keywords text[] not null default '{}',
  job_roles text[] not null default '{}',
  locations text[] not null default '{}',
  career_levels text[] not null default '{}',
  education_levels text[] not null default '{}',
  is_default boolean not null default false,
  collapsed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index filter_presets_default_unique_idx on public.filter_presets (user_id)
where is_default = true;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  normalized_name text not null unique,
  display_name text not null,
  industry text,
  company_type text,
  employee_count integer,
  average_salary integer,
  starting_salary integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.external_company_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  source public.external_link_source not null,
  url text not null,
  rating numeric(3, 2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, source)
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  preset_id uuid references public.filter_presets(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  source_name text not null default 'saramin',
  source_url text,
  source_job_id text,
  dedupe_hash text not null,
  title text not null,
  location text,
  salary_text text,
  deadline date,
  status public.job_status not null default 'active',
  discovered_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index jobs_source_url_unique_idx on public.jobs (user_id, source_url)
where source_url is not null;

create unique index jobs_source_job_id_unique_idx on public.jobs (user_id, source_job_id)
where source_job_id is not null;

create unique index jobs_dedupe_hash_unique_idx on public.jobs (user_id, dedupe_hash);
create index jobs_user_status_deadline_idx on public.jobs (user_id, status, deadline);

create table public.job_state_logs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  from_status public.job_status,
  to_status public.job_status not null,
  reason text,
  created_at timestamptz not null default now()
);

create index job_state_logs_job_idx on public.job_state_logs (job_id, created_at desc);

create table public.update_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  preset_id uuid references public.filter_presets(id) on delete set null,
  provider_name text not null default 'mock-saramin',
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  new_count integer not null default 0,
  duplicate_count integer not null default 0,
  expired_count integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error_message text,
  raw_payload jsonb not null default '{}'::jsonb
);

create index update_runs_user_started_idx on public.update_runs (user_id, started_at desc);

create table public.company_analysis_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  tab_order text[] not null default '{overview,scores,sections,external_links,compare}',
  section_schema jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create unique index company_analysis_templates_default_unique_idx on public.company_analysis_templates (user_id)
where is_default = true;

create table public.company_comparison_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.company_analysis_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  template_id uuid references public.company_analysis_templates(id) on delete set null,
  comparison_set_id uuid references public.company_comparison_sets(id) on delete set null,
  summary text,
  recommendation text,
  score_total numeric(5, 2),
  status text not null default 'draft' check (status in ('draft', 'in_review', 'final')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, company_id)
);

create table public.analysis_scores (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.company_analysis_records(id) on delete cascade,
  metric_key text not null,
  metric_label text not null,
  score numeric(5, 2) not null,
  weight numeric(4, 2) not null default 1,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (record_id, metric_key)
);

create table public.analysis_sections (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.company_analysis_records(id) on delete cascade,
  section_key text not null,
  title text not null,
  content text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (record_id, section_key)
);

create table public.company_comparison_items (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.company_comparison_sets(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (set_id, company_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    lower(coalesce(new.email, '')),
    coalesce(new.raw_user_meta_data ->> 'full_name', null)
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, public.users.full_name),
      updated_at = now();

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

create trigger users_set_updated_at
before update on public.users
for each row execute procedure public.set_updated_at();

create trigger oauth_accounts_set_updated_at
before update on public.oauth_accounts
for each row execute procedure public.set_updated_at();

create trigger filter_presets_set_updated_at
before update on public.filter_presets
for each row execute procedure public.set_updated_at();

create trigger companies_set_updated_at
before update on public.companies
for each row execute procedure public.set_updated_at();

create trigger external_company_links_set_updated_at
before update on public.external_company_links
for each row execute procedure public.set_updated_at();

create trigger jobs_set_updated_at
before update on public.jobs
for each row execute procedure public.set_updated_at();

create trigger company_analysis_templates_set_updated_at
before update on public.company_analysis_templates
for each row execute procedure public.set_updated_at();

create trigger company_analysis_records_set_updated_at
before update on public.company_analysis_records
for each row execute procedure public.set_updated_at();

create trigger analysis_scores_set_updated_at
before update on public.analysis_scores
for each row execute procedure public.set_updated_at();

create trigger analysis_sections_set_updated_at
before update on public.analysis_sections
for each row execute procedure public.set_updated_at();

create trigger company_comparison_sets_set_updated_at
before update on public.company_comparison_sets
for each row execute procedure public.set_updated_at();

alter table public.users enable row level security;
alter table public.oauth_accounts enable row level security;
alter table public.filter_presets enable row level security;
alter table public.jobs enable row level security;
alter table public.job_state_logs enable row level security;
alter table public.update_runs enable row level security;
alter table public.company_analysis_templates enable row level security;
alter table public.company_analysis_records enable row level security;
alter table public.analysis_scores enable row level security;
alter table public.analysis_sections enable row level security;
alter table public.company_comparison_sets enable row level security;
alter table public.company_comparison_items enable row level security;
alter table public.companies enable row level security;
alter table public.external_company_links enable row level security;

create policy "users_own_row" on public.users
for all to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "oauth_accounts_owner" on public.oauth_accounts
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "filter_presets_owner" on public.filter_presets
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "jobs_owner" on public.jobs
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "job_state_logs_owner" on public.job_state_logs
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "update_runs_owner" on public.update_runs
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "company_analysis_templates_owner" on public.company_analysis_templates
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "company_analysis_records_owner" on public.company_analysis_records
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "analysis_scores_owner" on public.analysis_scores
for all to authenticated
using (
  exists (
    select 1
    from public.company_analysis_records r
    where r.id = analysis_scores.record_id
      and r.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.company_analysis_records r
    where r.id = analysis_scores.record_id
      and r.user_id = auth.uid()
  )
);

create policy "analysis_sections_owner" on public.analysis_sections
for all to authenticated
using (
  exists (
    select 1
    from public.company_analysis_records r
    where r.id = analysis_sections.record_id
      and r.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.company_analysis_records r
    where r.id = analysis_sections.record_id
      and r.user_id = auth.uid()
  )
);

create policy "comparison_sets_owner" on public.company_comparison_sets
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "comparison_items_owner" on public.company_comparison_items
for all to authenticated
using (
  exists (
    select 1
    from public.company_comparison_sets s
    where s.id = company_comparison_items.set_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.company_comparison_sets s
    where s.id = company_comparison_items.set_id
      and s.user_id = auth.uid()
  )
);

create policy "companies_readable" on public.companies
for select to authenticated
using (true);

create policy "external_company_links_readable" on public.external_company_links
for select to authenticated
using (true);
