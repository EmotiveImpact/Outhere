import { firstName, type AuditEntry, type Viewer } from "@outhere/core";

/** How a staff member signs the audit log: "Kemi A." */
export const signature = (viewer: Pick<Viewer, "name">): string => {
  const last = viewer.name.split(" ")[1];
  return last ? `${firstName(viewer.name)} ${last[0]}.` : firstName(viewer.name);
};

/** The audit log as CSV, saved to the viewer's downloads. */
export function downloadAudit(entries: AuditEntry[]): void {
  const cell = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = [["When", "Who", "Action", "Target"], ...entries.map((e) => [e.at, e.actor, e.action, e.target])];
  const blob = new Blob([lines.map((l) => l.map(cell).join(",")).join("\n") + "\n"], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `outhere-audit-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Sets the tab title for a page. */
export const pageTitle = (page: string): string => (page === "Overview" ? "Outhere HQ" : `${page} · Outhere HQ`);
