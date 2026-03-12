import { NextResponse } from "next/server";

import {
  bridgeErrorResponse,
  duckMailBridgeService,
} from "@/lib/services/duckmail-bridge-service";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const bridgeContext = await duckMailBridgeService.authorizeMailboxRequest(request);
    const { id } = await context.params;
    const source = await duckMailBridgeService.getSource(bridgeContext, id);
    return NextResponse.json(source);
  } catch (error) {
    return bridgeErrorResponse(error);
  }
}
