"use client";

import { format, parseISO } from "date-fns";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { resetJobsAndLogsAction, updateJobsAction } from "@/app/actions/dashboard";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { cn } from "@/lib/utils";
import type { UpdateRun } from "@/lib/types";

interface UpdateJobsButtonProps {
  presetId: string;
  latestRun: UpdateRun | null;
  updateRuns: UpdateRun[];
}

function toDateTimeText(value: string | null): string {
  if (!value) {
    return "-";
  }

  try {
    return format(parseISO(value), "yyyy-MM-dd HH:mm:ss");
  } catch {
    return value;
  }
}

export function UpdateJobsButton({ presetId, latestRun, updateRuns }: UpdateJobsButtonProps) {
  const router = useRouter();
  const [openHistory, setOpenHistory] = useState(false);

  const [state, formAction] = useActionState(updateJobsAction, {
    ok: false,
    message: "",
    newCount: 0,
    duplicateCount: 0,
    expiredCount: 0,
  });

  const [resetState, resetAction] = useActionState(resetJobsAndLogsAction, {
    ok: false,
    message: "",
  });

  useEffect(() => {
    if (state.ok && state.message) {
      router.refresh();
    }
  }, [state.ok, state.message, router]);

  useEffect(() => {
    if (resetState.ok && resetState.message) {
      router.refresh();
    }
  }, [resetState.ok, resetState.message, router]);

  const summary = state.message
    ? {
        newCount: state.newCount,
        duplicateCount: state.duplicateCount,
        expiredCount: state.expiredCount,
      }
    : latestRun
      ? {
          newCount: latestRun.new_count,
          duplicateCount: latestRun.duplicate_count,
          expiredCount: latestRun.expired_count,
        }
      : null;

  const latestLabel = useMemo(() => {
    if (!latestRun) {
      return "업데이트 기록 없음";
    }

    return toDateTimeText(latestRun.finished_at ?? latestRun.started_at);
  }, [latestRun]);

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <input type="hidden" name="presetId" value={presetId} />
        <PendingButton pendingLabel="업데이트 중...">공고 업데이트</PendingButton>
      </form>

      <button
        type="button"
        onClick={() => setOpenHistory(true)}
        className="text-xs text-slate-600 underline hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
      >
        최근 업데이트: {latestLabel}
      </button>

      {summary ? (
        <div className="text-xs text-slate-600 dark:text-slate-300">
          <p>신규: {summary.newCount}</p>
          <p>중복 스킵: {summary.duplicateCount}</p>
          <p>만료 처리: {summary.expiredCount}</p>
        </div>
      ) : null}

      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-emerald-600" : "text-red-600"}`}>{state.message}</p>
      ) : null}

      {openHistory ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-950">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">업데이트 이력</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => setOpenHistory(false)}>
                닫기
              </Button>
            </div>

            <div className="max-h-80 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  <tr>
                    <th className="px-3 py-2">시작 시각</th>
                    <th className="px-3 py-2">종료 시각</th>
                    <th className="px-3 py-2">상태</th>
                    <th className="px-3 py-2">신규</th>
                    <th className="px-3 py-2">중복</th>
                    <th className="px-3 py-2">만료</th>
                  </tr>
                </thead>
                <tbody>
                  {updateRuns.length ? (
                    updateRuns.map((run) => (
                      <tr
                        key={run.id}
                        className={cn(
                          "border-t border-slate-200 dark:border-slate-700",
                          run.status === "failed" ? "bg-red-50/60 dark:bg-red-950/30" : "",
                        )}
                      >
                        <td className="px-3 py-2">{toDateTimeText(run.started_at)}</td>
                        <td className="px-3 py-2">{toDateTimeText(run.finished_at)}</td>
                        <td className="px-3 py-2">{run.status}</td>
                        <td className="px-3 py-2">{run.new_count}</td>
                        <td className="px-3 py-2">{run.duplicate_count}</td>
                        <td className="px-3 py-2">{run.expired_count}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-3 py-4 text-slate-600 dark:text-slate-300" colSpan={6}>
                        업데이트 이력이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <form
                action={resetAction}
                onSubmit={(event) => {
                  if (!confirm("공고 목록과 업데이트 로그를 초기화할까요?")) {
                    event.preventDefault();
                  }
                }}
              >
                <PendingButton variant="destructive" pendingLabel="초기화 중...">
                  공고/로그 초기화
                </PendingButton>
              </form>
              {resetState.message ? (
                <p className={`text-sm ${resetState.ok ? "text-emerald-600" : "text-red-600"}`}>
                  {resetState.message}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
