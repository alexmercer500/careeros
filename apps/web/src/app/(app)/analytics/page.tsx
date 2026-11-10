import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <ModulePlaceholder
      title="Analytics"
      phase="Phase 6"
      summary="Measure what actually happened — funnel conversion, rejection and response rates, resume-version performance, and source-level results — with sample sizes shown."
      planned={[
        "Funnel from discovered through offer",
        "Rejection and no-response rates over resolved applications only",
        "Resume version A/B performance",
        "Source-wise and role-wise conversion",
        "Evidence-based recommendations that refuse causal claims on small samples",
      ]}
    />
  );
}
