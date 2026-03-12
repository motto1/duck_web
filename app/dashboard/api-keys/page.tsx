import { redirect } from "next/navigation";
import { withRequestBasePath } from "@/lib/request-base-path";

export default async function ApiKeysPage() {
  redirect(await withRequestBasePath("/dashboard/settings"));
}
