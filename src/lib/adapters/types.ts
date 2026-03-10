import type { FilterPreset } from "@/lib/types";

export interface CollectedJob {
  sourceName: "saramin";
  sourceUrl: string;
  sourceJobId: string;
  title: string;
  companyName: string;
  location: string;
  employeeCount: number | null;
  industry: string | null;
  companyType: string | null;
  averageSalary: number | null;
  startingSalary: number | null;
  salaryText: string | null;
  deadline: string | null;
  rawPayload: Record<string, unknown>;
}

export interface JobCollectionAdapter {
  name: string;
  collect: (preset: FilterPreset) => Promise<CollectedJob[]>;
}
