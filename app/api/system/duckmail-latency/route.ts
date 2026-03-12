import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";
import { appConfigService } from "@/lib/services/app-config-service";

type LatencyStatus = "ok" | "degraded" | "offline";

export async function GET() {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        message: "Admin session is required",
      },
      { status: 401 },
    );
  }

  const baseUrl = await appConfigService.getDuckMailApiBaseUrl();
  const startedAt = Date.now();

  try {
    const response = await fetch(new URL("/domains?page=1", baseUrl), {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    const latencyMs = Date.now() - startedAt;
    const status: LatencyStatus =
      !response.ok || latencyMs >= 1800 ? "degraded" : "ok";

    return NextResponse.json({
      status,
      latencyMs,
      checkedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      status: "offline" satisfies LatencyStatus,
      latencyMs: null,
      checkedAt: new Date().toISOString(),
    });
  }
}
