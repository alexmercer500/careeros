import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Resume Studio" };

export default function ResumeStudioPage() {
  return (
    <ModulePlaceholder
      title="Resume Studio"
      phase="Phase 4"
      summary="Upload and parse existing resumes, maintain master templates, and generate job-specific documents that stay traceable to verified profile facts."
      planned={[
        "Upload a PDF or DOCX resume and extract structured facts for review",
        "Compare an uploaded resume against the master profile",
        "Maintain multiple ATS-safe templates",
        "Generate, edit, and version a tailored resume per job",
        "Export to DOCX and PDF with a content hash recorded for every version",
      ]}
    />
  );
}
