import { redirect } from "next/navigation";
import { withRequestBasePath } from "@/lib/request-base-path";

export default async function DashboardPage() {
  redirect(await withRequestBasePath("/dashboard/mailboxes"));
}
