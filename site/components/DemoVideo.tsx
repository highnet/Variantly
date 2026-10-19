'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';

import { CommandCopy } from '@/components/CommandCopy';
import { LiquidNumeral } from '@/components/LiquidNumeral';
import { Typography } from '@/components/ui/Typography';
import { buttonVariants } from '@/components/ui/Button';
import { Rich } from '@/components/ui/Rich';
import { DEMO_STEPS } from '@/lib/content';
import { DEMO_BOOKING_URL, DEMO_VIDEO_DARK, DEMO_VIDEO_LIGHT } from '@/lib/site';

const HAS_VIDEO = Boolean(DEMO_VIDEO_LIGHT || DEMO_VIDEO_DARK);

// The site theme (html[data-theme], set before paint by the boot script).
const subscribeTheme = (onChange: () => void) => {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => mo.disconnect();
};
const readTheme = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
const serverTheme = () => 'light' as const;

/*
 * The narrated live demo, straight after the showcase: people who just saw
 * the result watch it happen before reading the steps. A 16:9 frame holds
 * the space either way, so the page doesn't shift when the video lands.
 * The films are served from Vercel Blob, so nothing loads from a third
 * party; with preload="none" only the poster loads until play is pressed.
 * The light or dark cut follows the site theme, and switching theme
 * mid-play carries on from the same moment. Captions are burned in.
 */
const DemoVideo = () => {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, serverTheme);
  const cut =
    theme === 'dark'
      ? (DEMO_VIDEO_DARK ?? DEMO_VIDEO_LIGHT)
      : (DEMO_VIDEO_LIGHT ?? DEMO_VIDEO_DARK);
  const mp4 = cut?.mp4;
  const video = useRef<HTMLVideoElement>(null);

  // src is set here rather than as a prop so a theme switch can keep the
  // place: a new src resets the element, so note the time and state first.
  useEffect(() => {
    const el = video.current;
    if (!el || !mp4 || el.src === mp4) return;
    const at = el.currentTime;
    const playing = !el.paused && !el.ended;
    el.src = mp4;
    if (at > 0) el.currentTime = at;
    if (playing) void el.play().catch(() => {});
  }, [mp4]);

  return (
    <section id="try" aria-labelledby="demo-title" className="grid scroll-mt-28 gap-9">
      <div className="grid max-w-[68ch] gap-3">
        <Typography variant="headline" as="h2" id="demo-title">
          {HAS_VIDEO ? 'Watch a run' : 'Try a whole run, no AI needed'}
        </Typography>
        <p className="text-steel m-0 text-[16px] leading-relaxed">
          {HAS_VIDEO
            ? 'A live demo, narrated: one command, the wizard, variants being made, then picking one to keep.'
            : 'The comparison above is a finished run. To see the whole flow on your own machine, use the built-in demo agent: same worktrees, live previews and Keep, but it only appends a fixed CSS theme instead of calling a model. No account, no credits.'}
        </p>
      </div>
      {!HAS_VIDEO && (
        <ol className="m-0 grid max-w-[1100px] list-none gap-8 p-0 md:grid-cols-2 lg:grid-cols-3">
          {DEMO_STEPS.map((step, i) => (
            <li key={step.title} className="border-ink grid content-start gap-3 border-t-2 pt-4">
              <LiquidNumeral n={String(i + 1).padStart(2, '0')} className="text-[2.5rem]" />
              <span className="text-[17px] font-semibold">{step.title}</span>
              <p className="text-steel m-0 text-[15px] leading-relaxed">
                <Rich text={step.body} />
              </p>
              {step.commands?.map((c) => (
                <CommandCopy key={c} command={c} size="sm" className="w-fit max-w-full min-w-56" />
              ))}
            </li>
          ))}
        </ol>
      )}
      {HAS_VIDEO && (
        <div className="border-ink bg-slate relative aspect-video w-full max-w-[1100px] overflow-hidden rounded-md border-2">
          {/* Captions are burned into the film, so there is no caption track. */}
          <video
            ref={video}
            className="absolute inset-0 size-full"
            poster={cut?.poster ?? undefined}
            preload="none"
            controls
            playsInline
            aria-label="variantly live demo, narrated, with burned-in captions"
          />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <a href="#start" className={buttonVariants({ variant: 'primary', size: 'big' })}>
          Set it up on your site
        </a>
        {DEMO_BOOKING_URL && (
          <a
            href={DEMO_BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink inline-flex items-center gap-2 font-semibold underline underline-offset-2"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5 fill-none stroke-current stroke-2"
              aria-hidden="true"
            >
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            Book a live demo
          </a>
        )}
      </div>
    </section>
  );
};

export { DemoVideo };
