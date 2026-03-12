import {
  bridgeErrorResponse,
  duckMailBridgeService,
} from "@/lib/services/duckmail-bridge-service";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const bridgeContext = await duckMailBridgeService.authorizeMailboxRequest(request);
    const { id } = await context.params;
    await duckMailBridgeService.deleteAccount(bridgeContext, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return bridgeErrorResponse(error);
  }
}
