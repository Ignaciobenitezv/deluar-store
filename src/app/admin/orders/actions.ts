"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/features/admin/auth";
import { markTransferOrderAsPaid } from "@/features/orders/server/transfer-admin-service";

export async function markTransferOrderPaidAction(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");

  if (!orderId) {
    return;
  }

  await requireAdminSession();
  await markTransferOrderAsPaid(orderId);

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}
