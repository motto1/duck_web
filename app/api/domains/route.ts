import { NextResponse } from "next/server";

import {
  bridgeErrorResponse,
  duckMailBridgeService,
} from "@/lib/services/duckmail-bridge-service";

export async function GET(request: Request) {
  try {
    const context = await duckMailBridgeService.authorizeRelayRequest(request);
    const page = Number(new URL(request.url).searchParams.get("page") ?? "1") || 1;
    const domains = await duckMailBridgeService.getDomains(context, page);
    return NextResponse.json(domains);
  } catch (error) {
    return bridgeErrorResponse(error);
  }
}
