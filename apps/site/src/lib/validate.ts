/** The choices the forms offer. The website migration in supabase/ accepts the same values. */
import { type Borough } from './boroughs';

export const MOVES = ['Walk', 'Run', 'Both'] as const;
export const ROLES = ['Captain', 'Organiser', 'Coach'] as const;
export const SIZES = ['Under 20', '20 to 50', '50 to 150', '150 or more'] as const;

export type WaitlistInput = { email: string; borough: Borough; move: (typeof MOVES)[number]; club: string; ref: string; invite: boolean };
export type ClaimInput = { club: string; borough: Borough; size: (typeof SIZES)[number]; role: (typeof ROLES)[number]; email: string; social: string };
export type BlackInput = { name: string; email: string; borough: Borough; code: string; why: string };
