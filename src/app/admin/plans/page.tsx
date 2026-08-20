import { BackButton } from "@/components/back-button";
import { PlansManager } from "@/components/admin/plans-manager";

export default function AdminPlansPage() {
  return (
    <div>
      <div className="mb-4">
        <BackButton href="/admin" label="Volver al panel de admin" />
      </div>
      <PlansManager />
    </div>
  );
}