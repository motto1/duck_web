import { redirect } from "next/navigation";

import { getAdminSession } from "@/lib/auth";
import { withRequestBasePath } from "@/lib/request-base-path";

export default async function HomePage() {
  const session = await getAdminSession();
  redirect(await withRequestBasePath(session ? "/dashboard" : "/login"));
}
