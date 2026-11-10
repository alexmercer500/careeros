import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Discover Jobs" };

export default function JobsPage() {
  return (
    <ModulePlaceholder
      title="Discover Jobs"
      phase="Phase 3"
      summary="Bring job descriptions in deliberately — paste text, import a URL you supply, upload a file, or paste a job alert — then extract requirements and score the fit against your profile."
      planned={[
        "Manual, URL, file, and job-alert import (no scraping of job boards)",
        "Duplicate detection before a job is stored twice",
        "Requirement extraction with hard requirements flagged separately",
        "Deterministic weighted matching with a hard-requirement gate",
        "Match explanations showing matching and missing skills",
      ]}
    />
  );
}
