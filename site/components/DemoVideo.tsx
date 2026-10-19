'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { CommandCopy } from '@/components/CommandCopy';
import { LiquidNumeral } from '@/components/LiquidNumeral';
import { Typography } from '@/components/ui/Typography';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Rich } from '@/components/ui/Rich';
import { DEMO_STEPS } from '@/lib/content';
import {
  DEMO_BOOKING_URL,
  DEMO_VIDEO_DARK,
  DEMO_VIDEO_LIGHT,
  DEMO_VIDEO_SHORT_DARK,
  DEMO_VIDEO_SHORT_LIGHT,
  type DemoVideoCut,
} from '@/lib/site';

const HAS_FULL = Boolean(DEMO_VIDEO_LIGHT || DEMO_VIDEO_DARK);
const HAS_SHORT = Boolean(DEMO_VIDEO_SHORT_LIGHT || DEMO_VIDEO_SHORT_DARK);

type Length = 'short' | 'full';

const LENGTHS: readonly (readonly [Length, string])[] = [
  ['short', '90 seconds'],
  ['full', 'The whole run · 10 min'],
];

// The site theme (html[data-theme], set before paint by the boot script).
const subscribeTheme = (onChange: () => void) => {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => mo.disconnect();
};
const readTheme = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
const serverTheme = () => 'light' as const;

const pick = (light: DemoVideoCut | null, dark: DemoVideoCut | null, theme: 'light' | 'dark') =>
  theme === 'dark' ? (dark ?? light) : (light ?? dark);

/*
 * The narrated live demo, straight after the showcase: people who just saw
 * the result watch it happen. The 90-second cut plays first, with a switch to
 * the whole run. A 16:9 frame holds the space either way, so the page doesn't
 * shift when the video lands. The films are served from Vercel Blob, so
 * nothing loads from a third party; with preload="none" only the poster loads
 * until play is pressed. The light or dark film follows the site theme, and
 * switching theme mid-play carries on from the same moment; switching length
 * starts the other film from the top. Captions are burned in.
 */
const DemoVideo = () => {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, serverTheme);
  const [length, setLength] = useState<Length>(HAS_SHORT ? 'short' : 'full');
  const cut =
    length === 'short'
      ? pick(DEMO_VIDEO_SHORT_LIGHT, DEMO_VIDEO_SHORT_DARK, theme)
      : pick(DEMO_VIDEO_LIGHT, DEMO_VIDEO_DARK, theme);
  const mp4 = cut?.mp4;
  const video = useRef<HTMLVideoElement>(null);
  const shown = useRef<Length>(length);

  // src is set here rather than as a prop so a theme switch can keep the
  // place: a new src resets the element, so note the time and state first.
  // A length switch is a different film, so it starts from the top.
  useEffect(() => {
    const el = video.current;
    if (!el || !mp4 || el.src === mp4) return;
    const at = shown.current === length ? el.currentTime : 0;
    const playing = !el.paused && !el.ended;
    shown.current = length;
    el.src = mp4;
    if (at > 0) el.currentTime = at;
    if (playing) void el.play().catch(() => {});
  }, [mp4, length]);

  if (!HAS_FULL && !HAS_SHORT) return null;

  return (
    <section id="watch" aria-labelledby="demo-title" className="grid scroll-mt-28 gap-9">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <div className="grid max-w-[68ch] gap-3">
          <Typography variant="headline" as="h2" id="demo-title">
            Watch a run
          </Typography>
          <p className="text-steel m-0 text-[16px] leading-relaxed">
            A live demo, narrated: one command, the wizard, variants being made, then picking one to
            keep.
          </p>
        </div>
        {HAS_SHORT && HAS_FULL && (
          <div
            role="group"
            aria-label="Video length"
            className="border-rule rounded-chip flex gap-1 border p-1"
          >
            {LENGTHS.map(([value, label]) => (
              <Button
                key={value}
                variant="concept"
                size="small"
                aria-pressed={length === value}
                onClick={() => setLength(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        )}
      </div>
      <div className="border-ink bg-slate relative aspect-video w-full max-w-[1100px] overflow-hidden rounded-md border-2">
        {/* Captions are burned into the film, so there is no caption track. */}
        <video
          ref={video}
          className="absolute inset-0 size-full"
          poster={cut?.poster ?? undefined}
          preload="none"
          controls
          playsInline
          aria-label={
            length === 'short'
              ? 'variantly in 90 seconds, narrated, with burned-in captions'
              : 'variantly live demo, the whole run, narrated, with burned-in captions'
          }
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link href="/start" className={buttonVariants({ variant: 'primary', size: 'big' })}>
          Set it up on your site
        </Link>
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

/*
 * The whole flow on your own machine with the built-in demo agent: same
 * worktrees, live previews and Keep, no model. /start#try lands here.
 */
const DemoSteps = () => (
  <section id="try" aria-labelledby="try-title" className="grid scroll-mt-28 gap-9">
    <div className="grid max-w-[68ch] gap-3">
      <Typography variant="headline" as="h2" id="try-title">
        Try a whole run, no AI needed
      </Typography>
      <p className="text-steel m-0 text-[16px] leading-relaxed">
        To see the whole flow on your own machine, use the built-in demo agent: same worktrees, live
        previews and Keep, but it only appends a fixed CSS theme instead of calling a model. No
        account, no credits.
      </p>
    </div>
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
  </section>
);

export { DemoSteps, DemoVideo };
