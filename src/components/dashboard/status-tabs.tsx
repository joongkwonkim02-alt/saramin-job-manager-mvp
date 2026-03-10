import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { JobStatus } from "@/lib/types";

const STATUS_META: Array<{ key: JobStatus; label: string }> = [
  { key: "active", label: "전체(active)" },
  { key: "approved", label: "승인" },
  { key: "rejected", label: "거절" },
  { key: "hold", label: "보류" },
  { key: "expired", label: "마감" },
];

interface StatusTabsProps {
  status: JobStatus;
  presetId: string;
  counts: Record<JobStatus, number>;
}

export function StatusTabs({ status, presetId, counts }: StatusTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {STATUS_META.map((item) => (
        <Link
          key={item.key}
          href={`/dashboard?status=${item.key}&preset=${presetId}`}
          className={cn(
            "inline-flex items-center gap-2 rounded-md border px-3 py-1 text-sm",
            status === item.key
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-300 bg-white text-slate-700",
          )}
        >
          <span>{item.label}</span>
          <Badge variant={status === item.key ? "secondary" : "outline"}>{counts[item.key]}</Badge>
        </Link>
      ))}
    </div>
  );
}
