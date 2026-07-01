import { jsonError } from "@/lib/http";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  logger.info("api.payments.unicobros.webhook.not_implemented", {
    requestId,
    method: request.method,
  });

  return jsonError(["Unicobros webhook is not implemented yet."], 501, {
    requestId,
  });
}
