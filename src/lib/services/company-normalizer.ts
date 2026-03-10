const NOISE_TOKENS = [
  "(주)",
  "주식회사",
  "유한회사",
  "inc.",
  "inc",
  "co.,ltd",
  "co ltd",
  "co., ltd",
  "corp.",
  "corp",
  "ltd.",
  "ltd",
  "㈜",
];

export function normalizeCompanyName(companyName: string): string {
  let normalized = companyName.trim().toLowerCase();

  for (const token of NOISE_TOKENS) {
    normalized = normalized.replaceAll(token, "");
  }

  normalized = normalized
    .replaceAll(/[^a-z0-9가-힣]/g, "")
    .replaceAll(/\s+/g, "");

  return normalized;
}
