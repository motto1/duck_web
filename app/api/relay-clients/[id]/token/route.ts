import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { secretsService } from "@/lib/services/secrets-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireAdminSession();
  const { id } = await context.params;

  const relayClient = await prisma.relayClient.findUnique({
    where: { id },
    select: {
      encryptedToken: true,
    },
  });

  if (!relayClient) {
    return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }

  return NextResponse.json({
    value: secretsService.decrypt(relayClient.encryptedToken),
  });
}
