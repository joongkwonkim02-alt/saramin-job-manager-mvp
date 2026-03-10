import { signOutAction } from "@/app/actions/auth";
import { FilterPresetsPanel } from "@/components/dashboard/filter-presets-panel";
import { JobCard } from "@/components/dashboard/job-card";
import { StatusTabs } from "@/components/dashboard/status-tabs";
import { UpdateJobsButton } from "@/components/dashboard/update-jobs-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import {
  ensureBootstrapPreset,
  getJobStatusCounts,
  getLatestUpdateRun,
  listFilterPresets,
  listJobsByStatus,
} from "@/lib/services/repository";
import type { JobStatus } from "@/lib/types";

interface DashboardPageProps {
  searchParams: Promise<{ status?: string; preset?: string }>;
}

const VALID_STATUSES: JobStatus[] = ["active", "approved", "rejected", "hold", "expired"];

function parseStatus(input: string | undefined): JobStatus {
  if (!input) {
    return "active";
  }

  return VALID_STATUSES.includes(input as JobStatus) ? (input as JobStatus) : "active";
}

function summarize(values: string[]) {
  return values.length ? values.join(", ") : "-";
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await requireUser();
  const query = await searchParams;

  const fallbackPreset = await ensureBootstrapPreset(user.id);
  const presets = await listFilterPresets(user.id);

  const selectedPreset =
    presets.find((preset) => preset.id === query.preset) ||
    presets.find((preset) => preset.is_default) ||
    presets[0] ||
    fallbackPreset;

  const status = parseStatus(query.status);

  const [jobs, statusCounts, latestRun] = await Promise.all([
    listJobsByStatus(user.id, status),
    getJobStatusCounts(user.id),
    getLatestUpdateRun(user.id),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">취업 공고 관리 대시보드</h1>
            <p className="text-sm text-slate-600">반자동 수집 + 승인/거절/보류 + 기업 분석 진입</p>
          </div>
          <form action={signOutAction}>
            <Button variant="outline" type="submit">
              로그아웃
            </Button>
          </form>
        </header>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>선택 프리셋 요약</CardTitle>
              <p className="mt-1 text-sm text-slate-600">{selectedPreset.name}</p>
              <p className="mt-1 text-sm text-slate-600">검색어: {summarize(selectedPreset.search_keywords)}</p>
              <p className="text-sm text-slate-600">직무: {summarize(selectedPreset.job_roles)}</p>
              <p className="text-sm text-slate-600">지역: {summarize(selectedPreset.locations)}</p>
            </div>
            <UpdateJobsButton presetId={selectedPreset.id} latestRun={latestRun} />
          </CardHeader>
          <CardContent>
            <StatusTabs status={status} presetId={selectedPreset.id} counts={statusCounts} />
          </CardContent>
        </Card>

        <FilterPresetsPanel
          presets={presets}
          selectedPresetId={selectedPreset.id}
          currentStatus={status}
        />

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">공고 목록</h2>
          {jobs.length ? (
            <div className="space-y-3">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-sm text-slate-600">
                현재 상태 탭에 해당하는 공고가 없습니다.
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </main>
  );
}
