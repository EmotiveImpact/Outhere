import { data } from "react-router";
import type { BattleModeKey, NewRun, PaceGroup, PickupType, Reaction, Role, Tier } from "@outhere/core";
import { startCheckout } from "~/checkout.server";
import { getData, PREVIEW_COOKIE, usingExampleData } from "~/data.server";
import type { Route } from "./+types/act";

/**
 * Every write in the web app comes through here as { intent, ...fields }.
 * Loaders revalidate afterwards, so pages show what the server now holds.
 */
export type Act =
  | { intent: "react"; postId: string; reaction: Reaction }
  | { intent: "comment"; postId: string; text: string }
  | { intent: "welcome"; postId: string }
  | { intent: "story-seen"; storyId: string }
  | { intent: "rsvp"; runId: string; going: boolean }
  | { intent: "chat-send"; clubId: string; channel: string; text: string }
  | { intent: "chat-vote"; clubId: string; channel: string; messageId: string; option: number }
  | { intent: "chat-react"; clubId: string; channel: string; messageId: string; index: number }
  | { intent: "chat-read"; clubId: string; channel: string }
  | { intent: "battle-create"; opponentId: string; mode: BattleModeKey; length: string; stake: string }
  | { intent: "challenge-accept"; id: string }
  | { intent: "challenge-decline"; id: string }
  | { intent: "surprise"; on: boolean }
  | { intent: "pickup-going"; id: string; going: boolean }
  | { intent: "pickup-post"; type: PickupType; title: string; at: string; when: string; visibility: string }
  | { intent: "run-create"; run: NewRun }
  | { intent: "public-profile"; on: boolean }
  | { intent: "notes-read" }
  | { intent: "join-decide"; clubId: string; requestId: string; approve: boolean }
  | { intent: "club-join"; slug: string; pace: PaceGroup; runId: string | null }
  | { intent: "club-page"; clubId: string; tagline?: string; cover?: string; tags?: string[]; slug?: string }
  | { intent: "offer"; clubId: string; offerId: string; accept: boolean }
  | { intent: "checkout"; tier: Tier; yearly: boolean; clubId: string }
  | { intent: "preview"; role: Role };

export async function action({ request }: Route.ActionArgs) {
  const act = (await request.json()) as Act;
  const db = await getData(request);
  try {
    switch (act.intent) {
      case "react": await db.react(act.postId, act.reaction); break;
      case "comment": await db.comment(act.postId, act.text); break;
      case "welcome": await db.welcome(act.postId); break;
      case "story-seen": await db.markStorySeen(act.storyId); break;
      case "rsvp": await db.setRsvp(act.runId, act.going); break;
      case "chat-send": await db.sendChat(act.clubId, act.channel, act.text); break;
      case "chat-vote": await db.votePoll(act.clubId, act.channel, act.messageId, act.option); break;
      case "chat-react": await db.toggleChatReaction(act.clubId, act.channel, act.messageId, act.index); break;
      case "chat-read": await db.readChannel(act.clubId, act.channel); break;
      case "battle-create": return { ok: true, ...(await db.createBattle({ opponentId: act.opponentId, mode: act.mode, length: act.length, stake: act.stake })) };
      case "challenge-accept": await db.acceptChallenge(act.id); break;
      case "challenge-decline": await db.declineChallenge(act.id); break;
      case "surprise": await db.setSurpriseChallengers(act.on); break;
      case "pickup-going": await db.setPickupGoing(act.id, act.going); break;
      case "pickup-post": return { ok: true, pickup: await db.postPickup(act) };
      case "run-create": await db.createRun(act.run); break;
      case "public-profile": await db.setPublicProfile(act.on); break;
      case "notes-read": await db.markNotificationsRead(); break;
      case "join-decide": await db.decideJoinRequest(act.clubId, act.requestId, act.approve); break;
      case "club-join": await db.joinClub(act.slug, { pace: act.pace, runId: act.runId }); break;
      case "club-page": {
        const { intent: _i, clubId, ...patch } = act;
        return { ok: true, club: await db.updateClubPage(clubId, patch) };
      }
      case "offer": await db.respondToOffer(act.clubId, act.offerId, act.accept); break;
      case "checkout": {
        const viewer = await db.viewer();
        return { ok: true, url: await startCheckout({ tier: act.tier, yearly: act.yearly, clubId: act.clubId, userId: viewer.id, origin: new URL(request.url).origin }) };
      }
      case "preview": {
        if (!usingExampleData()) return data({ ok: false, error: "PREVIEW_ONLY_ON_EXAMPLE_DATA" }, { status: 400 });
        return data({ ok: true }, { headers: { "Set-Cookie": `${PREVIEW_COOKIE}=${act.role}; Path=/; SameSite=Lax; Max-Age=31536000` } });
      }
      default:
        return data({ ok: false, error: "UNKNOWN_INTENT" }, { status: 400 });
    }
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : "FAILED";
    return data({ ok: false, error }, { status: 400 });
  }
}
