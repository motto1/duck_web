-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MailboxSource" AS ENUM ('CREATED', 'JOINED_PASSWORD', 'JOINED_TOKEN');

-- CreateEnum
CREATE TYPE "MailboxStatus" AS ENUM ('ACTIVE', 'REMOVED', 'REMOTE_DELETED', 'AUTH_ERROR');

-- CreateEnum
CREATE TYPE "SyncTargetType" AS ENUM ('API_KEY', 'MAILBOX', 'MESSAGE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "DuckMailProxyType" AS ENUM ('HTTP', 'HTTPS', 'SOCKS5');

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "encryptedKey" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainCache" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "domain" TEXT NOT NULL,
    "ownerId" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "isEnabledForRelay" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "verificationToken" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelayClient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "encryptedToken" TEXT NOT NULL,
    "tokenFingerprint" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RelayClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelayClientDomain" (
    "relayClientId" TEXT NOT NULL,
    "domainCacheId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RelayClientDomain_pkey" PRIMARY KEY ("relayClientId","domainCacheId")
);

-- CreateTable
CREATE TABLE "AppConfig" (
    "id" TEXT NOT NULL,
    "duckmailApiBaseUrl" TEXT,
    "encryptedAdminPassword" TEXT,
    "duckmailProxyEnabled" BOOLEAN,
    "duckmailProxyType" "DuckMailProxyType",
    "duckmailProxyHost" TEXT,
    "duckmailProxyPort" INTEGER,
    "duckmailProxyUsername" TEXT,
    "encryptedDuckmailProxyPassword" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mailbox" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "source" "MailboxSource" NOT NULL,
    "status" "MailboxStatus" NOT NULL DEFAULT 'ACTIVE',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "displayName" TEXT,
    "lastViewedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "lastMessageSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mailbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailboxSecret" (
    "id" TEXT NOT NULL,
    "mailboxId" TEXT NOT NULL,
    "encryptedPassword" TEXT,
    "encryptedToken" TEXT NOT NULL,
    "tokenValidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailboxSecret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "mailboxId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "msgid" TEXT,
    "accountId" TEXT,
    "fromName" TEXT,
    "fromAddress" TEXT,
    "toJson" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "seen" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "hasAttachments" BOOLEAN NOT NULL DEFAULT false,
    "size" INTEGER NOT NULL DEFAULT 0,
    "downloadUrl" TEXT,
    "textBody" TEXT,
    "htmlBodiesJson" TEXT,
    "rawSourceData" TEXT,
    "sourceDownloadUrl" TEXT,
    "remoteCreatedAt" TIMESTAMP(3) NOT NULL,
    "remoteUpdatedAt" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "messageDbId" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "disposition" TEXT,
    "transferEncoding" TEXT,
    "related" BOOLEAN NOT NULL DEFAULT false,
    "size" INTEGER NOT NULL DEFAULT 0,
    "downloadUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "targetType" "SyncTargetType" NOT NULL,
    "targetId" TEXT,
    "action" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorType" TEXT,
    "errorMessage" TEXT,
    "detailsJson" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DomainCache_apiKeyId_domain_key" ON "DomainCache"("apiKeyId", "domain");

-- CreateIndex
CREATE UNIQUE INDEX "RelayClient_tokenFingerprint_key" ON "RelayClient"("tokenFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "Mailbox_address_key" ON "Mailbox"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Mailbox_accountId_key" ON "Mailbox"("accountId");

-- CreateIndex
CREATE INDEX "Mailbox_status_updatedAt_idx" ON "Mailbox"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "Mailbox_address_idx" ON "Mailbox"("address");

-- CreateIndex
CREATE INDEX "Mailbox_isFavorite_updatedAt_idx" ON "Mailbox"("isFavorite", "updatedAt");

-- CreateIndex
CREATE INDEX "Mailbox_lastViewedAt_idx" ON "Mailbox"("lastViewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MailboxSecret_mailboxId_key" ON "MailboxSecret"("mailboxId");

-- CreateIndex
CREATE INDEX "Message_mailboxId_remoteCreatedAt_idx" ON "Message"("mailboxId", "remoteCreatedAt");

-- CreateIndex
CREATE INDEX "Message_mailboxId_isDeleted_remoteCreatedAt_idx" ON "Message"("mailboxId", "isDeleted", "remoteCreatedAt");

-- CreateIndex
CREATE INDEX "Message_mailboxId_syncedAt_idx" ON "Message"("mailboxId", "syncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Message_mailboxId_messageId_key" ON "Message"("mailboxId", "messageId");

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_messageDbId_attachmentId_key" ON "Attachment"("messageDbId", "attachmentId");

-- CreateIndex
CREATE INDEX "SyncLog_startedAt_idx" ON "SyncLog"("startedAt");

-- CreateIndex
CREATE INDEX "SyncLog_targetType_startedAt_idx" ON "SyncLog"("targetType", "startedAt");

-- AddForeignKey
ALTER TABLE "DomainCache" ADD CONSTRAINT "DomainCache_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelayClientDomain" ADD CONSTRAINT "RelayClientDomain_relayClientId_fkey" FOREIGN KEY ("relayClientId") REFERENCES "RelayClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelayClientDomain" ADD CONSTRAINT "RelayClientDomain_domainCacheId_fkey" FOREIGN KEY ("domainCacheId") REFERENCES "DomainCache"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailboxSecret" ADD CONSTRAINT "MailboxSecret_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "Mailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "Mailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_messageDbId_fkey" FOREIGN KEY ("messageDbId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
