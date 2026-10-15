/**
 * Turning PostgREST responses into values or coded errors.
 *
 * The database raises its own error codes as the exception message
 * (`raise exception 'EVENT_FULL'`), which PostgREST returns with SQLSTATE
 * P0001. Those codes pass straight through, so the apps can switch on
 * `error.message` exactly as they do with the mock. A few Postgres and
 * PostgREST codes get a readable name; anything else becomes DB_ERROR.
 */

export interface DbErrorLike {
  code?: string | null;
  message: string;
  hint?: string | null;
  details?: string | null;
}

export class DataError extends Error {
  /** The code the apps switch on; the same string as `message`. */
  readonly code: string;
  /** The database's hint, when it sent one (for TIER_REQUIRED, the tier needed). */
  readonly hint: string | null;
  /** The original Postgres or PostgREST error, for logs. */
  readonly original: DbErrorLike | null;

  constructor(code: string, original: DbErrorLike | null = null) {
    super(code);
    this.name = "DataError";
    this.code = code;
    this.hint = original?.hint ?? null;
    this.original = original;
  }
}

const KNOWN: Record<string, string> = {
  "42501": "NOT_ALLOWED", // row level security said no
  "23505": "ALREADY_EXISTS", // unique violation
  "23503": "NOT_FOUND", // foreign key points at nothing
  "23514": "INVALID", // check constraint
  "22P02": "NOT_FOUND", // not a valid uuid, so it cannot exist
  PGRST116: "NOT_FOUND", // .single() found no row
  PGRST301: "NOT_SIGNED_IN", // JWT missing or expired
  PGRST303: "NOT_SIGNED_IN",
};

/** Our own codes are upper case words joined by underscores. */
const OWN_CODE = /^[A-Z][A-Z0-9_]*$/;

export function toDataError(e: DbErrorLike): DataError {
  if (e.code === "P0001" && OWN_CODE.test(e.message)) return new DataError(e.message, e);
  const known = e.code ? KNOWN[e.code] : undefined;
  return new DataError(known ?? "DB_ERROR", e);
}

type Response = { data: unknown; error: DbErrorLike | null };

/** Rows from a list query; throws on error. */
export function rows<R extends Response>(res: R): NonNullable<R["data"]> {
  if (res.error) throw toDataError(res.error);
  return (res.data ?? []) as NonNullable<R["data"]>;
}

/** One row or null from a maybeSingle query; throws on error. */
export function one<R extends Response>(res: R): NonNullable<R["data"]> | null {
  if (res.error) throw toDataError(res.error);
  return (res.data ?? null) as NonNullable<R["data"]> | null;
}

/** A write or RPC whose result we only need to have succeeded. */
export function done(res: { error: DbErrorLike | null }): void {
  if (res.error) throw toDataError(res.error);
}

/** A head count query; throws on error. */
export function counted(res: { count: number | null; error: DbErrorLike | null }): number {
  if (res.error) throw toDataError(res.error);
  return res.count ?? 0;
}
