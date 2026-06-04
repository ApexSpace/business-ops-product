import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { decodeAccessToken, getDashboardPath } from "@/lib/auth";

export default async function HomePage() {
  const store = await cookies();
  const token = store.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    redirect("/login");
  }

  const payload = decodeAccessToken(token);
  if (payload) {
    redirect(getDashboardPath(payload.context));
  }

  redirect("/login");
}
