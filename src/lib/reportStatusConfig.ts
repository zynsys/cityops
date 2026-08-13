export interface StatusConfig {
  label: string;
  color: string;
}

export const reportStatusConfig: Record<string, StatusConfig> = {
  created: { label: "Created", color: "#3B82F6" },
  under_validation: { label: "Under Validation", color: "#F59E0B" },
  validated: { label: "Validated", color: "#6366F1" },
  invalid: { label: "Invalid", color: "#94A3B8" },
  assigned: { label: "Assigned", color: "#A855F7" },
  in_progress: { label: "In Progress", color: "#F97316" },
  resolved: { label: "Resolved", color: "#22C55E" },
  closed: { label: "Closed", color: "#6B7280" },
};

export function getStatusConfig(status: string): StatusConfig {
  return reportStatusConfig[status] ?? { label: status, color: "#6B7280" };
}

export interface PriorityConfig {
  label: string;
  color: string;
  bg: string;
}

export const reportPriorityConfig: Record<string, PriorityConfig> = {
  critical: { label: "Critical", color: "#EF4444", bg: "bg-red-500/15 text-red-400" },
  high: { label: "High", color: "#F97316", bg: "bg-orange-500/15 text-orange-400" },
  medium: { label: "Medium", color: "#EAB308", bg: "bg-yellow-500/15 text-yellow-400" },
  low: { label: "Low", color: "#22C55E", bg: "bg-green-500/15 text-green-400" },
};

export function getPriorityConfig(priority: string | null | undefined): PriorityConfig {
  if (!priority) return { label: "—", color: "#6B7280", bg: "bg-muted text-muted-foreground" };
  return reportPriorityConfig[priority] ?? { label: priority, color: "#6B7280", bg: "bg-muted text-muted-foreground" };
}
