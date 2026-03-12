import { NextResponse } from "next/server";

import {
  bridgeErrorResponse,
  duckMailBridgeService,
} from "@/lib/services/duckmail-bridge-service";

export async function POST(request: Request) {
  try {
    const context = await duckMailBridgeService.authorizeRelayRequest(request);
    const body = (await request.json().catch(() => null)) as
      | { address?: string; password?: string }
      | null;
    const account = await duckMailBridgeService.createAccount(context, body);
    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    return bridgeErrorResponse(error);
  }
}
