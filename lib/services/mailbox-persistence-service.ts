import { MailboxSource, MailboxStatus, type Mailbox } from "@prisma/client";

import type { DuckMailAccount } from "@/lib/duckmail/types";
import { prisma } from "@/lib/prisma";
import { secretsService } from "@/lib/services/secrets-service";

type PersistMailboxInput = {
  account: DuckMailAccount;
  source: MailboxSource;
  token: string;
  password?: string;
  displayName?: string | null;
};

export class MailboxPersistenceService {
  async persistMailbox(input: PersistMailboxInput): Promise<Mailbox> {
    const mailbox = await prisma.mailbox.upsert({
      where: {
        address: input.account.address,
      },
      update: {
        accountId: input.account.id,
        source: input.source,
        status: MailboxStatus.ACTIVE,
        lastError: null,
        ...(input.displayName !== undefined
          ? {
              displayName: input.displayName,
            }
          : {}),
      },
      create: {
        accountId: input.account.id,
        address: input.account.address,
        source: input.source,
        displayName: input.displayName ?? null,
        status: MailboxStatus.ACTIVE,
      },
    });

    await prisma.mailboxSecret.upsert({
      where: {
        mailboxId: mailbox.id,
      },
      update: {
        encryptedToken: secretsService.encrypt(input.token),
        tokenValidatedAt: new Date(),
        ...(input.password !== undefined
          ? {
              encryptedPassword: input.password
                ? secretsService.encrypt(input.password)
                : null,
            }
          : {}),
      },
      create: {
        mailboxId: mailbox.id,
        encryptedPassword: input.password
          ? secretsService.encrypt(input.password)
          : null,
        encryptedToken: secretsService.encrypt(input.token),
        tokenValidatedAt: new Date(),
      },
    });

    return mailbox;
  }

  async persistCreatedMailbox(input: {
    account: DuckMailAccount;
    password: string;
    token: string;
  }) {
    return this.persistMailbox({
      account: input.account,
      source: MailboxSource.CREATED,
      password: input.password,
      token: input.token,
    });
  }

  async persistPasswordMailbox(input: {
    account: DuckMailAccount;
    password: string;
    token: string;
    displayName?: string | null;
  }) {
    return this.persistMailbox({
      account: input.account,
      source: MailboxSource.JOINED_PASSWORD,
      password: input.password,
      token: input.token,
      displayName: input.displayName,
    });
  }

  async persistTokenMailbox(input: {
    account: DuckMailAccount;
    token: string;
    displayName?: string | null;
  }) {
    return this.persistMailbox({
      account: input.account,
      source: MailboxSource.JOINED_TOKEN,
      token: input.token,
      displayName: input.displayName,
    });
  }
}

export const mailboxPersistenceService = new MailboxPersistenceService();
