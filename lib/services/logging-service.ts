import type { SyncTargetType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function createSyncLog(input: {
  targetType: SyncTargetType;
  targetId?: string;
  action: string;
  success: boolean;
  errorType?: string;
  errorMessage?: string;
  details?: Record<string, unknown>;
}) {
  await prisma.syncLog.create({
    data: {
      targetType: input.targetType,
      targetId: input.targetId,
      action: input.action,
      success: input.success,
      errorType: input.errorType,
      errorMessage: input.errorMessage,
      detailsJson: input.details ? JSON.stringify(input.details) : null,
      endedAt: new Date(),
    },
  });
}
