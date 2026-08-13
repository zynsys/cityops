"use client";

import dynamic from "next/dynamic";
import type { SubmitReportMapProps } from "./SubmitReportMap";

const SubmitReportMap = dynamic(() => import("./SubmitReportMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-background">
      <p className="text-muted-foreground text-sm">Loading map…</p>
    </div>
  ),
});

export default function SubmitReportMapLoader(props: SubmitReportMapProps) {
  return <SubmitReportMap {...props} />;
}

