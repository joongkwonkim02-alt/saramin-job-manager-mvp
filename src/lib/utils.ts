import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseList(input: FormDataEntryValue | null): string[] {
  if (!input) {
    return [];
  }

  return input
    .toString()
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function formatKrw(value: number | null | undefined): string {
  if (value == null) {
    return "-";
  }

  return `${value.toLocaleString("ko-KR")}만원`;
}

export function displayOrDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

export function toDateText(value: string | null): string {
  if (!value) {
    return "-";
  }

  return value;
}
