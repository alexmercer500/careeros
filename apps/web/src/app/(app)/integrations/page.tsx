import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Integrations" };

export default function IntegrationsPage() {
  return (
    <ModulePlaceholder
      title="Integrations"
      phase="Phase 5"
      summary="Connect Gmail with the minimum read-only scope so application confirmations, interviews, and rejections can be recognised and linked to existing applications."
      planned={[
        "Gmail OAuth with encrypted token storage that the browser can never read",
        "Incremental, idempotent email sync",
        "Classification with confidence scoring",
        "Application linking that asks for confirmation when uncertain",
        "Communication timeline and follow-up reminders",
      ]}
    />
  );
}
