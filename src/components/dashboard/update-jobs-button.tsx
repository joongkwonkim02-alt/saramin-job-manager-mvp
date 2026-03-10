"use client";

import { useActionState } from "react";

import { updateJobsAction } from "@/app/actions/dashboard";
import { PendingButton } from "@/components/ui/pending-button";
import type { UpdateRun } from "@/lib/types";

interface UpdateJobsButtonProps {
  presetId: string;
  latestRun: UpdateRun | null;
}

export function UpdateJobsButton({ presetId, latestRun }: UpdateJobsButtonProps) {
  const [state, formAction] = useActionState(updateJobsAction, {
    ok: false,
    message: "",
    newCount: 0,
    duplicateCount: 0,
    expiredCount: 0,
  });

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

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <input type="hidden" name="presetId" value={presetId} />
        <PendingButton pendingLabel="업데이트 중...">공고 업데이트</PendingButton>
      </form>

      {summary ? (
        <div className="text-xs text-slate-600">
          <p>신규: {summary.newCount}</p>
          <p>중복 스킵: {summary.duplicateCount}</p>
          <p>만료 처리: {summary.expiredCount}</p>
        </div>
      ) : null}

      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-emerald-600" : "text-red-600"}`}>{state.message}</p>
      ) : null}
    </div>
  );
}
