import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * The root has no content of its own. Middleware already redirects "/" before
 * anything renders; this is the fallback for the case where it doesn't run
 * (a matcher change, a direct render), so the root never shows a blank page.
 */
export default async function Home() {
  const session = await auth();
  redirect(session?.user ? "/my-team" : "/login");
}
