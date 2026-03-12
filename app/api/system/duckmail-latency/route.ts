import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";
import { duckMailTransport } from "@/lib/duckmail/transport";
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
  const proxy = await appConfigService.getDuckMailProxyConfig();
  const startedAt = Date.now();

  try {
    const response = await duckMailTransport.request(new URL("/domains?page=1", baseUrl), {
      method: "GET",
      timeoutMs: 5000,
      proxy,
    });

    const latencyMs = Date.now() - startedAt;
    const status: LatencyStatus =
      response.status < 200 || response.status >= 300 || latencyMs >= 1800
        ? "degraded"
        : "ok";

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
