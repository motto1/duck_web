import { NextResponse } from "next/server";

import {
  bridgeErrorResponse,
  duckMailBridgeService,
} from "@/lib/services/duckmail-bridge-service";

export async function GET(request: Request) {
  try {
    const context = await duckMailBridgeService.authorizeMailboxRequest(request);
    const account = await duckMailBridgeService.getMe(context);
    return NextResponse.json(account);
  } catch (error) {
    return bridgeErrorResponse(error);
  }
}
