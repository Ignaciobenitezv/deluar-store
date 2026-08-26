import { NextResponse } from "next/server";
import { signOutBetterAuthSession } from "@/features/admin/better-auth";

async function buildLogoutResponse(request: Request) {
  await signOutBetterAuthSession(request.headers);

  return NextResponse.redirect(new URL("/admin/login", request.url), {
    status: 303,
  });
}

export async function GET(request: Request) {
  return buildLogoutResponse(request);
}

export async function POST(request: Request) {
  return buildLogoutResponse(request);
}
