"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  addToComparisonSetAction,
  updateAnalysisMetaAction,
  upsertAnalysisScoreAction,
  upsertAnalysisSectionAction,
} from "@/app/actions/analysis";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type {
  AnalysisScore,
  AnalysisSection,
  Company,
  CompanyAnalysisRecord,
  CompanyAnalysisTemplate,
  ExternalCompanyLink,
  Job,
} from "@/lib/types";
import { displayOrDash } from "@/lib/utils";

interface AnalysisWorkspaceProps {
  company: Company;
  record: CompanyAnalysisRecord;
  template: CompanyAnalysisTemplate;
  approvedJobs: Job[];
  links: ExternalCompanyLink[];
  scores: AnalysisScore[];
  sections: AnalysisSection[];
}

export function AnalysisWorkspace({
  company,
  record,
  template,
  approvedJobs,
  links,
  scores,
  sections,
}: AnalysisWorkspaceProps) {
  const [metaState, metaAction] = useActionState(updateAnalysisMetaAction, {
    ok: false,
    message: "",
  });
  const [scoreState, scoreAction] = useActionState(upsertAnalysisScoreAction, {
    ok: false,
    message: "",
  });
  const [sectionState, sectionAction] = useActionState(
    upsertAnalysisSectionAction,
    {
      ok: false,
      message: "",
    },
  );

  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">분석 개요</TabsTrigger>
        <TabsTrigger value="scores">점수</TabsTrigger>
        <TabsTrigger value="sections">섹션</TabsTrigger>
        <TabsTrigger value="links">외부 링크</TabsTrigger>
        <TabsTrigger value="compare">비교 확장</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm md:grid-cols-2">
            <p>회사명: {company.display_name}</p>
            <p>업종: {displayOrDash(company.industry)}</p>
            <p>기업형태: {displayOrDash(company.company_type)}</p>
            <p>사원수: {displayOrDash(company.employee_count)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>승인된 공고</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {approvedJobs.map((job) => (
              <div key={job.id} className="rounded border p-2">
                <p className="font-medium">{job.title}</p>
                <p className="text-slate-600 dark:text-slate-300">마감일: {displayOrDash(job.deadline)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>분석 메타 저장</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={metaAction} className="space-y-3">
              <input type="hidden" name="recordId" value={record.id} />
              <input type="hidden" name="companyId" value={company.id} />

              <div className="space-y-1">
                <Label htmlFor="summary">요약</Label>
                <Textarea id="summary" name="summary" defaultValue={record.summary ?? ""} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="recommendation">추천/비추천 코멘트</Label>
                <Textarea
                  id="recommendation"
                  name="recommendation"
                  defaultValue={record.recommendation ?? ""}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="status">상태</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue={record.status}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="draft">draft</option>
                  <option value="in_review">in_review</option>
                  <option value="final">final</option>
                </select>
              </div>

              <PendingButton pendingLabel="저장 중...">분석 개요 저장</PendingButton>
            </form>
            {metaState.message ? (
              <p className={`mt-2 text-sm ${metaState.ok ? "text-emerald-600" : "text-red-600"}`}>
                {metaState.message}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="scores" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>저장된 점수</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {scores.length ? (
              scores.map((score) => (
                <div key={score.id} className="flex items-center justify-between rounded border p-2">
                  <div>
                    <p className="font-medium">{score.metric_label}</p>
                    <p className="text-slate-600 dark:text-slate-300">{score.metric_key}</p>
                  </div>
                  <Badge variant="secondary">{score.score}</Badge>
                </div>
              ))
            ) : (
              <p className="text-slate-600 dark:text-slate-300">아직 점수가 없습니다.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>점수 추가/수정</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={scoreAction} className="grid gap-2 md:grid-cols-2">
              <input type="hidden" name="recordId" value={record.id} />
              <input type="hidden" name="companyId" value={company.id} />

              <div className="space-y-1">
                <Label htmlFor="metricKey">Metric Key</Label>
                <Input id="metricKey" name="metricKey" placeholder="culture_fit" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="metricLabel">Metric Label</Label>
                <Input id="metricLabel" name="metricLabel" placeholder="문화 적합도" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="score">점수(0~100)</Label>
                <Input id="score" name="score" type="number" min={0} max={100} step="0.1" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="weight">가중치</Label>
                <Input id="weight" name="weight" type="number" min={0} max={10} step="0.1" defaultValue={1} required />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="note">메모</Label>
                <Textarea id="note" name="note" />
              </div>
              <div className="md:col-span-2">
                <PendingButton pendingLabel="저장 중...">점수 저장</PendingButton>
              </div>
            </form>

            {scoreState.message ? (
              <p className={`mt-2 text-sm ${scoreState.ok ? "text-emerald-600" : "text-red-600"}`}>
                {scoreState.message}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="sections" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>템플릿 섹션 구조</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {template.section_schema.map((section) => (
              <div key={section.key} className="rounded border p-2">
                <p className="font-medium">{section.title}</p>
                <p className="text-slate-600 dark:text-slate-300">key: {section.key}</p>
                {section.description ? (
                  <p className="text-slate-500 dark:text-slate-400">{section.description}</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>저장된 섹션</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {sections.length ? (
              sections.map((section) => (
                <div key={section.id} className="rounded border p-2">
                  <p className="font-medium">{section.title}</p>
                  <p className="text-slate-500 dark:text-slate-400">key: {section.section_key}</p>
                  <p>{displayOrDash(section.content)}</p>
                </div>
              ))
            ) : (
              <p className="text-slate-600 dark:text-slate-300">아직 저장된 섹션이 없습니다.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>섹션 추가/수정</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={sectionAction} className="grid gap-2 md:grid-cols-2">
              <input type="hidden" name="recordId" value={record.id} />
              <input type="hidden" name="companyId" value={company.id} />

              <div className="space-y-1">
                <Label htmlFor="sectionKey">Section Key</Label>
                <Input id="sectionKey" name="sectionKey" placeholder="business" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="title">섹션 제목</Label>
                <Input id="title" name="title" placeholder="사업/제품" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sortOrder">정렬 순서</Label>
                <Input id="sortOrder" name="sortOrder" type="number" defaultValue={0} min={0} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="content">내용</Label>
                <Textarea id="content" name="content" />
              </div>
              <div className="md:col-span-2">
                <PendingButton pendingLabel="저장 중...">섹션 저장</PendingButton>
              </div>
            </form>

            {sectionState.message ? (
              <p className={`mt-2 text-sm ${sectionState.ok ? "text-emerald-600" : "text-red-600"}`}>
                {sectionState.message}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="links" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>외부 링크 매칭</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {links.length ? (
              links.map((link) => (
                <div key={link.id} className="rounded border p-2">
                  <p className="font-medium">{link.source}</p>
                  <p>평점: {displayOrDash(link.rating)}</p>
                  <Link className="underline" href={link.url} target="_blank">
                    {link.url}
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-slate-600 dark:text-slate-300">연결된 외부 링크가 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="compare" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>비교 기능 확장 포인트</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
            <p>
              현재는 <code>company_comparison_sets</code>, <code>company_comparison_items</code> 구조로 비교 대상을
              저장합니다. 실제 비교 리포트 렌더링은 2차 구현 단계로 분리되어 있습니다.
            </p>
            <form action={addToComparisonSetAction} className="space-y-2">
              <input type="hidden" name="companyId" value={company.id} />
              <div className="space-y-1">
                <Label htmlFor="setName">비교 세트 이름</Label>
                <Input id="setName" name="setName" defaultValue="기본 비교" />
              </div>
              <PendingButton pendingLabel="추가 중...">비교 세트에 추가</PendingButton>
            </form>
            <Link className="font-semibold underline" href="/compare">
              비교 페이지로 이동
            </Link>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
