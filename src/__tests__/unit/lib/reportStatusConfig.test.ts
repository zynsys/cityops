import {
  getPriorityConfig,
  getStatusConfig,
} from "@/lib/reportStatusConfig";

describe("getStatusConfig", () => {
  it("returns the created status config", () => {
    expect(getStatusConfig("created")).toEqual({
      label: "Created",
      color: "#3B82F6",
    });
  });

  it("returns the resolved status config", () => {
    expect(getStatusConfig("resolved")).toEqual({
      label: "Resolved",
      color: "#22C55E",
    });
  });

  it("returns the fallback for unknown statuses", () => {
    expect(getStatusConfig("unknown_status")).toEqual({
      label: "unknown_status",
      color: "#6B7280",
    });
  });
});

describe("getPriorityConfig", () => {
  it("returns the critical priority config", () => {
    expect(getPriorityConfig("critical")).toEqual({
      label: "Critical",
      color: "#EF4444",
      bg: "bg-red-500/15 text-red-400",
    });
  });

  it("returns the null fallback", () => {
    expect(getPriorityConfig(null)).toEqual({
      label: "—",
      color: "#6B7280",
      bg: "bg-muted text-muted-foreground",
    });
  });

  it("returns the undefined fallback", () => {
    expect(getPriorityConfig(undefined)).toEqual({
      label: "—",
      color: "#6B7280",
      bg: "bg-muted text-muted-foreground",
    });
  });

  it("returns the unknown fallback colors", () => {
    expect(getPriorityConfig("unknown")).toEqual({
      label: "unknown",
      color: "#6B7280",
      bg: "bg-muted text-muted-foreground",
    });
  });
});
