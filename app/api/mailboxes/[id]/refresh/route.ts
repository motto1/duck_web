import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth";
import { mailboxSyncService } from "@/lib/services/mailbox-sync-service";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireAdminSession();
  const { id } = await context.params;
  const result = await mailboxSyncService.syncMailbox(id);

  return NextResponse.json(result, {
    status: result.success ? 200 : 400,
  });
}
