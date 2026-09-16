"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/features/admin/auth";
import { markTransferOrderAsPaid } from "@/features/orders/server/transfer-admin-service";

type MarkPaidActionResult = { ok: true } | { ok: false; errors: string[] };

export async function markTransferOrderPaidAction(
  formData: FormData,
): Promise<MarkPaidActionResult> {
  const orderId = String(formData.get("orderId") ?? "");

  if (!orderId) {
    return { ok: false, errors: ["ID de orden inválido."] };
  }

  await requireAdminSession();
  const result = await markTransferOrderAsPaid(orderId);

  if (!result.ok) {
    return { ok: false, errors: result.errors };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}
