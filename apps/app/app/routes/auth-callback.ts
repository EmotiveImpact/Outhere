import { redirect } from "react-router";
import type { EmailOtpType } from "@supabase/supabase-js";
import { usingExampleData } from "~/data.server";
import { safeNext, session } from "~/supabase.server";
import type { Route } from "./+types/auth-callback";

const OTP_TYPES: EmailOtpType[] = ["magiclink", "signup", "email", "invite", "recovery", "email_change"];

/**
 * Where the email link lands. A link with a code (the default) is swapped for
 * a session; a link with a token hash (if the email template uses one) is
 * verified. Either way the session cookies go back with the redirect.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  if (usingExampleData()) throw redirect(next);
  const { client } = await session(request);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = OTP_TYPES.find((t) => t === url.searchParams.get("type"));
  const { error } = code
    ? await client.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await client.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("no code") };
  if (error) throw redirect(`/signin?error=link&next=${encodeURIComponent(next)}`);
  throw redirect(next);
}
