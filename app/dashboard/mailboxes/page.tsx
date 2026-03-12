import Link from "next/link";
import { MailboxStatus } from "@prisma/client";

import { toggleFavoriteMailboxAction } from "@/app/actions";
import { FlashMessage } from "@/components/flash-message";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { InboxEmptyState } from "@/components/dashboard/inbox-empty-state";
import { MailboxWorkspace } from "@/components/dashboard/mailbox-workspace";
import { SubmitButton } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableWrapper, TD, TH } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { getRequestBasePath } from "@/lib/request-base-path";
import { formatText } from "@/lib/i18n";
import { getServerDictionary } from "@/lib/server-i18n";
import { formatDateTime, withBasePath } from "@/lib/utils";

const MAILBOX_LIST_PAGE_SIZE = 25;

function normalizePage(value: string | undefined) {
  const page = Number(value ?? "1");
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function normalizeStatus(value: string | undefined) {
  if (
    value === MailboxStatus.ACTIVE ||
    value === MailboxStatus.AUTH_ERROR ||
    value === MailboxStatus.REMOTE_DELETED
  ) {
    return value;
  }

  return "all";
}

function normalizeSort(value: string | undefined) {
  return value === "lastSyncedAt" ? "lastSyncedAt" : "updatedAt";
}

function createMailboxListHref(
  basePath: string,
  params: Record<string, string | null | undefined>,
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();
  return withBasePath(`/dashboard/mailboxes${query ? `?${query}` : ""}`, basePath);
}

export default async function MailboxesPage({
  searchParams,
}: {
  searchParams: Promise<{
    success?: string;
    error?: string;
    action?: string;
    q?: string;
    status?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const [params, t] = await Promise.all([searchParams, getServerDictionary()]);
  const basePath = await getRequestBasePath();
  const q = (params.q ?? "").trim();
  const currentPage = normalizePage(params.page);
  const statusFilter = normalizeStatus(params.status);
  const sortField = normalizeSort(params.sort);
  const action =
    params.action === "register" || params.action === "join" || params.action === "login"
      ? params.action
      : null;

  const mailboxWhere = {
    ...(q
      ? {
          OR: [
            {
              address: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
            {
              displayName: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
    ...(statusFilter === "all"
      ? {
          status: {
            in: [MailboxStatus.ACTIVE, MailboxStatus.AUTH_ERROR, MailboxStatus.REMOTE_DELETED],
          },
        }
      : {
          status: statusFilter,
        }),
  };

  const [totalMailboxes, mailboxes, domains] = await Promise.all([
    prisma.mailbox.count({
      where: mailboxWhere,
    }),
    prisma.mailbox.findMany({
      where: mailboxWhere,
      orderBy:
        sortField === "lastSyncedAt"
          ? [{ lastSyncedAt: "desc" }, { updatedAt: "desc" }]
          : [{ updatedAt: "desc" }],
      skip: (currentPage - 1) * MAILBOX_LIST_PAGE_SIZE,
      take: MAILBOX_LIST_PAGE_SIZE,
      select: {
        id: true,
        address: true,
        displayName: true,
        status: true,
        isFavorite: true,
        lastViewedAt: true,
        lastSyncedAt: true,
        updatedAt: true,
      },
    }),
    prisma.domainCache.findMany({
      where: { isPrivate: true },
      orderBy: [{ isPrivate: "desc" }, { domain: "asc" }],
      select: {
        id: true,
        domain: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalMailboxes / MAILBOX_LIST_PAGE_SIZE));
  const previousHref =
    currentPage > 1
      ? createMailboxListHref(basePath, {
          q,
          status: statusFilter === "all" ? null : statusFilter,
          sort: sortField === "updatedAt" ? null : sortField,
          page: String(currentPage - 1),
          action,
        })
      : null;
  const nextHref =
    currentPage < totalPages
      ? createMailboxListHref(basePath, {
          q,
          status: statusFilter === "all" ? null : statusFilter,
          sort: sortField === "updatedAt" ? null : sortField,
          page: String(currentPage + 1),
          action,
        })
      : null;
  const currentListHref = createMailboxListHref(basePath, {
    q,
    status: statusFilter === "all" ? null : statusFilter,
    sort: sortField === "updatedAt" ? null : sortField,
    page: String(currentPage),
    action,
  });

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      <DashboardTopbar
        leftSlot={
          <div className="text-sm font-medium text-slate-500">
            {action ? t.mailboxOpsAndList : t.mailboxList}
          </div>
        }
      />

      <FlashMessage success={params.success} error={params.error} />

      <section className="space-y-6 px-5 pb-8 pt-4 sm:px-7">
        {action ? (
          <MailboxWorkspace
            action={action}
            privateDomains={domains}
          />
        ) : null}

        <Card>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>{t.managedMailboxes}</CardTitle>
              <CardDescription className="mt-1">
                {t.lowFrequencyHostingHint}
              </CardDescription>
            </div>
            <div className="text-sm text-slate-500">
              {formatText(t.totalMailboxes, {
                count: totalMailboxes,
                page: currentPage,
                totalPages,
              })}
            </div>
          </div>

          <form action={withBasePath("/dashboard/mailboxes", basePath)} className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="q">
                {t.search}
              </label>
              <Input defaultValue={q} id="q" name="q" placeholder={t.searchMailboxPlaceholder} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="status">
                {t.status}
              </label>
              <select
                className="flex h-11 w-full rounded-2xl border border-slate-200 bg-[#f8f8f9] px-4 text-sm outline-none focus:border-[#3867d6] focus:ring-2 focus:ring-[#dcd8ff]"
                defaultValue={statusFilter}
                id="status"
                name="status"
              >
                <option value="all">{t.all}</option>
                <option value={MailboxStatus.ACTIVE}>ACTIVE</option>
                <option value={MailboxStatus.AUTH_ERROR}>AUTH_ERROR</option>
                <option value={MailboxStatus.REMOTE_DELETED}>REMOTE_DELETED</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="sort">
                {t.sort}
              </label>
              <select
                className="flex h-11 w-full rounded-2xl border border-slate-200 bg-[#f8f8f9] px-4 text-sm outline-none focus:border-[#3867d6] focus:ring-2 focus:ring-[#dcd8ff]"
                defaultValue={sortField}
                id="sort"
                name="sort"
              >
                <option value="updatedAt">{t.sortUpdatedAt}</option>
                <option value="lastSyncedAt">{t.sortLastSyncedAt}</option>
              </select>
            </div>
            <div className="flex items-end">
              <SubmitButton className="h-11 w-full justify-center rounded-2xl px-6" pendingText={t.filtering}>
                {t.applyFilters}
              </SubmitButton>
            </div>
          </form>

          {mailboxes.length === 0 ? (
            <div className="mt-6">
              <InboxEmptyState />
            </div>
          ) : (
            <>
              <div className="mt-6">
                <TableWrapper>
                  <Table>
                    <thead>
                      <tr>
                        <TH>{t.managedMailboxes}</TH>
                        <TH>{t.status}</TH>
                        <TH>{t.lastViewedAt}</TH>
                        <TH>{t.lastSyncedAtLabel}</TH>
                        <TH>{t.sortUpdatedAt}</TH>
                        <TH>{t.action}</TH>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white/65">
                      {mailboxes.map((mailbox) => (
                        <tr key={mailbox.id}>
                          <TD>
                            <div className="space-y-1">
                              <div className="font-medium text-slate-900">{mailbox.address}</div>
                              {mailbox.displayName ? (
                                <div className="text-sm text-slate-500">{mailbox.displayName}</div>
                              ) : null}
                            </div>
                          </TD>
                          <TD>
                            <Badge variant={mailbox.status === MailboxStatus.ACTIVE ? "success" : mailbox.status === MailboxStatus.AUTH_ERROR ? "warning" : "muted"}>
                              {mailbox.status}
                            </Badge>
                            {mailbox.isFavorite ? (
                              <div className="mt-2 text-xs font-medium text-amber-600">{t.favoriteMailbox}</div>
                            ) : null}
                          </TD>
                          <TD>{formatDateTime(mailbox.lastViewedAt)}</TD>
                          <TD>{formatDateTime(mailbox.lastSyncedAt)}</TD>
                          <TD>{formatDateTime(mailbox.updatedAt)}</TD>
                          <TD>
                            <div className="flex flex-wrap gap-2">
                              <Link
                                className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                href={withBasePath(`/dashboard/mailboxes/${mailbox.id}`, basePath)}
                              >
                                {t.open}
                              </Link>
                              <form action={toggleFavoriteMailboxAction}>
                                <input name="id" type="hidden" value={mailbox.id} />
                                <input name="redirectTo" type="hidden" value={currentListHref} />
                                <SubmitButton pendingText={t.processing} size="sm" variant="outline">
                                  {mailbox.isFavorite ? t.unfavoriteMailbox : t.favoriteMailbox}
                                </SubmitButton>
                              </form>
                            </div>
                          </TD>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrapper>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-slate-500">
                  当前显示 {(currentPage - 1) * MAILBOX_LIST_PAGE_SIZE + 1}
                  {" - "}
                  {Math.min(currentPage * MAILBOX_LIST_PAGE_SIZE, totalMailboxes)} / {totalMailboxes}
                </div>
                <div className="flex items-center gap-2">
                  {previousHref ? (
                    <Link
                      className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      href={previousHref}
                    >
                      {t.previousPage}
                    </Link>
                  ) : (
                    <span className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-medium text-slate-400">
                      {t.previousPage}
                    </span>
                  )}
                  {nextHref ? (
                    <Link
                      className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      href={nextHref}
                    >
                      {t.nextPage}
                    </Link>
                  ) : (
                    <span className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-medium text-slate-400">
                      {t.nextPage}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </Card>
      </section>
    </main>
  );
}
