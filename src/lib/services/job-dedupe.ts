import { createHash } from "crypto";

export function makeJobDedupeHash(title: string, companyName: string, deadline: string | null): string {
  const base = `${title.trim().toLowerCase()}|${companyName.trim().toLowerCase()}|${deadline ?? "no-deadline"}`;

  return createHash("sha256").update(base).digest("hex");
}
