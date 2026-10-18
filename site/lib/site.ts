import demoVideo from './demo-video.json';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://variantly.style';
export const REPO_URL = 'https://github.com/highnet/variantly';
export const SKILLS_URL = `${SITE_URL}/SKILLS.md`;

export const INSTALL = 'npx variantly';
export const DEMO = 'npx variantly --demo';

// The narrated demo, one cut per site theme, self-hosted on Vercel Blob.
// `npm run upload-demo-video` fills lib/demo-video.json. While both are null
// the page shows the demo-agent steps instead; if only one is set it is used
// for both themes.
export type DemoVideoCut = { mp4: string; poster: string | null };
export const DEMO_VIDEO_LIGHT: DemoVideoCut | null = demoVideo.light;
export const DEMO_VIDEO_DARK: DemoVideoCut | null = demoVideo.dark;

// Booking page (Cal.com, Calendly, Google Calendar appointment schedule…) for
// "Book a live demo", shown with the demo video. Empty hides the button.
export const AUTHOR_URL = 'https://www.highnet.at';
export const CONTACT_EMAIL = 'joaquintelleria@gmail.com';
export const DEMO_BOOKING_URL =
  process.env.NEXT_PUBLIC_DEMO_BOOKING_URL ?? 'https://calendly.com/joaquintelleria/30min';
