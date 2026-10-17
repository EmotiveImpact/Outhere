/** Site-wide settings. Edit these rather than hunting through the pages. */
export const SITE = {
  name: 'Outhere',
  url: (import.meta.env.VITE_SITE_URL || 'https://weouthere.app').replace(/\/$/, ''),
  host: 'weouthere.app',
  privacyEmail: 'privacy@weouthere.app',
  /** The clickable app demo. Visitors can only open it once it is shared publicly; empty hides the button. */
  appDemoUrl: 'https://claude.ai/artifact/98grfv6cXNWjffQE3jhBdi',
  /** Fill in a URL to turn the footer button into a real link. Empty means "comes at launch". */
  social: { Instagram: '', TikTok: '', Strava: '', YouTube: '', X: '' } as Record<string, string>,
  prices: { pro: { m: '£5.99', y: '£59.99', yNote: "That's £5 a month" }, black: { m: '£12.99', y: '£129.99' } },
};
