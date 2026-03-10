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
  deleteFilterPreset,
  ensureBootstrapPreset,
  expirePastJobs,
  finishUpdateRun,
  getPresetById,
  listAllJobsForUser,
  listFilterPresets,
  logJobState,
  resetCollectedJobsAndLogs,
  setDefaultPreset,
  setPresetCollapsed,
  updateJobStatus,
  updateFilterPreset,
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
  presetId: z.string().uuid().optional().or(z.literal("")),
});

function parseArrayFromForm(formData: FormData, field: string): string[] {
  const allValues = formData
    .getAll(field)
    .map((value) => value.toString().trim())
    .filter(Boolean);

  if (allValues.length > 1) {
    return [...new Set(allValues)];
  }

  const raw = allValues[0] ?? formData.get(field)?.toString().trim();
  if (!raw) {
    return [];
  }

  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return [...new Set(parsed.map((value) => String(value).trim()).filter(Boolean))];
      }
    } catch {
      // Fall through to comma parsing for backward compatibility.
    }
  }

  return parseList(raw);
}

export async function createPresetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();

    const parsed = createPresetSchema.safeParse({
      name: formData.get("name")?.toString() ?? "",
      presetId: formData.get("presetId")?.toString() ?? "",
    });

    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "프리셋 생성에 실패했습니다.",
      };
    }

    const payload = {
      userId: user.id,
      name: parsed.data.name,
      searchKeywords: parseArrayFromForm(formData, "searchKeywords"),
      jobRoles: parseArrayFromForm(formData, "jobRoles"),
      locations: parseArrayFromForm(formData, "locations"),
      careerLevels: parseArrayFromForm(formData, "careerLevels"),
      educationLevels: parseArrayFromForm(formData, "educationLevels"),
    };

    if (parsed.data.presetId) {
      const existing = await getPresetById(user.id, parsed.data.presetId);

      if (!existing) {
        return {
          ok: false,
          message: "수정할 프리셋을 찾을 수 없습니다.",
        };
      }

      await updateFilterPreset({
        ...payload,
        presetId: parsed.data.presetId,
      });

      revalidatePath("/dashboard");

      return {
        ok: true,
        message: "프리셋이 수정되었습니다.",
      };
    }

    await createFilterPreset(payload);

    revalidatePath("/dashboard");

    return {
      ok: true,
      message: "프리셋이 저장되었습니다.",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "프리셋 처리 중 오류가 발생했습니다.",
    };
  }
}

export async function setDefaultPresetAction(formData: FormData): Promise<void> {
  try {
    const user = await requireUser();
    const presetId = formData.get("presetId")?.toString();

    if (!presetId) {
      return;
    }

    await setDefaultPreset(user.id, presetId);
    revalidatePath("/dashboard");
  } catch (error) {
    console.error("setDefaultPresetAction failed:", error);
  }
}

export async function togglePresetCollapsedAction(formData: FormData): Promise<void> {
  try {
    const user = await requireUser();
    const presetId = formData.get("presetId")?.toString();
    const collapsed = formData.get("collapsed")?.toString() === "true";

    if (!presetId) {
      return;
    }

    await setPresetCollapsed(user.id, presetId, collapsed);
    revalidatePath("/dashboard");
  } catch (error) {
    console.error("togglePresetCollapsedAction failed:", error);
  }
}

export async function deletePresetAction(formData: FormData): Promise<void> {
  try {
    const user = await requireUser();
    const presetId = formData.get("presetId")?.toString();

    if (!presetId) {
      return;
    }

    const presets = await listFilterPresets(user.id);
    if (presets.length <= 1) {
      return;
    }

    const target = presets.find((preset) => preset.id === presetId);
    if (!target) {
      return;
    }

    await deleteFilterPreset(user.id, presetId);

    if (target.is_default) {
      const rest = presets.filter((preset) => preset.id !== presetId);
      if (rest[0]) {
        await setDefaultPreset(user.id, rest[0].id);
      }
    }

    revalidatePath("/dashboard");
  } catch (error) {
    console.error("deletePresetAction failed:", error);
  }
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
        matchingMode: "strict",
        filters: {
          searchKeywords: preset.search_keywords,
          jobRoles: preset.job_roles,
          locations: preset.locations,
          careerLevels: preset.career_levels,
          educationLevels: preset.education_levels,
        },
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
  try {
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
  } catch (error) {
    console.error("changeJobStatusAction failed:", error);
  }
}

export async function resetJobsAndLogsAction(
  prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  void prev;
  void formData;

  try {
    const user = await requireUser();
    await resetCollectedJobsAndLogs(user.id);
    revalidatePath("/dashboard");

    return {
      ok: true,
      message: "공고와 업데이트 로그를 초기화했습니다.",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "초기화 중 오류가 발생했습니다.",
    };
  }
}
