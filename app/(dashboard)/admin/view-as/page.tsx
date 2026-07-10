import { PageHeader } from "@/components/layout";
import { ImpersonationPicker } from "@/components/admin/impersonation-picker";

export default function ViewAsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="View As"
        description="Temporarily view and act as another manager. A banner will let you return to your own account at any time."
      />
      <ImpersonationPicker />
    </div>
  );
}
