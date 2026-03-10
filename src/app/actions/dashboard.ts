"use server";

import { isBefore, parseISO, startOfDay } from "date-fns";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { mockSaraminAdapter } from "@/lib/adapters/mock-saramin-provider";
import {
  createFilterPreset,
  createJob,
  createUpdateRun,
  ensureBootstrapPreset,
  expirePastJobs,
  finishUpdateRun,
  getPresetById,
  listAllJobsForUser,
  logJobState,
  setDefaultPreset,
  setPresetCollapsed,
  updateJobStatus,
  upsertCompany,
  upsertExternalCompanyLink,
} from "@/lib/services/repository";
import { matchExternalLinks } from "@/lib/services/company-link-matcher";
import { normalizeCompanyName } from "@/lib/services/company-normalizer";
import { makeJobDedupeHash } from "@/lib/services/job-dedupe";
import { parseList } from "@/lib/utils";
import type { JobStatus } from "@/lib/types";

interface ActionState {
  ok: boolean;
  message: string;
}

interface UpdateJobsState extends ActionState {
  newCount: number;
  duplicateCount: number;
  expiredCount: number;
}

const createPresetSchema = z.object({
  name: z.string().trim().min(1, "프리셋 이름을 입력해주세요."),
});

export async function createPresetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = createPresetSchema.safeParse({
    name: formData.get("name")?.toString() ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "프리셋 생성에 실패했습니다.",
    };
  }

  await createFilterPreset({
    userId: user.id,
    name: parsed.data.name,
    searchKeywords: parseList(formData.get("searchKeywords")),
    jobRoles: parseList(formData.get("jobRoles")),
    locations: parseList(formData.get("locations")),
    careerLevels: parseList(formData.get("careerLevels")),
    educationLevels: parseList(formData.get("educationLevels")),
  });

  revalidatePath("/dashboard");

  return {
    ok: true,
    message: "프리셋이 저장되었습니다.",
  };
}

export async function setDefaultPresetAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const presetId = formData.get("presetId")?.toString();

  if (!presetId) {
    return;
  }

  await setDefaultPreset(user.id, presetId);
  revalidatePath("/dashboard");
}

export async function togglePresetCollapsedAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const presetId = formData.get("presetId")?.toString();
  const collapsed = formData.get("collapsed")?.toString() === "true";

  if (!presetId) {
    return;
  }

  await setPresetCollapsed(user.id, presetId, collapsed);
  revalidatePath("/dashboard");
}

export async function updateJobsAction(
  _prev: UpdateJobsState,
  formData: FormData,
): Promise<UpdateJobsState> {
  const user = await requireUser();
  const fallbackPreset = await ensureBootstrapPreset(user.id);
  const presetId = formData.get("presetId")?.toString() ?? fallbackPreset.id;
  const preset = (await getPresetById(user.id, presetId)) ?? fallbackPreset;

  const run = await createUpdateRun({
    userId: user.id,
    presetId: preset.id,
    providerName: mockSaraminAdapter.name,
  });

  let newCount = 0;
  let duplicateCount = 0;

  try {
    const collectedJobs = await mockSaraminAdapter.collect(preset);
    const existingJobs = await listAllJobsForUser(user.id);

    const existingSourceUrls = new Set(existingJobs.map((job) => job.source_url).filter(Boolean));
    const existingSourceJobIds = new Set(existingJobs.map((job) => job.source_job_id).filter(Boolean));
    const existingDedupeHashes = new Set(existingJobs.map((job) => job.dedupe_hash));

    for (const incoming of collectedJobs) {
      const dedupeHash = makeJobDedupeHash(incoming.title, incoming.companyName, incoming.deadline);

      const isDuplicated =
        existingSourceUrls.has(incoming.sourceUrl) ||
        existingSourceJobIds.has(incoming.sourceJobId) ||
        existingDedupeHashes.has(dedupeHash);

      if (isDuplicated) {
        duplicateCount += 1;
        continue;
      }

      const normalizedName = normalizeCompanyName(incoming.companyName);
      const company = await upsertCompany({
        normalizedName,
        displayName: incoming.companyName,
        industry: incoming.industry,
        companyType: incoming.companyType,
        employeeCount: incoming.employeeCount,
        averageSalary: incoming.averageSalary,
        startingSalary: incoming.startingSalary,
      });

      const matchedLinks = matchExternalLinks(normalizedName);
      for (const link of matchedLinks) {
        await upsertExternalCompanyLink({
          companyId: company.id,
          source: link.source,
          url: link.url,
          rating: link.rating,
        });
      }

      const shouldExpireByDeadline = Boolean(
        incoming.deadline && isBefore(parseISO(incoming.deadline), startOfDay(new Date())),
      );

      const status: JobStatus = shouldExpireByDeadline ? "expired" : "active";

      const insertedJob = await createJob({
        userId: user.id,
        presetId: preset.id,
        companyId: company.id,
        sourceName: incoming.sourceName,
        sourceUrl: incoming.sourceUrl,
        sourceJobId: incoming.sourceJobId,
        dedupeHash,
        title: incoming.title,
        location: incoming.location,
        salaryText: incoming.salaryText,
        deadline: incoming.deadline,
        status,
        rawPayload: incoming.rawPayload,
      });

      await logJobState({
        jobId: insertedJob.id,
        userId: user.id,
        fromStatus: null,
        toStatus: status,
        reason: "newly_collected",
      });

      existingSourceUrls.add(incoming.sourceUrl);
      existingSourceJobIds.add(incoming.sourceJobId);
      existingDedupeHashes.add(dedupeHash);

      newCount += 1;
    }

    const expiredCount = await expirePastJobs(user.id);

    await finishUpdateRun({
      runId: run.id,
      status: "completed",
      newCount,
      duplicateCount,
      expiredCount,
      rawPayload: {
        presetId: preset.id,
        collectedCount: collectedJobs.length,
      },
    });

    revalidatePath("/dashboard");

    return {
      ok: true,
      message: "공고 업데이트가 완료되었습니다.",
      newCount,
      duplicateCount,
      expiredCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "업데이트 중 오류가 발생했습니다.";

    await finishUpdateRun({
      runId: run.id,
      status: "failed",
      newCount,
      duplicateCount,
      expiredCount: 0,
      errorMessage: message,
    });

    return {
      ok: false,
      message,
      newCount,
      duplicateCount,
      expiredCount: 0,
    };
  }
}

export async function changeJobStatusAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const jobId = formData.get("jobId")?.toString();
  const toStatus = formData.get("toStatus")?.toString() as JobStatus;

  if (!jobId || !toStatus) {
    return;
  }

  await updateJobStatus({
    jobId,
    userId: user.id,
    toStatus,
    reason: "manual_decision",
  });

  revalidatePath("/dashboard");
}
