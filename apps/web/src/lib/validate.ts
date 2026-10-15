/** The choices the forms offer. The website migration in supabase/ accepts the same values. */
import { type Place } from './places';

export const MOVES = ['Walk', 'Run', 'Both'] as const;
export const ROLES = ['Captain', 'Organiser', 'Coach'] as const;
export const SIZES = ['Under 20', '20 to 50', '50 to 150', '150 or more'] as const;

export type WaitlistInput = { email: string; place: Place; move: (typeof MOVES)[number]; club: string; ref: string; invite: boolean };
export type ClaimInput = { club: string; place: Place; size: (typeof SIZES)[number]; role: (typeof ROLES)[number]; email: string; social: string };
export type BlackInput = { name: string; email: string; place: Place; code: string; why: string };

/** A town outside the launch cities needs a name and the region it plays for. */
export function placeError(p: Place): string {
  if (p.city !== 'elsewhere') return '';
  if (!p.town.trim()) return 'Tell us your town or city.';
  if (!p.region) return 'Pick the region your town is in.';
  return '';
}
