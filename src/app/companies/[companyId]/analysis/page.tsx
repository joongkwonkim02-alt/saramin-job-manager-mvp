import Link from "next/link";
import { notFound } from "next/navigation";

import { AnalysisWorkspace } from "@/components/analysis/analysis-workspace";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import {
  ensureAnalysisRecord,
  ensureDefaultAnalysisTemplate,
  getAnalysisTemplateById,
  getApprovedJobsByCompany,
  getCompany,
  getCompanyLinks,
  listAnalysisScores,
  listAnalysisSections,
} from "@/lib/services/repository";

interface AnalysisPageProps {
  params: Promise<{ companyId: string }>;
}

export default async function CompanyAnalysisPage({ params }: AnalysisPageProps) {
  const user = await requireUser();
  const { companyId } = await params;

  const company = await getCompany(companyId);

  if (!company) {
    notFound();
  }

  const approvedJobs = await getApprovedJobsByCompany(user.id, companyId);

  if (!approvedJobs.length) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950">
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>접근 제한</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <p>승인된 공고에서만 기업 분석 페이지로 진입할 수 있습니다.</p>
              <Link className="font-semibold underline dark:text-slate-100" href="/dashboard?status=approved">
                승인함으로 이동
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const record = await ensureAnalysisRecord(user.id, companyId);
  const template =
    (await getAnalysisTemplateById(user.id, record.template_id)) ||
    (await ensureDefaultAnalysisTemplate(user.id));

  const [links, scores, sections] = await Promise.all([
    getCompanyLinks(companyId),
    listAnalysisScores(record.id),
    listAnalysisSections(record.id),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">기업 분석</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">{company.display_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">template: {template.name}</Badge>
            <Link className="text-sm font-semibold underline dark:text-slate-100" href="/dashboard?status=approved">
              승인함으로 복귀
            </Link>
          </div>
        </header>

        <AnalysisWorkspace
          company={company}
          record={record}
          template={template}
          approvedJobs={approvedJobs}
          links={links}
          scores={scores}
          sections={sections}
        />
      </div>
    </main>
  );
}
