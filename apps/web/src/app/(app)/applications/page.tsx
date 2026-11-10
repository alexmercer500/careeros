import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Applications" };

export default function ApplicationsPage() {
  return (
    <ModulePlaceholder
      title="Applications"
      phase="Phase 4"
      summary="A single tracker for every application, with a status history, the exact documents submitted, and an approval record bound to the payload that was sent."
      planned={[
        "Kanban and table views over one shared query layer",
        "A validated status state machine with a complete event history",
        "Documents attached by immutable version and content hash",
        "Approval records with a SHA-256 payload hash, expiry, and single use",
        "Submission attempts recorded idempotently with confirmation evidence",
      ]}
    />
  );
}
