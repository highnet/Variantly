export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://variantly.style';
export const REPO_URL = 'https://github.com/highnet/variantly';
export const SKILLS_URL = `${SITE_URL}/SKILLS.md`;

export const INSTALL = 'npx variantly';
export const DEMO = 'npx variantly --demo';

// YouTube ids of the narrated demo, one cut per site theme. Empty until
// uploaded: the page shows a "coming soon" frame in its place. If only one is
// set it is used for both themes.
export const DEMO_VIDEO_ID_LIGHT = '';
export const DEMO_VIDEO_ID_DARK = '';

// Booking page (Cal.com, Calendly, Google Calendar appointment schedule…) for
// "Book a live demo", shown with the demo video. Empty hides the button.
export const AUTHOR_URL = 'https://www.highnet.at';
export const CONTACT_EMAIL = 'joaquintelleria@gmail.com';
export const DEMO_BOOKING_URL =
  process.env.NEXT_PUBLIC_DEMO_BOOKING_URL ?? 'https://calendly.com/joaquintelleria/30min';
