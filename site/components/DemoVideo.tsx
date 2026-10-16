'use client';

import { useState } from 'react';

import { Typography } from '@/components/ui/Typography';
import { Button, buttonVariants } from '@/components/ui/Button';
import { DEMO_BOOKING_URL, DEMO_VIDEO_ID } from '@/lib/site';

/*
 * The narrated live demo, straight after the showcase: people who just saw
 * the result watch it happen before reading the steps. A 16:9 frame holds
 * the space either way, so the page doesn't shift when the video lands.
 * Nothing loads from YouTube until the visitor clicks play (GDPR / TKG).
 */
const DemoVideo = () => {
  const [play, setPlay] = useState(false);
  return (
    <section aria-labelledby="demo-title" className="grid gap-6">
      <div className="grid max-w-[68ch] gap-3">
        <Typography variant="headline" as="h2" id="demo-title">
          Watch a run
        </Typography>
        <p className="text-steel m-0 text-[16px] leading-relaxed">
          A live demo, narrated: one command, the wizard, variants being made, then picking one to
          keep.
        </p>
      </div>
      <div className="border-ink bg-slate relative aspect-video w-full max-w-[1100px] overflow-hidden rounded-md border-2">
        {DEMO_VIDEO_ID && play ? (
          <iframe
            className="absolute inset-0 size-full"
            src={`https://www.youtube-nocookie.com/embed/${DEMO_VIDEO_ID}?rel=0&autoplay=1`}
            title="variantly live demo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : DEMO_VIDEO_ID ? (
          <div className="absolute inset-0 grid place-items-center content-center gap-4 p-6 text-center">
            <Button variant="primary" size="big" onClick={() => setPlay(true)}>
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
        ) : (
          <div className="absolute inset-0 grid place-items-center content-center gap-4 p-6 text-center">
            <span
              className="border-steel-on-slate grid size-16 place-items-center rounded-full border-2 sm:size-20"
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" className="fill-steel-on-slate ml-1 size-7 sm:size-9">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            <p className="m-0 grid gap-1">
              <span className="text-alert font-mono text-[13px] font-semibold tracking-wide uppercase">
                Coming soon
              </span>
              <span className="text-steel-on-slate text-sm">The demo video is being recorded.</span>
            </p>
          </div>
        )}
      </div>
      {DEMO_BOOKING_URL && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <a
            href={DEMO_BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: 'primary', size: 'big' })}
          >
            <svg
              viewBox="0 0 24 24"
              className="fill-none stroke-current stroke-2"
              aria-hidden="true"
            >
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            Book a live demo
          </a>
          <span className="text-steel text-[15px]">
            Thirty minutes, on your own site, with someone who builds variantly.
          </span>
        </div>
      )}
    </section>
  );
};

export { DemoVideo };
