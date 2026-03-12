import { NextResponse } from "next/server";

import {
  bridgeErrorResponse,
  duckMailBridgeService,
} from "@/lib/services/duckmail-bridge-service";

export async function GET(request: Request) {
  try {
    const context = await duckMailBridgeService.authorizeMailboxRequest(request);
    const page = Number(new URL(request.url).searchParams.get("page") ?? "1") || 1;
    const messages = await duckMailBridgeService.getMessages(context, page);
    return NextResponse.json(messages);
  } catch (error) {
    return bridgeErrorResponse(error);
  }
}
