import type { MailboxSource, MailboxStatus, SyncTargetType } from "@prisma/client";

export type ApiKeyRecord = {
  id: string;
  name: string;
  note: string | null;
  maskedKey: string;
  isEnabled: boolean;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DomainRecord = {
  id: string;
  domain: string;
  apiKeyId: string | null;
  ownerId: string | null;
  isPrivate: boolean;
  isEnabledForRelay: boolean;
  isVerified: boolean;
  lastSyncedAt: Date;
};

export type RelayClientRecord = {
  id: string;
  name: string;
  note: string | null;
  maskedToken: string;
  isEnabled: boolean;
  domainCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type MailboxRecord = {
  id: string;
  address: string;
  accountId: string;
  source: MailboxSource;
  status: MailboxStatus;
  isFavorite: boolean;
  displayName: string | null;
  lastViewedAt: Date | null;
  lastSyncedAt: Date | null;
  lastMessageSyncAt: Date | null;
  lastError: string | null;
};

export type MailboxSecretRecord = {
  mailboxId: string;
  hasPassword: boolean;
  hasToken: boolean;
  tokenValidatedAt: Date | null;
};

export type AttachmentRecord = {
  id: string;
  attachmentId: string;
  filename: string;
  contentType: string;
  size: number;
  downloadUrl: string;
};

export type MessageSummary = {
  id: string;
  messageId: string;
  mailboxId: string;
  fromName: string | null;
  fromAddress: string | null;
  subject: string;
  seen: boolean;
  isDeleted: boolean;
  hasAttachments: boolean;
  size: number;
  remoteCreatedAt: Date;
  syncedAt: Date;
};

export type MessageDetail = MessageSummary & {
  textBody: string | null;
  htmlBodies: string[];
  rawSourceData: string | null;
  attachments: AttachmentRecord[];
};

export type SyncResult = {
  action: string;
  targetType: SyncTargetType;
  targetId?: string;
  success: boolean;
  message: string;
  updatedCount?: number;
};
