import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth";
import { mailboxSyncService } from "@/lib/services/mailbox-sync-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; messageId: string }> },
) {
  await requireAdminSession();
  const { id, messageId } = await context.params;
  const message = await mailboxSyncService.hydrateMessage(id, messageId);

  return new NextResponse(message.rawSourceData ?? "", {
    status: 200,
    headers: {
      "Content-Type": "message/rfc822; charset=utf-8",
    },
  });
}
