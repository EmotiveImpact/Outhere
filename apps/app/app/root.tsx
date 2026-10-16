import { isRouteErrorResponse, Link, Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { ExampleDataProvider, PeopleProvider, ToastProvider } from "@outhere/ui";
import "@outhere/ui/app.css";
import { getData, sessionMiddleware, usingExampleData } from "./data.server";
import type { Route } from "./+types/root";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" },
  { rel: "icon", href: "/_app/favicon.svg", type: "image/svg+xml" },
];

/** Real data: one Supabase session per request, with refreshed cookies sent back. */
export const middleware: Route.MiddlewareFunction[] = [sessionMiddleware];

export async function loader({ request }: Route.LoaderArgs) {
  const db = await getData(request);
  return { people: await db.people(), example: usingExampleData() };
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
        <meta name="theme-color" content="#06080b" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  return (
    <ExampleDataProvider value={loaderData.example}>
      <PeopleProvider people={loaderData.people}>
        <ToastProvider>
          <Outlet />
        </ToastProvider>
      </PeopleProvider>
    </ExampleDataProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  let detail = notFound ? "We couldn't find that page. If it was a club, it may have changed its link." : "Something went wrong on our side. Try again in a moment.";
  if (import.meta.env.DEV && error instanceof Error) detail = error.message;
  return (
    <main className="page" style={{ maxWidth: 640, margin: "80px auto", padding: 24 }}>
      <span className="kick">{notFound ? "404" : "Error"}</span>
      <h1 className="disp" style={{ fontSize: 72, marginTop: 12 }}>
        {notFound ? <>Not <span className="b">here</span></> : <>Hold <span className="b">up</span></>}
      </h1>
      <p className="muted" style={{ marginTop: 12 }}>{detail}</p>
      <Link className="btn btn-p mt" to="/">Back to Outhere</Link>
    </main>
  );
}
