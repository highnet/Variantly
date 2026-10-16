export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://variantly.tools';
export const REPO_URL = 'https://github.com/highnet/ProjectHusky';
export const SKILLS_URL = `${SITE_URL}/SKILLS.md`;

export const INSTALL = 'npx variantly';
export const DEMO = 'npx variantly --demo';

// YouTube id of the narrated demo. Empty until it is uploaded: the page shows
// a "coming soon" frame in its place. Set it and the embed appears.
export const DEMO_VIDEO_ID = '';

// Booking page (Cal.com, Calendly, Google Calendar appointment schedule…) for
// "Book a live demo". Empty hides the button; set it and the button appears.
export const DEMO_BOOKING_URL = process.env.NEXT_PUBLIC_DEMO_BOOKING_URL ?? '';
