import { redirect } from "react-router";
import { usingExampleData } from "~/data.server";
import { session } from "~/supabase.server";
import type { Route } from "./+types/signout";

/** Sign out (a POST from the sidebar), then back to the sign in page. */
export async function action({ request }: Route.ActionArgs) {
  if (usingExampleData()) throw redirect("/");
  const { client } = await session(request);
  await client.auth.signOut();
  throw redirect("/signin");
}

/** Opening /signout directly does nothing on its own; signing out needs the button. */
export async function loader() {
  throw redirect("/");
}
