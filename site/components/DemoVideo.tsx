'use client';

import { useState } from 'react';

import { CommandCopy } from '@/components/CommandCopy';
import { LiquidNumeral } from '@/components/LiquidNumeral';
import { Typography } from '@/components/ui/Typography';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Rich } from '@/components/ui/Rich';
import { DEMO_STEPS } from '@/lib/content';
import { DEMO_BOOKING_URL, DEMO_VIDEO_ID_DARK, DEMO_VIDEO_ID_LIGHT } from '@/lib/site';

const HAS_VIDEO = Boolean(DEMO_VIDEO_ID_LIGHT || DEMO_VIDEO_ID_DARK);

// The cut matching the theme the page is showing when play is pressed.
const videoForTheme = () =>
  document.documentElement.dataset.theme === 'dark'
    ? DEMO_VIDEO_ID_DARK || DEMO_VIDEO_ID_LIGHT
    : DEMO_VIDEO_ID_LIGHT || DEMO_VIDEO_ID_DARK;

/*
 * The narrated live demo, straight after the showcase: people who just saw
 * the result watch it happen before reading the steps. A 16:9 frame holds
 * the space either way, so the page doesn't shift when the video lands.
 * Nothing loads from YouTube until the visitor clicks play (GDPR / TKG),
 * and the light or dark cut is chosen to match the site's theme then.
 */
const DemoVideo = () => {
  const [videoId, setVideoId] = useState('');
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
          {videoId ? (
            <iframe
              className="absolute inset-0 size-full"
              src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&autoplay=1`}
              title="variantly live demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center content-center gap-4 p-6 text-center">
              <Button variant="primary" size="big" onClick={() => setVideoId(videoForTheme())}>
                <svg viewBox="0 0 24 24" className="fill-current" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Play the demo
              </Button>
              <p className="text-steel-on-slate m-0 max-w-[52ch] text-sm">
                Plays from YouTube (youtube-nocookie.com). Pressing play loads it and sends your IP
                address to Google. See the <a href="/privacy">privacy policy</a>.
              </p>
            </div>
          )}
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
