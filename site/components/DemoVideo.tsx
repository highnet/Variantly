'use client';

import type MuxPlayerElement from '@mux/mux-player';
import MuxPlayer from '@mux/mux-player-react/lazy';
import { Play } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { CommandCopy } from '@/components/CommandCopy';
import { LiquidNumeral } from '@/components/LiquidNumeral';
import { Typography } from '@/components/ui/Typography';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Rich } from '@/components/ui/Rich';
import { DEMO_STEPS } from '@/lib/content';
import { cn } from '@/lib/utils';
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

// Each film's running time, as the player shows it (the 90 s cut and the full
// film as uploaded). Update with a re-cut.
const LENGTHS: readonly (readonly [Length, string, string])[] = [
  ['short', 'Quick look', '1:28'],
  ['full', 'Whole run', '9:11'],
];

// The whole run's chapters, from demo/out/youtube-description-<theme>.txt
// (the same in both themes). Update with a re-cut.
const CHAPTERS: readonly (readonly [string, string])[] = [
  ['0:00', 'Intro'],
  ['0:09', 'Why'],
  ['1:02', 'What you need'],
  ['1:26', 'Will it work on yours?'],
  ['2:12', 'Setup'],
  ['2:54', 'What to make'],
  ['3:15', 'Your own directions'],
  ['4:00', 'Review and go'],
  ['4:29', 'The run'],
  ['5:34', 'Compare'],
  ['7:40', 'Keep'],
  ['8:38', 'Wrap'],
];
const seconds = (time: string) => time.split(':').reduce((sum, part) => sum * 60 + Number(part), 0);

const RATES = [1, 1.25, 1.5, 1.75, 2];

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
const cutFor = (length: Length, theme: 'light' | 'dark') =>
  length === 'short'
    ? pick(DEMO_VIDEO_SHORT_LIGHT, DEMO_VIDEO_SHORT_DARK, theme)
    : pick(DEMO_VIDEO_LIGHT, DEMO_VIDEO_DARK, theme);

// Points the player at a film: the Mux stream when the cut has one, else the
// MP4 on Blob. `at` is where to start, in seconds.
const load = (el: MuxPlayerElement, cut: DemoVideoCut, at: number) => {
  el.startTime = at;
  if (cut.playbackId) el.playbackId = cut.playbackId;
  else el.src = cut.mp4;
};

// Plays, once more if the call lands before the player has applied a new
// source (the load aborts it). The first call, made in a click, is what lets
// the browser play with sound.
const play = (el: MuxPlayerElement) =>
  void el.play().catch((error: unknown) => {
    if (error instanceof DOMException && error.name === 'AbortError')
      void el.play().catch(() => {});
  });

/*
 * The narrated live demo, straight after the showcase: people who just saw
 * the result watch it happen. The 90-second cut plays first, with a switch to
 * the whole run, both on the poster and above the player. A 16:9 frame holds
 * the space either way, so the page doesn't shift when the video lands.
 *
 * Films stream from Mux (adaptive HLS: a slow connection gets a lower
 * resolution instead of a stall), or play the MP4 on Vercel Blob for a cut
 * not yet copied to Mux. The player's script loads once the section nears
 * the viewport, and nothing of the film loads until play is pressed. The
 * light or dark film follows the site theme, and switching theme mid-play
 * carries on from the same moment; switching length starts the other film
 * from the top. Captions are burned in.
 */
const DemoVideo = () => {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, serverTheme);
  const [length, setLength] = useState<Length>(HAS_SHORT ? 'short' : 'full');
  const [started, setStarted] = useState(false);
  const [player, setPlayer] = useState<MuxPlayerElement | null>(null);
  // The lazy player can mount before <mux-player> is defined, when it has no
  // play() yet and a property set on it would be lost; hold it until then.
  const attach = useCallback((el: MuxPlayerElement | null) => {
    if (!el) return setPlayer(null);
    void customElements.whenDefined('mux-player').then(() => setPlayer(el));
  }, []);
  const cut = cutFor(length, theme);
  const source = cut ? (cut.playbackId ?? cut.mp4) : null;
  // What the player holds: which length, from which source.
  const shown = useRef<{ length: Length; source: string } | null>(null);

  // The source is set here rather than as a prop so a theme switch can keep
  // the place: a new source resets the player, so note the time and state
  // first. A length switch is a different film, so it starts from the top.
  useEffect(() => {
    if (!player || !cut || !source || shown.current?.source === source) return;
    const same = shown.current?.length === length;
    const at = same ? player.currentTime : 0;
    const playing = same && !player.paused && !player.ended;
    shown.current = { length, source };
    load(player, cut, at);
    if (playing) play(player);
  }, [player, cut, source, length]);

  // Pressed on the poster: load the chosen film and play it inside the click,
  // so browsers count it as the visitor's own play.
  const start = (value: Length) => {
    const chosen = cutFor(value, theme);
    if (!player || !chosen) return;
    const chosenSource = chosen.playbackId ?? chosen.mp4;
    if (shown.current?.source !== chosenSource) {
      shown.current = { length: value, source: chosenSource };
      load(player, chosen, 0);
    }
    setLength(value);
    setStarted(true);
    play(player);
  };

  // The whole run gets its chapters on the timeline each time it loads.
  const addChapters = () => {
    if (!player || shown.current?.length !== 'full') return;
    const starts = CHAPTERS.map(([time]) => seconds(time));
    void player.addChapters(
      CHAPTERS.map(([, value], i) => ({
        startTime: starts[i],
        endTime: starts[i + 1] ?? player.duration,
        value,
      })),
    );
  };

  if (!HAS_FULL && !HAS_SHORT) return null;

  const choices = LENGTHS.filter(([value]) => (value === 'short' ? HAS_SHORT : HAS_FULL));

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
        {choices.length > 1 && (
          <div role="group" aria-labelledby="demo-length" className="grid w-full gap-2 sm:w-auto">
            <Typography variant="label" id="demo-length" className="text-steel">
              Length
            </Typography>
            <div className="border-ink rounded-control grid grid-cols-2 overflow-hidden border">
              {choices.map(([value, label, time]) => (
                <Button
                  key={value}
                  variant="segment-ink"
                  size="segment-ink"
                  aria-pressed={length === value}
                  onClick={() => setLength(value)}
                >
                  {label}
                  <span className="text-steel group-aria-pressed:text-surface/70 tabular-nums">
                    {time}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="border-ink bg-slate relative aspect-video w-full max-w-[1100px] overflow-hidden rounded-md border-2">
        {/* Captions are burned into the film, so there is no caption track. */}
        <MuxPlayer
          ref={attach}
          loading="viewport"
          className={cn(
            'vy-demo-player absolute inset-0 size-full',
            !started && 'vy-demo-player-idle',
          )}
          poster={cut?.poster ?? undefined}
          // The lazy player shows only its placeholder until its script loads.
          placeholder={cut?.poster ?? undefined}
          preload="none"
          playsInline
          playbackRates={RATES}
          streamType="on-demand"
          disableCookies
          disableTracking={!cut?.playbackId}
          title={length === 'short' ? 'variantly in 90 seconds' : 'variantly: the whole run'}
          metadataVideoTitle={`variantly demo, ${length === 'short' ? 'quick look' : 'whole run'} (${theme})`}
          onPlay={() => setStarted(true)}
          onLoadedMetadata={addChapters}
        />
        {!started && (
          <div className="from-ink/70 absolute inset-0 grid place-content-center justify-items-center gap-4 bg-linear-to-t to-transparent p-4">
            {choices.map(([value, label, time], i) => (
              <Button
                key={value}
                variant={i === 0 ? 'primary' : 'ink'}
                size={i === 0 ? 'big' : 'default'}
                disabled={!player}
                onClick={() => start(value)}
                aria-label={`Play ${label.toLowerCase()}, ${time}`}
              >
                <Play aria-hidden="true" />
                {label}
                <span className="tabular-nums opacity-70">{time}</span>
              </Button>
            ))}
          </div>
        )}
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
