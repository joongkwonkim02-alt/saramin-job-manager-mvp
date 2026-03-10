"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import {
  createPresetAction,
  deletePresetAction,
  setDefaultPresetAction,
  togglePresetCollapsedAction,
} from "@/app/actions/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import {
  SARAMIN_CAREER_LEVELS,
  SARAMIN_EDUCATION_LEVELS,
  SARAMIN_JOB_CATEGORIES,
  SARAMIN_KEYWORD_OPTIONS,
  SARAMIN_LOCATION_GROUPS,
} from "@/lib/saramin-filter-catalog";
import { cn } from "@/lib/utils";
import type { FilterPreset } from "@/lib/types";

interface FilterPresetsPanelProps {
  presets: FilterPreset[];
  selectedPresetId: string;
  currentStatus: string;
}

interface PresetDraft {
  presetId: string;
  name: string;
  searchKeywords: string[];
  jobRoles: string[];
  locations: string[];
  careerLevels: string[];
  educationLevels: string[];
}

const EMPTY_DRAFT: PresetDraft = {
  presetId: "",
  name: "",
  searchKeywords: [],
  jobRoles: [],
  locations: [],
  careerLevels: [],
  educationLevels: [],
};

function summarize(values: string[]) {
  return values.length ? values.join(", ") : "-";
}

function toggleValue(values: string[], target: string): string[] {
  if (values.includes(target)) {
    return values.filter((value) => value !== target);
  }

  return [...values, target];
}

function SelectChip({
  selected,
  label,
  onClick,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        selected
          ? "border-slate-900 bg-slate-900 text-white dark:border-slate-200 dark:bg-slate-100 dark:text-slate-900"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
      )}
    >
      {label}
    </button>
  );
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
  const [draft, setDraft] = useState<PresetDraft>(EMPTY_DRAFT);
  const [activeJobCategory, setActiveJobCategory] = useState(SARAMIN_JOB_CATEGORIES[0]?.key ?? "");

  const activeCategory = useMemo(
    () =>
      SARAMIN_JOB_CATEGORIES.find((category) => category.key === activeJobCategory) ??
      SARAMIN_JOB_CATEGORIES[0],
    [activeJobCategory],
  );

  function handleStartEdit(preset: FilterPreset) {
    setDraft({
      presetId: preset.id,
      name: preset.name,
      searchKeywords: preset.search_keywords,
      jobRoles: preset.job_roles,
      locations: preset.locations,
      careerLevels: preset.career_levels,
      educationLevels: preset.education_levels,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetDraft() {
    setDraft(EMPTY_DRAFT);
  }

  function toggleDraftField(field: keyof Omit<PresetDraft, "presetId" | "name">, value: string) {
    setDraft((prev) => ({
      ...prev,
      [field]: toggleValue(prev[field], value),
    }));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>필터 프리셋 관리 (사람인 선택형)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <form action={createAction} className="space-y-5">
            <input type="hidden" name="presetId" value={draft.presetId} />
            <input type="hidden" name="searchKeywords" value={JSON.stringify(draft.searchKeywords)} />
            <input type="hidden" name="jobRoles" value={JSON.stringify(draft.jobRoles)} />
            <input type="hidden" name="locations" value={JSON.stringify(draft.locations)} />
            <input type="hidden" name="careerLevels" value={JSON.stringify(draft.careerLevels)} />
            <input type="hidden" name="educationLevels" value={JSON.stringify(draft.educationLevels)} />

            <div className="space-y-1">
              <Label htmlFor="name">프리셋 이름</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="예: 신입 백엔드 서울"
                value={draft.name}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">경력</p>
              <div className="flex flex-wrap gap-2">
                {SARAMIN_CAREER_LEVELS.map((career) => (
                  <SelectChip
                    key={career}
                    label={career}
                    selected={draft.careerLevels.includes(career)}
                    onClick={() => toggleDraftField("careerLevels", career)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">학력</p>
              <div className="flex flex-wrap gap-2">
                {SARAMIN_EDUCATION_LEVELS.map((education) => (
                  <SelectChip
                    key={education}
                    label={education}
                    selected={draft.educationLevels.includes(education)}
                    onClick={() => toggleDraftField("educationLevels", education)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">지역</p>
              <div className="grid gap-3 md:grid-cols-2">
                {SARAMIN_LOCATION_GROUPS.map((group) => (
                  <div
                    key={group.label}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60"
                  >
                    <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {group.label}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {group.options.map((option) => (
                        <SelectChip
                          key={option}
                          label={option}
                          selected={draft.locations.includes(option)}
                          onClick={() => toggleDraftField("locations", option)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">직업(직무) 선택</p>
              <div className="flex flex-wrap gap-2">
                {SARAMIN_JOB_CATEGORIES.map((category) => (
                  <SelectChip
                    key={category.key}
                    label={category.label}
                    selected={activeCategory?.key === category.key}
                    onClick={() => setActiveJobCategory(category.key)}
                  />
                ))}
              </div>
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                {activeCategory?.sections.map((section) => (
                  <div key={section.label} className="space-y-2 py-2">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{section.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {section.options.map((option) => (
                        <SelectChip
                          key={option}
                          label={option}
                          selected={draft.jobRoles.includes(option)}
                          onClick={() => toggleDraftField("jobRoles", option)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">검색어</p>
              <div className="flex flex-wrap gap-2">
                {SARAMIN_KEYWORD_OPTIONS.map((keyword) => (
                  <SelectChip
                    key={keyword}
                    label={keyword}
                    selected={draft.searchKeywords.includes(keyword)}
                    onClick={() => toggleDraftField("searchKeywords", keyword)}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
              <p>요약: 검색어 {summarize(draft.searchKeywords)}</p>
              <p>직무: {summarize(draft.jobRoles)}</p>
              <p>지역: {summarize(draft.locations)}</p>
              <p>경력: {summarize(draft.careerLevels)}</p>
              <p>학력: {summarize(draft.educationLevels)}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <PendingButton pendingLabel={draft.presetId ? "수정 중..." : "저장 중..."}>
                {draft.presetId ? "프리셋 수정" : "프리셋 저장"}
              </PendingButton>
              {draft.presetId ? (
                <Button type="button" variant="outline" onClick={resetDraft}>
                  새 프리셋으로 전환
                </Button>
              ) : null}
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
          <Card key={preset.id} className={preset.id === selectedPresetId ? "border-slate-900 dark:border-slate-200" : undefined}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{preset.name}</p>
                {preset.is_default ? <Badge variant="success">기본</Badge> : null}
                {preset.id === selectedPresetId ? <Badge variant="secondary">선택됨</Badge> : null}
              </div>

              <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
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

                <Button type="button" size="sm" variant="outline" onClick={() => handleStartEdit(preset)}>
                  수정
                </Button>

                <form
                  action={deletePresetAction}
                  onSubmit={(event) => {
                    if (!confirm("이 프리셋을 삭제할까요?")) {
                      event.preventDefault();
                    }
                  }}
                >
                  <input type="hidden" name="presetId" value={preset.id} />
                  <PendingButton size="sm" pendingLabel="삭제 중..." variant="destructive" disabled={presets.length <= 1}>
                    삭제
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
