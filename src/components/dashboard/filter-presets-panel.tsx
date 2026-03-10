"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  createPresetAction,
  setDefaultPresetAction,
  togglePresetCollapsedAction,
} from "@/app/actions/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import type { FilterPreset } from "@/lib/types";

interface FilterPresetsPanelProps {
  presets: FilterPreset[];
  selectedPresetId: string;
  currentStatus: string;
}

function summarize(values: string[]) {
  return values.length ? values.join(", ") : "-";
}

export function FilterPresetsPanel({
  presets,
  selectedPresetId,
  currentStatus,
}: FilterPresetsPanelProps) {
  const [createState, createAction] = useActionState(createPresetAction, {
    ok: false,
    message: "",
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>필터 프리셋 관리</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={createAction} className="grid gap-2 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="name">프리셋 이름</Label>
              <Input id="name" name="name" placeholder="예: 백엔드 신입" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="searchKeywords">검색어(쉼표 구분)</Label>
              <Input id="searchKeywords" name="searchKeywords" placeholder="백엔드, node, spring" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="jobRoles">직무(쉼표 구분)</Label>
              <Input id="jobRoles" name="jobRoles" placeholder="개발자, 플랫폼" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="locations">지역(쉼표 구분)</Label>
              <Input id="locations" name="locations" placeholder="서울, 경기" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="careerLevels">경력(쉼표 구분)</Label>
              <Input id="careerLevels" name="careerLevels" placeholder="신입, 경력" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="educationLevels">학력(쉼표 구분)</Label>
              <Input id="educationLevels" name="educationLevels" placeholder="대졸, 무관" />
            </div>
            <div className="md:col-span-2">
              <PendingButton pendingLabel="저장 중...">프리셋 저장</PendingButton>
            </div>
          </form>

          {createState.message ? (
            <p className={`text-sm ${createState.ok ? "text-emerald-600" : "text-red-600"}`}>
              {createState.message}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        {presets.map((preset) => (
          <Card key={preset.id} className={preset.id === selectedPresetId ? "border-slate-900" : undefined}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{preset.name}</p>
                {preset.is_default ? <Badge variant="success">기본</Badge> : null}
                {preset.id === selectedPresetId ? <Badge variant="secondary">선택됨</Badge> : null}
              </div>

              <div className="space-y-1 text-sm text-slate-600">
                <p>검색어: {summarize(preset.search_keywords)}</p>
                {!preset.collapsed ? <p>직무: {summarize(preset.job_roles)}</p> : null}
                {!preset.collapsed ? <p>지역: {summarize(preset.locations)}</p> : null}
                {!preset.collapsed ? <p>경력: {summarize(preset.career_levels)}</p> : null}
                {!preset.collapsed ? <p>학력: {summarize(preset.education_levels)}</p> : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href={`/dashboard?preset=${preset.id}&status=${currentStatus}`}>
                  <Button type="button" variant="outline" size="sm">
                    이 프리셋으로 보기
                  </Button>
                </Link>

                <form action={setDefaultPresetAction}>
                  <input type="hidden" name="presetId" value={preset.id} />
                  <PendingButton size="sm" pendingLabel="적용 중..." variant="secondary" disabled={preset.is_default}>
                    기본 지정
                  </PendingButton>
                </form>

                <form action={togglePresetCollapsedAction}>
                  <input type="hidden" name="presetId" value={preset.id} />
                  <input type="hidden" name="collapsed" value={(!preset.collapsed).toString()} />
                  <PendingButton size="sm" pendingLabel="변경 중..." variant="outline">
                    {preset.collapsed ? "펼치기" : "접기"}
                  </PendingButton>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
