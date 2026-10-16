import { useToast } from "@outhere/ui";
import { useAct } from "~/hooks";

/** "I'll come" on a club run, used in the feed, chat and calendar. */
export function GoingButton({ runId, going, style }: { runId: string; going: boolean; style?: React.CSSProperties }) {
  const toast = useToast();
  const { act, pending } = useAct();
  const on = pending?.intent === "rsvp" ? pending.going : going;
  return (
    <button
      type="button"
      className={`btn btn-s ${on ? "btn-q" : "btn-p"}`}
      aria-pressed={on}
      style={style}
      onClick={() => {
        act({ intent: "rsvp", runId, going: !on });
        if (!on) toast("You're on the list. See you there.");
      }}
    >
      {on ? "Going ✓" : "I'll come"}
    </button>
  );
}
