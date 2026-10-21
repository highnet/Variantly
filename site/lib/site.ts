import demoVideo from './demo-video.json';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://variantly.style';
export const REPO_URL = 'https://github.com/highnet/variantly';
export const SKILLS_URL = `${SITE_URL}/SKILLS.md`;

export const INSTALL = 'npx variantly';
export const DEMO = 'npx variantly --demo';

// The narrated demo on the homepage, one film per site theme. `npm run
// upload-demo-video` puts the MP4s on Vercel Blob and fills
// lib/demo-video.json (with `-- --cut 90s`, the 90-second cut under `short`);
// `npm run mux-demo-video` then copies each one to Mux and adds its
// `playbackId`, which streams adaptively (HLS) instead of as one big file. A
// cut with no playbackId plays the Blob MP4. The 90-second cut plays first,
// with a switch to the whole run; with neither, the homepage shows no video.
// If only one theme is set it is used for both.
export type DemoVideoCut = { mp4: string; poster: string | null; playbackId?: string | null };
export const DEMO_VIDEO_LIGHT: DemoVideoCut | null = demoVideo.light;
export const DEMO_VIDEO_DARK: DemoVideoCut | null = demoVideo.dark;
export const DEMO_VIDEO_SHORT_LIGHT: DemoVideoCut | null = demoVideo.short.light;
export const DEMO_VIDEO_SHORT_DARK: DemoVideoCut | null = demoVideo.short.dark;

// Booking page (Cal.com, Calendly, Google Calendar appointment schedule…) for
// "Book a live demo", shown with the demo video. Empty hides the button.
export const AUTHOR_URL = 'https://www.highnet.at';
export const CONTACT_EMAIL = 'joaquintelleria@gmail.com';
export const DEMO_BOOKING_URL =
  process.env.NEXT_PUBLIC_DEMO_BOOKING_URL ?? 'https://calendly.com/joaquintelleria/30min';
