export type JobStatus = "active" | "approved" | "rejected" | "hold" | "expired";
export type OAuthProvider = "email" | "google" | "kakao" | "naver";
export type ExternalLinkSource = "saramin" | "jobplanet" | "blind" | "news";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FilterPreset {
  id: string;
  user_id: string;
  name: string;
  search_keywords: string[];
  job_roles: string[];
  locations: string[];
  career_levels: string[];
  education_levels: string[];
  is_default: boolean;
  collapsed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  normalized_name: string;
  display_name: string;
  industry: string | null;
  company_type: string | null;
  employee_count: number | null;
  average_salary: number | null;
  starting_salary: number | null;
  created_at: string;
  updated_at: string;
}

export interface ExternalCompanyLink {
  id: string;
  company_id: string;
  source: ExternalLinkSource;
  url: string;
  rating: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  user_id: string;
  preset_id: string | null;
  company_id: string | null;
  source_name: string;
  source_url: string | null;
  source_job_id: string | null;
  dedupe_hash: string;
  title: string;
  location: string | null;
  salary_text: string | null;
  deadline: string | null;
  status: JobStatus;
  discovered_at: string;
  raw_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface JobWithRelations extends Job {
  company: Company | null;
  externalLinks: Partial<Record<"jobplanet" | "blind", ExternalCompanyLink>>;
}

export interface UpdateRun {
  id: string;
  user_id: string;
  preset_id: string | null;
  provider_name: string;
  status: "running" | "completed" | "failed";
  new_count: number;
  duplicate_count: number;
  expired_count: number;
  started_at: string;
  finished_at: string | null;
  error_message: string | null;
  raw_payload: Record<string, unknown>;
}

export interface CompanyAnalysisTemplate {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  tab_order: string[];
  section_schema: Array<{ key: string; title: string; description?: string }>;
  created_at: string;
  updated_at: string;
}

export interface CompanyAnalysisRecord {
  id: string;
  user_id: string;
  company_id: string;
  template_id: string | null;
  comparison_set_id: string | null;
  summary: string | null;
  recommendation: string | null;
  score_total: number | null;
  status: "draft" | "in_review" | "final";
  created_at: string;
  updated_at: string;
}

export interface AnalysisScore {
  id: string;
  record_id: string;
  metric_key: string;
  metric_label: string;
  score: number;
  weight: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalysisSection {
  id: string;
  record_id: string;
  section_key: string;
  title: string;
  content: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CompanyComparisonSet {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyComparisonItem {
  id: string;
  set_id: string;
  company_id: string;
  position: number;
  created_at: string;
}
