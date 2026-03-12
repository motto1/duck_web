import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { secretsService } from "@/lib/services/secrets-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; kind: string }> },
) {
  await requireAdminSession();
  const { id, kind } = await context.params;

  const secrets = await prisma.mailboxSecret.findUnique({
    where: { mailboxId: id },
  });

  if (!secrets) {
    return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }

  if (kind === "password") {
    if (!secrets.encryptedPassword) {
      return NextResponse.json({ error: "NotFound" }, { status: 404 });
    }

    return NextResponse.json({
      value: secretsService.decrypt(secrets.encryptedPassword),
    });
  }

  if (kind === "token") {
    return NextResponse.json({
      value: secretsService.decrypt(secrets.encryptedToken),
    });
  }

  return NextResponse.json({ error: "BadRequest" }, { status: 400 });
}
