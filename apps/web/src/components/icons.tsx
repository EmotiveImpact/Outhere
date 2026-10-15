export const Close = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const Tick = ({ w = 1.8, label }: { w?: number; label?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-label={label} aria-hidden={label ? undefined : true} role={label ? 'img' : undefined}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const SOCIAL: [string, React.ReactNode][] = [
  ['Instagram', <><rect x="3" y="3" width="18" height="18" rx="5.2" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="17.4" cy="6.6" r="1.25" fill="currentColor" /></>],
  ['TikTok', <path fill="currentColor" d="M16.1 2.5c.4 2.4 1.9 4 4.4 4.3v3.3c-1.6 0-3.1-.5-4.4-1.4v6.6a6.3 6.3 0 1 1-6.3-6.3c.3 0 .7 0 1 .1v3.4a3 3 0 1 0 2 2.8V2.5z" />],
  ['Strava', <path fill="currentColor" d="M15.4 17.9l-2.1-4.2h-3.1L15.4 24l5.1-10.3h-3.1zM10.4 8l2.9 5.7h4.3L10.4 0 3.2 13.7h4.3z" />],
  ['YouTube', <path fill="currentColor" fillRule="evenodd" d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.6 2.6 0 0 0 2.4 7.2 27 27 0 0 0 2 12a27 27 0 0 0 .4 4.8 2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8A27 27 0 0 0 22 12a27 27 0 0 0-.4-4.8zM10 15V9l5.2 3z" />],
  ['X', <path fill="currentColor" d="M18.2 2.5h3.3l-7.2 8.2 8.5 10.8h-6.6l-5.2-6.7-6 6.7H1.7l7.7-8.8L1.3 2.5h6.8l4.7 6.1zm-1.2 17h1.8L7.1 4.4H5.2z" />],
];
