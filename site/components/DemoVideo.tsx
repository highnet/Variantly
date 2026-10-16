import { Typography } from '@/components/ui/Typography';
import { DEMO_VIDEO_ID } from '@/lib/site';

/*
 * The narrated live demo, straight after the showcase: people who just saw
 * the result watch it happen before reading the steps. A 16:9 frame holds
 * the space either way, so the page doesn't shift when the video lands.
 */
const DemoVideo = () => (
  <section aria-labelledby="demo-title" className="grid gap-6">
    <div className="grid max-w-[68ch] gap-3">
      <Typography variant="headline" as="h2" id="demo-title">
        Watch a run
      </Typography>
      <p className="text-steel m-0 text-[16px] leading-relaxed">
        A live demo, narrated: one command, the wizard, designs being made, then picking one to
        keep.
      </p>
    </div>
    <div className="border-ink bg-slate relative aspect-video w-full max-w-[1100px] overflow-hidden rounded-md border-2">
      {DEMO_VIDEO_ID ? (
        <iframe
          className="absolute inset-0 size-full"
          src={`https://www.youtube-nocookie.com/embed/${DEMO_VIDEO_ID}?rel=0`}
          title="variantly live demo"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
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
  </section>
);

export { DemoVideo };
