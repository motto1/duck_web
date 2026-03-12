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
    const message = await duckMailBridgeService.getMessage(bridgeContext, id);
    return NextResponse.json(message);
  } catch (error) {
    return bridgeErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const bridgeContext = await duckMailBridgeService.authorizeMailboxRequest(request);
    const { id } = await context.params;
    const result = await duckMailBridgeService.markMessageSeen(bridgeContext, id);
    return NextResponse.json(result);
  } catch (error) {
    return bridgeErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const bridgeContext = await duckMailBridgeService.authorizeMailboxRequest(request);
    const { id } = await context.params;
    await duckMailBridgeService.deleteMessage(bridgeContext, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return bridgeErrorResponse(error);
  }
}
