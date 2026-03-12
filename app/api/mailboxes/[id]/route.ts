import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth";
import { DuckMailClient } from "@/lib/duckmail/client";
import { prisma } from "@/lib/prisma";
import { mailboxSyncService } from "@/lib/services/mailbox-sync-service";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireAdminSession();
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | { confirmAddress?: string }
    | null;

  const mailbox = await prisma.mailbox.findUnique({
    where: { id },
  });

  if (!mailbox) {
    return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }

  if (body?.confirmAddress !== mailbox.address) {
    return NextResponse.json(
      { error: "BadRequest", message: "邮箱地址确认不匹配" },
      { status: 400 },
    );
  }

  const token = await mailboxSyncService.getDecryptedToken(mailbox.id);
  await DuckMailClient.withToken(token).deleteAccount(mailbox.accountId);

  await prisma.mailbox.update({
    where: { id: mailbox.id },
    data: {
      status: "REMOTE_DELETED",
      lastError: null,
    },
  });

  return NextResponse.json({ success: true });
}
