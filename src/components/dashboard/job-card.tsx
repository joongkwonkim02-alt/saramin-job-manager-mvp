import Link from "next/link";

import { changeJobStatusAction } from "@/app/actions/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PendingButton } from "@/components/ui/pending-button";
import type { JobStatus, JobWithRelations } from "@/lib/types";
import { displayOrDash, formatKrw, toDateText } from "@/lib/utils";

interface JobCardProps {
  job: JobWithRelations;
}

const STATUS_LABEL: Record<JobStatus, string> = {
  active: "검토중",
  approved: "승인",
  rejected: "거절",
  hold: "보류",
  expired: "마감",
};

function JobStatusButton({
  jobId,
  toStatus,
  label,
}: {
  jobId: string;
  toStatus: JobStatus;
  label: string;
}) {
  return (
    <form action={changeJobStatusAction}>
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="toStatus" value={toStatus} />
      <PendingButton size="sm" pendingLabel="저장 중..." variant="outline">
        {label}
      </PendingButton>
    </form>
  );
}

function LinkOrDash({ href, label }: { href: string | null | undefined; label: string }) {
  if (!href) {
    return <span>-</span>;
  }

  return (
    <Link href={href} target="_blank" className="text-slate-900 underline dark:text-slate-100">
      {label}
    </Link>
  );
}

export function JobCard({ job }: JobCardProps) {
  const company = job.company;
  const jobplanet = job.externalLinks.jobplanet;
  const blind = job.externalLinks.blind;

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-lg font-semibold">{displayOrDash(company?.display_name)}</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{job.title}</p>
          </div>
          <Badge variant="secondary">{STATUS_LABEL[job.status]}</Badge>
        </div>

        <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">지역</dt>
            <dd>{displayOrDash(job.location)}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">사원수</dt>
            <dd>{displayOrDash(company?.employee_count)}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">업종</dt>
            <dd>{displayOrDash(company?.industry)}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">기업형태</dt>
            <dd>{displayOrDash(company?.company_type)}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">평균 연봉</dt>
            <dd>{formatKrw(company?.average_salary)}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">대졸 초임</dt>
            <dd>{formatKrw(company?.starting_salary)}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">공고상 급여</dt>
            <dd>{displayOrDash(job.salary_text)}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">마감일</dt>
            <dd>{toDateText(job.deadline)}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">사람인 공고</dt>
            <dd>
              <LinkOrDash href={job.source_url} label="공고 보기" />
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">잡플래닛</dt>
            <dd className="space-x-2">
              <span>{displayOrDash(jobplanet?.rating)}</span>
              <LinkOrDash href={jobplanet?.url} label="링크" />
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">블라인드</dt>
            <dd className="space-x-2">
              <span>{displayOrDash(blind?.rating)}</span>
              <LinkOrDash href={blind?.url} label="링크" />
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2">
          <JobStatusButton jobId={job.id} toStatus="approved" label="승인" />
          <JobStatusButton jobId={job.id} toStatus="rejected" label="거절" />
          <JobStatusButton jobId={job.id} toStatus="hold" label="보류" />
          <JobStatusButton jobId={job.id} toStatus="active" label="검토중" />

          {job.status === "approved" && job.company_id ? (
            <Link href={`/companies/${job.company_id}/analysis`}>
              <Button size="sm" variant="default">
                기업 분석하기
              </Button>
            </Link>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
