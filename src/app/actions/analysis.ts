"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import {
  addToComparisonSet,
  getAnalysisRecordForUser,
  updateAnalysisRecordMeta,
  upsertAnalysisScore,
  upsertAnalysisSection,
} from "@/lib/services/repository";

interface AnalysisActionState {
  ok: boolean;
  message: string;
}

const scoreSchema = z.object({
  recordId: z.string().uuid(),
  metricKey: z.string().trim().min(1),
  metricLabel: z.string().trim().min(1),
  score: z.coerce.number().min(0).max(100),
  weight: z.coerce.number().min(0).max(10),
  note: z.string().trim().optional(),
  companyId: z.string().uuid(),
});

const sectionSchema = z.object({
  recordId: z.string().uuid(),
  sectionKey: z.string().trim().min(1),
  title: z.string().trim().min(1),
  content: z.string().trim().optional(),
  sortOrder: z.coerce.number().min(0),
  companyId: z.string().uuid(),
});

const metaSchema = z.object({
  recordId: z.string().uuid(),
  companyId: z.string().uuid(),
  summary: z.string().trim().optional(),
  recommendation: z.string().trim().optional(),
  status: z.enum(["draft", "in_review", "final"]),
});

export async function upsertAnalysisScoreAction(
  _prev: AnalysisActionState,
  formData: FormData,
): Promise<AnalysisActionState> {
  const user = await requireUser();

  const parsed = scoreSchema.safeParse({
    recordId: formData.get("recordId"),
    metricKey: formData.get("metricKey"),
    metricLabel: formData.get("metricLabel"),
    score: formData.get("score"),
    weight: formData.get("weight"),
    note: formData.get("note"),
    companyId: formData.get("companyId"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "점수 입력값을 확인해주세요.",
    };
  }

  const record = await getAnalysisRecordForUser(user.id, parsed.data.recordId);
  if (!record) {
    return {
      ok: false,
      message: "분석 레코드에 접근할 수 없습니다.",
    };
  }

  await upsertAnalysisScore({
    recordId: parsed.data.recordId,
    metricKey: parsed.data.metricKey,
    metricLabel: parsed.data.metricLabel,
    score: parsed.data.score,
    weight: parsed.data.weight,
    note: parsed.data.note,
  });

  revalidatePath(`/companies/${parsed.data.companyId}/analysis`);

  return {
    ok: true,
    message: "점수가 저장되었습니다.",
  };
}

export async function upsertAnalysisSectionAction(
  _prev: AnalysisActionState,
  formData: FormData,
): Promise<AnalysisActionState> {
  const user = await requireUser();

  const parsed = sectionSchema.safeParse({
    recordId: formData.get("recordId"),
    sectionKey: formData.get("sectionKey"),
    title: formData.get("title"),
    content: formData.get("content"),
    sortOrder: formData.get("sortOrder"),
    companyId: formData.get("companyId"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "섹션 입력값을 확인해주세요.",
    };
  }

  const record = await getAnalysisRecordForUser(user.id, parsed.data.recordId);
  if (!record) {
    return {
      ok: false,
      message: "분석 레코드에 접근할 수 없습니다.",
    };
  }

  await upsertAnalysisSection({
    recordId: parsed.data.recordId,
    sectionKey: parsed.data.sectionKey,
    title: parsed.data.title,
    content: parsed.data.content ?? "",
    sortOrder: parsed.data.sortOrder,
  });

  revalidatePath(`/companies/${parsed.data.companyId}/analysis`);

  return {
    ok: true,
    message: "섹션이 저장되었습니다.",
  };
}

export async function updateAnalysisMetaAction(
  _prev: AnalysisActionState,
  formData: FormData,
): Promise<AnalysisActionState> {
  const user = await requireUser();

  const parsed = metaSchema.safeParse({
    recordId: formData.get("recordId"),
    companyId: formData.get("companyId"),
    summary: formData.get("summary"),
    recommendation: formData.get("recommendation"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "분석 메타 입력값을 확인해주세요.",
    };
  }

  const record = await getAnalysisRecordForUser(user.id, parsed.data.recordId);
  if (!record) {
    return {
      ok: false,
      message: "분석 레코드에 접근할 수 없습니다.",
    };
  }

  await updateAnalysisRecordMeta({
    recordId: parsed.data.recordId,
    userId: user.id,
    summary: parsed.data.summary ?? "",
    recommendation: parsed.data.recommendation ?? "",
    status: parsed.data.status,
  });

  revalidatePath(`/companies/${parsed.data.companyId}/analysis`);

  return {
    ok: true,
    message: "분석 개요가 저장되었습니다.",
  };
}

export async function addToComparisonSetAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const companyId = formData.get("companyId")?.toString();
  const setName = formData.get("setName")?.toString() || "기본 비교";

  if (!companyId) {
    return;
  }

  await addToComparisonSet({
    userId: user.id,
    companyId,
    setName,
  });

  revalidatePath("/compare");
  revalidatePath(`/companies/${companyId}/analysis`);
}
