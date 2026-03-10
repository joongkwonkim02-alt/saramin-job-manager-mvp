-- Optional seed helper for local/dev.
-- Run: select public.seed_user_mvp_data('<auth_user_uuid>');

create or replace function public.seed_user_mvp_data(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  preset_id uuid;
  company_a uuid;
  company_b uuid;
begin
  insert into public.filter_presets (
    user_id,
    name,
    search_keywords,
    job_roles,
    locations,
    career_levels,
    education_levels,
    is_default
  )
  values (
    target_user,
    '기본 프리셋',
    array['백엔드', '풀스택'],
    array['웹개발'],
    array['서울', '경기'],
    array['신입', '경력'],
    array['대졸'],
    true
  )
  on conflict do nothing
  returning id into preset_id;

  if preset_id is null then
    select id into preset_id
    from public.filter_presets
    where user_id = target_user
    order by is_default desc, created_at asc
    limit 1;
  end if;

  insert into public.companies (normalized_name, display_name, industry, company_type, employee_count, average_salary, starting_salary)
  values
    ('alphadata', '알파데이터', 'IT 서비스', '중견기업', 320, 5600, 4200),
    ('betacommerce', '베타커머스', '이커머스', '스타트업', 120, 5100, 3900)
  on conflict (normalized_name) do update set display_name = excluded.display_name;

  select id into company_a from public.companies where normalized_name = 'alphadata';
  select id into company_b from public.companies where normalized_name = 'betacommerce';

  insert into public.external_company_links (company_id, source, url, rating)
  values
    (company_a, 'jobplanet', 'https://www.jobplanet.co.kr/companies/alpha', 3.8),
    (company_a, 'blind', 'https://www.teamblind.com/kr/company/alpha', 3.6),
    (company_b, 'jobplanet', 'https://www.jobplanet.co.kr/companies/beta', 3.5),
    (company_b, 'blind', 'https://www.teamblind.com/kr/company/beta', 3.2)
  on conflict (company_id, source) do update set
    url = excluded.url,
    rating = excluded.rating,
    updated_at = now();

  insert into public.jobs (
    user_id,
    preset_id,
    company_id,
    source_name,
    source_url,
    source_job_id,
    dedupe_hash,
    title,
    location,
    salary_text,
    deadline,
    status,
    discovered_at
  )
  values
    (
      target_user,
      preset_id,
      company_a,
      'saramin',
      'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=1001',
      '1001',
      encode(digest('백엔드 엔지니어|알파데이터|2099-12-31', 'sha256'), 'hex'),
      '백엔드 엔지니어',
      '서울 강남구',
      '면접 후 결정',
      '2099-12-31',
      'active',
      now()
    ),
    (
      target_user,
      preset_id,
      company_b,
      'saramin',
      'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=1002',
      '1002',
      encode(digest('풀스택 개발자|베타커머스|2099-11-30', 'sha256'), 'hex'),
      '풀스택 개발자',
      '서울 송파구',
      '연봉 4,000~5,500만원',
      '2099-11-30',
      'hold',
      now()
    )
  on conflict do nothing;
end;
$$;
