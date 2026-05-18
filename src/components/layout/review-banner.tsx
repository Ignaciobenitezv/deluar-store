import { isReviewDeployment } from "@/lib/deployment";

export function ReviewBanner() {
  if (!isReviewDeployment) {
    return null;
  }

  return (
    <div className="bg-foreground px-4 py-2 text-center text-xs font-medium uppercase tracking-[0.18em] text-white">
      Version de revision - pagos reales deshabilitados
    </div>
  );
}
