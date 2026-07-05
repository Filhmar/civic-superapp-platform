import type { ReportStatus } from "@/types/reports";

/** "UNDER_REVIEW" → "Under Review" */
export function formatStatus(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Tailwind classes for a status chip. */
export function statusChipClasses(status: ReportStatus): {
  container: string;
  text: string;
} {
  switch (status) {
    case "RESOLVED":
      return { container: "bg-brand", text: "text-white" };
    case "REJECTED":
      return { container: "bg-danger", text: "text-white" };
    case "UNDER_REVIEW":
      return { container: "bg-accent", text: "text-fg" };
    default:
      return { container: "bg-tint", text: "text-fg-2" };
  }
}
