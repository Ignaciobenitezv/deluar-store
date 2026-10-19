import { draftMode } from "next/headers";
import { NextResponse } from "next/server";
import { hasBetterAuthAdminSession } from "@/features/admin/better-auth";
import { isSameOriginRequest } from "@/lib/request-security";

const EDITOR_PATH = "/admin/configuracion?tab=apariencia";

/**
 * Turns the storefront draft-theme preview on or off for this browser only
 * (Next draft mode cookie). Enabling requires an owner/admin session; the
 * storefront re-checks that session on every previewed request anyway
 * (getStorefrontTheme), so the cookie alone never exposes the draft.
 */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  const action = formData?.get("action");
  const draft = await draftMode();

  if (action === "disable") {
    draft.disable();
    return NextResponse.redirect(new URL(EDITOR_PATH, request.url), { status: 303 });
  }

  if (action !== "enable") {
    return new NextResponse("Bad request", { status: 400 });
  }

  if (!(await hasBetterAuthAdminSession(request.headers))) {
    return NextResponse.redirect(new URL("/admin/login", request.url), { status: 303 });
  }

  draft.enable();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
