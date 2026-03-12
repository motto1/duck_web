import { NextResponse } from "next/server";

import {
  bridgeErrorResponse,
  duckMailBridgeService,
} from "@/lib/services/duckmail-bridge-service";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { address?: string; password?: string }
      | null;
    const token = await duckMailBridgeService.createToken(body);
    return NextResponse.json(token);
  } catch (error) {
    return bridgeErrorResponse(error);
  }
}
