import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth";
import { DuckMailClient } from "@/lib/duckmail/client";
import { prisma } from "@/lib/prisma";
import { mailboxSyncService } from "@/lib/services/mailbox-sync-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireAdminSession();
  const { id } = await context.params;

  const attachment = await prisma.attachment.findUnique({
    where: { id },
    include: {
      message: {
        select: {
          mailboxId: true,
        },
      },
    },
  });

  if (!attachment) {
    return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }

  const token = await mailboxSyncService.getDecryptedToken(attachment.message.mailboxId);
  const response = await DuckMailClient.withToken(token).download(attachment.downloadUrl);
  const headers = new Headers(response.headers);
  headers.set(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(attachment.filename)}"`,
  );

  return new NextResponse(response.body, {
    status: response.status,
    headers,
  });
}
