import { isBefore, parseISO } from "date-fns";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  AnalysisScore,
  AnalysisSection,
  Company,
  CompanyAnalysisRecord,
  CompanyAnalysisTemplate,
  CompanyComparisonItem,
  CompanyComparisonSet,
  ExternalCompanyLink,
  FilterPreset,
  Job,
  JobStatus,
  JobWithRelations,
  UpdateRun,
} from "@/lib/types";

function toMap<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.id, row]));
}

export async function listFilterPresets(userId: string): Promise<FilterPreset[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("filter_presets")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as FilterPreset[];
}

export async function ensureBootstrapPreset(userId: string): Promise<FilterPreset> {
  const presets = await listFilterPresets(userId);

  if (presets.length) {
    return presets.find((preset) => preset.is_default) ?? presets[0];
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("filter_presets")
    .insert({
      user_id: userId,
      name: "기본 프리셋",
      search_keywords: ["백엔드", "풀스택"],
      job_roles: ["개발자"],
      locations: ["서울", "경기"],
      career_levels: ["신입", "경력"],
      education_levels: ["대졸"],
      is_default: true,
      collapsed: false,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as FilterPreset;
}

export async function createFilterPreset(input: {
  userId: string;
  name: string;
  searchKeywords: string[];
  jobRoles: string[];
  locations: string[];
  careerLevels: string[];
  educationLevels: string[];
}): Promise<FilterPreset> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("filter_presets")
    .insert({
      user_id: input.userId,
      name: input.name,
      search_keywords: input.searchKeywords,
      job_roles: input.jobRoles,
      locations: input.locations,
      career_levels: input.careerLevels,
      education_levels: input.educationLevels,
      is_default: false,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as FilterPreset;
}

export async function setDefaultPreset(userId: string, presetId: string): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { error: resetError } = await admin
    .from("filter_presets")
    .update({ is_default: false })
    .eq("user_id", userId)
    .eq("is_default", true);

  if (resetError) {
    throw resetError;
  }

  const { error } = await admin
    .from("filter_presets")
    .update({ is_default: true })
    .eq("user_id", userId)
    .eq("id", presetId);

  if (error) {
    throw error;
  }
}

export async function setPresetCollapsed(
  userId: string,
  presetId: string,
  collapsed: boolean,
): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from("filter_presets")
    .update({ collapsed })
    .eq("user_id", userId)
    .eq("id", presetId);

  if (error) {
    throw error;
  }
}

export async function getPresetById(userId: string, presetId: string): Promise<FilterPreset | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("filter_presets")
    .select("*")
    .eq("user_id", userId)
    .eq("id", presetId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as FilterPreset | null) ?? null;
}

export async function listJobsByStatus(userId: string, status: JobStatus): Promise<JobWithRelations[]> {
  const admin = createSupabaseAdminClient();
  const { data: jobs, error: jobsError } = await admin
    .from("jobs")
    .select("*")
    .eq("user_id", userId)
    .eq("status", status)
    .order("deadline", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (jobsError) {
    throw jobsError;
  }

  const jobRows = (jobs ?? []) as Job[];
  const companyIds = jobRows.map((job) => job.company_id).filter((id): id is string => Boolean(id));

  if (!companyIds.length) {
    return jobRows.map((job) => ({
      ...job,
      company: null,
      externalLinks: {},
    }));
  }

  const [companyResponse, linkResponse] = await Promise.all([
    admin.from("companies").select("*").in("id", companyIds),
    admin.from("external_company_links").select("*").in("company_id", companyIds),
  ]);

  if (companyResponse.error) {
    throw companyResponse.error;
  }

  if (linkResponse.error) {
    throw linkResponse.error;
  }

  const companies = (companyResponse.data ?? []) as Company[];
  const links = (linkResponse.data ?? []) as ExternalCompanyLink[];

  const companyMap = toMap(companies);
  const linksByCompany = new Map<string, Partial<Record<"jobplanet" | "blind", ExternalCompanyLink>>>();

  for (const link of links) {
    if (link.source !== "jobplanet" && link.source !== "blind") {
      continue;
    }

    const current = linksByCompany.get(link.company_id) ?? {};
    current[link.source] = link;
    linksByCompany.set(link.company_id, current);
  }

  return jobRows.map((job) => ({
    ...job,
    company: job.company_id ? companyMap.get(job.company_id) ?? null : null,
    externalLinks: job.company_id ? linksByCompany.get(job.company_id) ?? {} : {},
  }));
}

export async function getJobStatusCounts(
  userId: string,
): Promise<Record<JobStatus, number>> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("jobs")
    .select("status")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  const counts: Record<JobStatus, number> = {
    active: 0,
    approved: 0,
    rejected: 0,
    hold: 0,
    expired: 0,
  };

  for (const row of data ?? []) {
    const status = row.status as JobStatus;
    counts[status] += 1;
  }

  return counts;
}

export async function listAllJobsForUser(userId: string): Promise<Job[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("jobs")
    .select("id, source_url, source_job_id, dedupe_hash")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return (data ?? []) as Job[];
}

export async function createJob(input: {
  userId: string;
  presetId: string;
  companyId: string;
  sourceName: string;
  sourceUrl: string;
  sourceJobId: string;
  dedupeHash: string;
  title: string;
  location: string;
  salaryText: string | null;
  deadline: string | null;
  status: JobStatus;
  rawPayload: Record<string, unknown>;
}): Promise<Job> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("jobs")
    .insert({
      user_id: input.userId,
      preset_id: input.presetId,
      company_id: input.companyId,
      source_name: input.sourceName,
      source_url: input.sourceUrl,
      source_job_id: input.sourceJobId,
      dedupe_hash: input.dedupeHash,
      title: input.title,
      location: input.location,
      salary_text: input.salaryText,
      deadline: input.deadline,
      status: input.status,
      raw_payload: input.rawPayload,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Job;
}

export async function upsertCompany(input: {
  normalizedName: string;
  displayName: string;
  industry: string | null;
  companyType: string | null;
  employeeCount: number | null;
  averageSalary: number | null;
  startingSalary: number | null;
}): Promise<Company> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("companies")
    .upsert(
      {
        normalized_name: input.normalizedName,
        display_name: input.displayName,
        industry: input.industry,
        company_type: input.companyType,
        employee_count: input.employeeCount,
        average_salary: input.averageSalary,
        starting_salary: input.startingSalary,
      },
      { onConflict: "normalized_name" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Company;
}

export async function upsertExternalCompanyLink(input: {
  companyId: string;
  source: "jobplanet" | "blind";
  url: string;
  rating: number | null;
}): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { error } = await admin.from("external_company_links").upsert(
    {
      company_id: input.companyId,
      source: input.source,
      url: input.url,
      rating: input.rating,
    },
    { onConflict: "company_id,source" },
  );

  if (error) {
    throw error;
  }
}

export async function logJobState(input: {
  jobId: string;
  userId: string;
  fromStatus: JobStatus | null;
  toStatus: JobStatus;
  reason: string;
}): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { error } = await admin.from("job_state_logs").insert({
    job_id: input.jobId,
    user_id: input.userId,
    from_status: input.fromStatus,
    to_status: input.toStatus,
    reason: input.reason,
  });

  if (error) {
    throw error;
  }
}

export async function updateJobStatus(input: {
  jobId: string;
  userId: string;
  toStatus: JobStatus;
  reason: string;
}): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { data: existing, error: selectError } = await admin
    .from("jobs")
    .select("id, status")
    .eq("id", input.jobId)
    .eq("user_id", input.userId)
    .single();

  if (selectError) {
    throw selectError;
  }

  const fromStatus = (existing.status as JobStatus) ?? null;

  const { error: updateError } = await admin
    .from("jobs")
    .update({ status: input.toStatus })
    .eq("id", input.jobId)
    .eq("user_id", input.userId);

  if (updateError) {
    throw updateError;
  }

  await logJobState({
    jobId: input.jobId,
    userId: input.userId,
    fromStatus,
    toStatus: input.toStatus,
    reason: input.reason,
  });
}

export async function expirePastJobs(userId: string): Promise<number> {
  const admin = createSupabaseAdminClient();
  const today = new Date();

  const { data: candidates, error: selectError } = await admin
    .from("jobs")
    .select("id, status, deadline")
    .eq("user_id", userId)
    .neq("status", "expired")
    .not("deadline", "is", null);

  if (selectError) {
    throw selectError;
  }

  const expiredTargets = (candidates ?? []).filter((job) =>
    isBefore(parseISO(job.deadline as string), today),
  );

  if (!expiredTargets.length) {
    return 0;
  }

  const ids = expiredTargets.map((job) => job.id as string);

  const { error: updateError } = await admin
    .from("jobs")
    .update({ status: "expired" })
    .eq("user_id", userId)
    .in("id", ids);

  if (updateError) {
    throw updateError;
  }

  await Promise.all(
    expiredTargets.map((target) =>
      logJobState({
        jobId: target.id as string,
        userId,
        fromStatus: target.status as JobStatus,
        toStatus: "expired",
        reason: "deadline_expired",
      }),
    ),
  );

  return ids.length;
}

export async function createUpdateRun(input: {
  userId: string;
  presetId: string;
  providerName: string;
}): Promise<UpdateRun> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("update_runs")
    .insert({
      user_id: input.userId,
      preset_id: input.presetId,
      provider_name: input.providerName,
      status: "running",
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as UpdateRun;
}

export async function finishUpdateRun(input: {
  runId: string;
  status: "completed" | "failed";
  newCount: number;
  duplicateCount: number;
  expiredCount: number;
  errorMessage?: string;
  rawPayload?: Record<string, unknown>;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("update_runs")
    .update({
      status: input.status,
      new_count: input.newCount,
      duplicate_count: input.duplicateCount,
      expired_count: input.expiredCount,
      finished_at: new Date().toISOString(),
      error_message: input.errorMessage ?? null,
      raw_payload: input.rawPayload ?? {},
    })
    .eq("id", input.runId);

  if (error) {
    throw error;
  }
}

export async function getLatestUpdateRun(userId: string): Promise<UpdateRun | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("update_runs")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as UpdateRun | null) ?? null;
}

export async function ensureDefaultAnalysisTemplate(userId: string): Promise<CompanyAnalysisTemplate> {
  const admin = createSupabaseAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("company_analysis_templates")
    .select("*")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return existing as CompanyAnalysisTemplate;
  }

  const sectionSchema = [
    { key: "business", title: "사업/제품", description: "BM과 제품 경쟁력" },
    { key: "culture", title: "조직문화", description: "리더십, 팀 문화, 성장환경" },
    { key: "tech", title: "기술스택", description: "실무 기술 적합성" },
    { key: "risk", title: "리스크", description: "재무/평판/리스크 요약" },
  ];

  const { data, error } = await admin
    .from("company_analysis_templates")
    .insert({
      user_id: userId,
      name: "기본 분석 템플릿",
      is_default: true,
      tab_order: ["overview", "scores", "sections", "external_links", "compare"],
      section_schema: sectionSchema,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as CompanyAnalysisTemplate;
}

export async function getAnalysisTemplateById(
  userId: string,
  templateId: string | null,
): Promise<CompanyAnalysisTemplate | null> {
  if (!templateId) {
    return null;
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("company_analysis_templates")
    .select("*")
    .eq("id", templateId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as CompanyAnalysisTemplate | null) ?? null;
}

export async function ensureAnalysisRecord(
  userId: string,
  companyId: string,
): Promise<CompanyAnalysisRecord> {
  const admin = createSupabaseAdminClient();

  const { data: existing, error: existingError } = await admin
    .from("company_analysis_records")
    .select("*")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return existing as CompanyAnalysisRecord;
  }

  const template = await ensureDefaultAnalysisTemplate(userId);

  const { data, error } = await admin
    .from("company_analysis_records")
    .insert({
      user_id: userId,
      company_id: companyId,
      template_id: template.id,
      summary: "",
      recommendation: "",
      status: "draft",
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as CompanyAnalysisRecord;
}

export async function getAnalysisRecordForUser(
  userId: string,
  recordId: string,
): Promise<CompanyAnalysisRecord | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("company_analysis_records")
    .select("*")
    .eq("id", recordId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as CompanyAnalysisRecord | null) ?? null;
}

export async function getCompany(companyId: string): Promise<Company | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("companies").select("*").eq("id", companyId).maybeSingle();

  if (error) {
    throw error;
  }

  return (data as Company | null) ?? null;
}

export async function getCompanyLinks(companyId: string): Promise<ExternalCompanyLink[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("external_company_links")
    .select("*")
    .eq("company_id", companyId)
    .order("source", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as ExternalCompanyLink[];
}

export async function getApprovedJobsByCompany(
  userId: string,
  companyId: string,
): Promise<Job[]> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("jobs")
    .select("*")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Job[];
}

export async function listAnalysisScores(recordId: string): Promise<AnalysisScore[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("analysis_scores")
    .select("*")
    .eq("record_id", recordId)
    .order("metric_label", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AnalysisScore[];
}

export async function listAnalysisSections(recordId: string): Promise<AnalysisSection[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("analysis_sections")
    .select("*")
    .eq("record_id", recordId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AnalysisSection[];
}

export async function upsertAnalysisScore(input: {
  recordId: string;
  metricKey: string;
  metricLabel: string;
  score: number;
  weight: number;
  note?: string;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("analysis_scores").upsert(
    {
      record_id: input.recordId,
      metric_key: input.metricKey,
      metric_label: input.metricLabel,
      score: input.score,
      weight: input.weight,
      note: input.note ?? null,
    },
    { onConflict: "record_id,metric_key" },
  );

  if (error) {
    throw error;
  }
}

export async function upsertAnalysisSection(input: {
  recordId: string;
  sectionKey: string;
  title: string;
  content: string;
  sortOrder: number;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("analysis_sections").upsert(
    {
      record_id: input.recordId,
      section_key: input.sectionKey,
      title: input.title,
      content: input.content,
      sort_order: input.sortOrder,
    },
    { onConflict: "record_id,section_key" },
  );

  if (error) {
    throw error;
  }
}

export async function updateAnalysisRecordMeta(input: {
  recordId: string;
  userId: string;
  summary: string;
  recommendation: string;
  status: "draft" | "in_review" | "final";
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("company_analysis_records")
    .update({
      summary: input.summary,
      recommendation: input.recommendation,
      status: input.status,
    })
    .eq("id", input.recordId)
    .eq("user_id", input.userId);

  if (error) {
    throw error;
  }
}

export async function addToComparisonSet(input: {
  userId: string;
  companyId: string;
  setName: string;
}): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { data: setRow, error: setError } = await admin
    .from("company_comparison_sets")
    .upsert(
      {
        user_id: input.userId,
        name: input.setName,
      },
      { onConflict: "user_id,name" },
    )
    .select("*")
    .single();

  if (setError) {
    throw setError;
  }

  const { data: maxPositionRow, error: positionError } = await admin
    .from("company_comparison_items")
    .select("position")
    .eq("set_id", setRow.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (positionError) {
    throw positionError;
  }

  const nextPosition = (maxPositionRow?.position ?? -1) + 1;

  const { error } = await admin.from("company_comparison_items").upsert(
    {
      set_id: setRow.id,
      company_id: input.companyId,
      position: nextPosition,
    },
    { onConflict: "set_id,company_id" },
  );

  if (error) {
    throw error;
  }
}

export async function listComparisonSets(userId: string): Promise<
  Array<
    CompanyComparisonSet & {
      items: Array<CompanyComparisonItem & { company: Company | null }>;
    }
  >
> {
  const admin = createSupabaseAdminClient();

  const { data: sets, error: setsError } = await admin
    .from("company_comparison_sets")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (setsError) {
    throw setsError;
  }

  const setRows = (sets ?? []) as CompanyComparisonSet[];

  if (!setRows.length) {
    return [];
  }

  const setIds = setRows.map((set) => set.id);
  const { data: items, error: itemsError } = await admin
    .from("company_comparison_items")
    .select("*")
    .in("set_id", setIds)
    .order("position", { ascending: true });

  if (itemsError) {
    throw itemsError;
  }

  const itemRows = (items ?? []) as CompanyComparisonItem[];
  const companyIds = [...new Set(itemRows.map((item) => item.company_id))];

  const { data: companies, error: companiesError } = await admin
    .from("companies")
    .select("*")
    .in("id", companyIds);

  if (companiesError) {
    throw companiesError;
  }

  const companyMap = toMap((companies ?? []) as Company[]);

  return setRows.map((set) => ({
    ...set,
    items: itemRows
      .filter((item) => item.set_id === set.id)
      .map((item) => ({
        ...item,
        company: companyMap.get(item.company_id) ?? null,
      })),
  }));
}
